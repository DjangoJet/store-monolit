import { formatMoney } from "@/lib/config";

interface Party {
  name?: string;
  address?: string;
  taxId?: string;
  vatExempt?: boolean;
  exemptionNote?: string;
  bankAccount?: string;
  email?: string;
}

export interface InvoiceViewData {
  number: string;
  type: "VAT" | "NO_VAT";
  status: "ISSUED" | "CANCELLED";
  issueDate: Date;
  saleDate: Date;
  dueDate: Date | null;
  currency: string;
  seller: Party;
  buyer: Party;
  buyerNip: string | null;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  paymentMethod: string | null;
  lines: {
    id: string;
    name: string;
    quantity: number;
    unitNet: number;
    unitGross: number;
    vatRate: number;
    net: number;
    vat: number;
    gross: number;
  }[];
}

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("pl-PL");
}

export function InvoiceView({ invoice }: { invoice: InvoiceViewData }) {
  const isVat = invoice.type === "VAT";
  const c = invoice.currency;

  const byRate = isVat
    ? Object.values(
        invoice.lines.reduce<Record<string, { rate: number; net: number; vat: number; gross: number }>>(
          (acc, l) => {
            const k = String(l.vatRate);
            acc[k] ??= { rate: l.vatRate, net: 0, vat: 0, gross: 0 };
            acc[k].net += l.net;
            acc[k].vat += l.vat;
            acc[k].gross += l.gross;
            return acc;
          },
          {},
        ),
      ).sort((a, b) => b.rate - a.rate)
    : [];

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-sm text-black print:p-0">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isVat ? "Faktura VAT" : "Faktura"} {invoice.number}
          </h1>
          {invoice.status === "CANCELLED" && (
            <p className="mt-1 font-semibold text-red-600">ANULOWANA</p>
          )}
        </div>
        <div className="text-right text-xs">
          <p>Data wystawienia: {fmtDate(invoice.issueDate)}</p>
          <p>Data sprzedaży: {fmtDate(invoice.saleDate)}</p>
          {invoice.dueDate && <p>Termin płatności: {fmtDate(invoice.dueDate)}</p>}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <p className="mb-1 font-semibold uppercase text-gray-500">Sprzedawca</p>
          <p className="font-medium">{invoice.seller.name}</p>
          {invoice.seller.address && <p>{invoice.seller.address}</p>}
          {invoice.seller.taxId && <p>NIP: {invoice.seller.taxId}</p>}
          {invoice.seller.bankAccount && <p>Konto: {invoice.seller.bankAccount}</p>}
        </div>
        <div>
          <p className="mb-1 font-semibold uppercase text-gray-500">Nabywca</p>
          <p className="font-medium">{invoice.buyer.name}</p>
          {invoice.buyer.address && <p>{invoice.buyer.address}</p>}
          {invoice.buyerNip && <p>NIP: {invoice.buyerNip}</p>}
          {invoice.buyer.email && <p>{invoice.buyer.email}</p>}
        </div>
      </div>

      <table className="mt-6 w-full border-collapse text-xs">
        <thead>
          <tr className="border-y border-gray-300 text-left">
            <th className="py-1 pr-2">Lp</th>
            <th className="py-1 pr-2">Nazwa</th>
            <th className="py-1 pr-2 text-right">Ilość</th>
            {isVat ? (
              <>
                <th className="py-1 pr-2 text-right">Cena netto</th>
                <th className="py-1 pr-2 text-right">VAT</th>
                <th className="py-1 pr-2 text-right">Netto</th>
                <th className="py-1 text-right">Brutto</th>
              </>
            ) : (
              <>
                <th className="py-1 pr-2 text-right">Cena</th>
                <th className="py-1 text-right">Wartość</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((l, i) => (
            <tr key={l.id} className="border-b border-gray-200">
              <td className="py-1 pr-2">{i + 1}</td>
              <td className="py-1 pr-2">{l.name}</td>
              <td className="py-1 pr-2 text-right">{l.quantity}</td>
              {isVat ? (
                <>
                  <td className="py-1 pr-2 text-right">{formatMoney(l.unitNet, c)}</td>
                  <td className="py-1 pr-2 text-right">{l.vatRate}%</td>
                  <td className="py-1 pr-2 text-right">{formatMoney(l.net, c)}</td>
                  <td className="py-1 text-right">{formatMoney(l.gross, c)}</td>
                </>
              ) : (
                <>
                  <td className="py-1 pr-2 text-right">{formatMoney(l.unitGross, c)}</td>
                  <td className="py-1 text-right">{formatMoney(l.gross, c)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {isVat && byRate.length > 1 && (
        <table className="mt-4 ml-auto w-72 border-collapse text-xs">
          <thead>
            <tr className="border-y border-gray-300 text-right">
              <th className="py-1 text-left">Stawka</th>
              <th className="py-1">Netto</th>
              <th className="py-1">VAT</th>
              <th className="py-1">Brutto</th>
            </tr>
          </thead>
          <tbody>
            {byRate.map((r) => (
              <tr key={r.rate} className="text-right">
                <td className="py-0.5 text-left">{r.rate}%</td>
                <td>{formatMoney(r.net, c)}</td>
                <td>{formatMoney(r.vat, c)}</td>
                <td>{formatMoney(r.gross, c)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-4 flex justify-end">
        <div className="w-64 space-y-1">
          {isVat && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-500">Razem netto</span>
                <span>{formatMoney(invoice.netAmount, c)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">VAT</span>
                <span>{formatMoney(invoice.vatAmount, c)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between border-t border-gray-300 pt-1 text-base font-bold">
            <span>Do zapłaty</span>
            <span>{formatMoney(invoice.grossAmount, c)}</span>
          </div>
        </div>
      </div>

      {!isVat && (
        <p className="mt-4 text-xs text-gray-600">
          Sprzedawca zwolniony z VAT
          {invoice.seller.exemptionNote ? ` — ${invoice.seller.exemptionNote}` : ""}.
        </p>
      )}
      {invoice.paymentMethod && (
        <p className="mt-2 text-xs text-gray-600">Płatność: {invoice.paymentMethod}</p>
      )}
    </div>
  );
}
