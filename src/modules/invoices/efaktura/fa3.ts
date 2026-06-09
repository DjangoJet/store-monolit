import type { EInvoiceData } from "./types";

// Builder XML struktury logicznej FA(3) (KSeF 2.0).
// Schema: src/modules/invoices/efaktura/schema/XSD/schemat.xsd
// namespace: http://crd.gov.pl/wzor/2025/06/25/13775/  (KodFormularza "FA (3)", wersjaSchemy "1-0E")
//
// ZAKRES: standardowa faktura VAT ze stawkami 23/8/5%. Przypadki niewspierane
// (0% krajowe, zwolnienie/zw, marża, korekty, waluty obce) rzucają jawny błąd —
// świadomie, by nie emitować błędnych danych podatkowych. To kolejny etap.

const NS = "http://crd.gov.pl/wzor/2025/06/25/13775/";

// Stawka VAT (%) -> koszyk P_13_x/P_14_x. Tylko stawki, które realnie wystawia sklep.
const RATE_BUCKET: Record<number, number> = { 23: 1, 8: 2, 5: 3 };

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** grosze -> kwota w jednostkach głównych z 2 miejscami (TKwotowy). */
function money(grosze: number): string {
  return (grosze / 100).toFixed(2);
}

/** Data w formacie YYYY-MM-DD (UTC). */
function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Znacznik czasu wytworzenia (ISO 8601 z Z, bez milisekund). */
function dateTimeZ(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

interface Fa3Options {
  /** Nazwa systemu wystawiającego (Naglowek/SystemInfo). */
  systemInfo?: string;
  /** Miejsce wystawienia (Fa/P_1M) — opcjonalne. */
  issuePlace?: string;
  /** Data wytworzenia dokumentu — domyślnie teraz. */
  generatedAt?: Date;
}

export function buildFa3Xml(data: EInvoiceData, opts: Fa3Options = {}): string {
  if (!data.seller.taxId) {
    throw new Error("FA(3): brak NIP sprzedawcy (Podmiot1 wymaga NIP).");
  }

  const exempt = data.vatExempt === true;
  if (exempt && !data.exemptionLegalBasis) {
    throw new Error("FA(3): faktura zwolniona wymaga podstawy zwolnienia (exemptionLegalBasis).");
  }

  // --- Podsumowanie sprzedaży per stawka ---
  const sumLines: string[] = [];
  if (exempt) {
    // Cała sprzedaż zwolniona → suma netto do P_13_7 (bez VAT).
    const net = data.lines.reduce((s, l) => s + l.net, 0);
    sumLines.push(`\t\t\t<P_13_7>${money(net)}</P_13_7>`);
  } else {
    const buckets = new Map<number, { net: number; vat: number }>();
    for (const l of data.lines) {
      const bucket = RATE_BUCKET[l.vatRate];
      if (bucket === undefined) {
        throw new Error(
          `FA(3): nieobsługiwana stawka VAT ${l.vatRate}% (wspierane: 23/8/5 lub faktura zwolniona). ` +
            "Stawki 0% (KR/WDT/EX) i korekty (KOR) — wymagają decyzji/rozszerzenia.",
        );
      }
      const cur = buckets.get(bucket) ?? { net: 0, vat: 0 };
      cur.net += l.net;
      cur.vat += l.vat;
      buckets.set(bucket, cur);
    }
    for (const b of [1, 2, 3]) {
      const v = buckets.get(b);
      if (v) {
        sumLines.push(`\t\t\t<P_13_${b}>${money(v.net)}</P_13_${b}>`);
        sumLines.push(`\t\t\t<P_14_${b}>${money(v.vat)}</P_14_${b}>`);
      }
    }
  }

  // Blok zwolnienia w Adnotacjach: podstawa prawna (zw) albo znacznik „nie dotyczy".
  const zwolnienieXml = exempt
    ? `\t\t\t\t<P_19>1</P_19>\n\t\t\t\t<P_19A>${esc(data.exemptionLegalBasis!)}</P_19A>`
    : `\t\t\t\t<P_19N>1</P_19N>`;

  // --- Podmiot2 (nabywca): NIP albo BrakID dla konsumenta ---
  const buyerName = data.buyer.name ? `\n\t\t\t<Nazwa>${esc(data.buyer.name)}</Nazwa>` : "";
  const buyerId = data.buyer.nip
    ? `<NIP>${esc(data.buyer.nip)}</NIP>${buyerName}`
    : `<BrakID>1</BrakID>${buyerName}`;

  const systemInfo = esc(opts.systemInfo ?? "store-monolit");
  const generatedAt = dateTimeZ(opts.generatedAt ?? new Date());
  const issuePlace = opts.issuePlace ? `\n\t\t<P_1M>${esc(opts.issuePlace)}</P_1M>` : "";

  const faWiersze = data.lines
    .map((l, i) =>
      [
        "\t\t<FaWiersz>",
        `\t\t\t<NrWierszaFa>${i + 1}</NrWierszaFa>`,
        `\t\t\t<P_7>${esc(l.name)}</P_7>`,
        `\t\t\t<P_8A>szt.</P_8A>`,
        `\t\t\t<P_8B>${l.quantity}</P_8B>`,
        `\t\t\t<P_9A>${money(l.unitNet)}</P_9A>`,
        `\t\t\t<P_11>${money(l.net)}</P_11>`,
        `\t\t\t<P_12>${exempt ? "zw" : l.vatRate}</P_12>`,
        "\t\t</FaWiersz>",
      ].join("\n"),
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Faktura xmlns="${NS}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<Naglowek>
		<KodFormularza kodSystemowy="FA (3)" wersjaSchemy="1-0E">FA</KodFormularza>
		<WariantFormularza>3</WariantFormularza>
		<DataWytworzeniaFa>${generatedAt}</DataWytworzeniaFa>
		<SystemInfo>${systemInfo}</SystemInfo>
	</Naglowek>
	<Podmiot1>
		<DaneIdentyfikacyjne>
			<NIP>${esc(data.seller.taxId)}</NIP>
			<Nazwa>${esc(data.seller.name)}</Nazwa>
		</DaneIdentyfikacyjne>
		<Adres>
			<KodKraju>PL</KodKraju>
			<AdresL1>${esc(data.seller.address)}</AdresL1>
		</Adres>
	</Podmiot1>
	<Podmiot2>
		<DaneIdentyfikacyjne>
			${buyerId}
		</DaneIdentyfikacyjne>
		<Adres>
			<KodKraju>PL</KodKraju>
			<AdresL1>${esc(data.buyer.address)}</AdresL1>
		</Adres>
		<JST>2</JST>
		<GV>2</GV>
	</Podmiot2>
	<Fa>
		<KodWaluty>${esc(data.currency)}</KodWaluty>
		<P_1>${dateOnly(data.issueDate)}</P_1>${issuePlace}
		<P_2>${esc(data.number)}</P_2>
		<P_6>${dateOnly(data.saleDate)}</P_6>
${sumLines.join("\n")}
		<P_15>${money(data.grossAmount)}</P_15>
		<Adnotacje>
			<P_16>2</P_16>
			<P_17>2</P_17>
			<P_18>2</P_18>
			<P_18A>2</P_18A>
			<Zwolnienie>
${zwolnienieXml}
			</Zwolnienie>
			<NoweSrodkiTransportu>
				<P_22N>1</P_22N>
			</NoweSrodkiTransportu>
			<P_23>2</P_23>
			<PMarzy>
				<P_PMarzyN>1</P_PMarzyN>
			</PMarzy>
		</Adnotacje>
		<RodzajFaktury>VAT</RodzajFaktury>
${faWiersze}
	</Fa>
</Faktura>`;
}
