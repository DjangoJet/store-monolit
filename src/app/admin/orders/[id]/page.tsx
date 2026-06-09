import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderDetail } from "@/modules/orders/admin";
import { getInvoiceByOrder } from "@/modules/invoices/service";
import { issueInvoiceAction } from "@/modules/invoices/actions";
import { availableCarriers, getDefaultCarrierId } from "@/modules/shipping/registry";
import { features } from "@/lib/config";
import {
  addOrderNoteAction,
  cancelOrderAction,
  createShipmentAction,
  markOrderPaidAction,
  refundOrderAction,
  resendConfirmationAction,
  updateOrderStatusAction,
} from "@/modules/orders/actions";
import { formatMoney } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Addr {
  firstName?: string;
  lastName?: string;
  line1?: string;
  line2?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderDetail(id);
  if (!order) notFound();

  const addr = (order.shippingAddress as Addr | null) ?? null;
  const carriers = availableCarriers();
  const defaultCarrier = getDefaultCarrierId();
  const paidPayment = order.payments.find((p) => p.status === "PAID");
  const invoice = features.invoices ? await getInvoiceByOrder(order.id) : null;

  return (
    <div className="max-w-5xl">
      <Link href="/admin/orders" className="text-sm text-muted-foreground hover:underline">
        ← Zamówienia
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Zamówienie {order.number}
        </h1>
        <div className="flex gap-2">
          <Badge>{order.status}</Badge>
          <Badge variant={order.paymentStatus === "PAID" ? "success" : "muted"}>
            {order.paymentStatus}
          </Badge>
          <Badge variant="outline">{order.fulfillmentStatus}</Badge>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {order.createdAt.toLocaleString("pl-PL")} · {order.email}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        {/* LEWA: treść */}
        <div className="space-y-8">
          {/* Pozycje */}
          <section>
            <h2 className="mb-3 text-lg font-medium">Pozycje</h2>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <tbody>
                  {order.lines.map((l) => (
                    <tr key={l.id} className="border-t first:border-t-0">
                      <td className="px-4 py-2">
                        {l.productTitle}
                        <span className="text-muted-foreground"> · {l.variantTitle}</span>
                        {l.sku && <span className="text-muted-foreground"> · {l.sku}</span>}
                      </td>
                      <td className="px-4 py-2 text-right text-muted-foreground">
                        {l.quantity} × {formatMoney(l.unitAmount, order.currency)}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        {formatMoney(l.totalAmount, order.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 ml-auto w-64 space-y-1 text-sm">
              <Row label="Produkty" value={formatMoney(order.subtotalAmount, order.currency)} />
              {order.discountAmount > 0 && (
                <Row label="Rabat" value={`-${formatMoney(order.discountAmount, order.currency)}`} />
              )}
              <Row label="Dostawa" value={formatMoney(order.shippingAmount, order.currency)} />
              <div className="flex justify-between border-t pt-1 font-semibold">
                <span>Razem</span>
                <span>{formatMoney(order.totalAmount, order.currency)}</span>
              </div>
              {order.taxAmount > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>w tym VAT</span>
                  <span>{formatMoney(order.taxAmount, order.currency)}</span>
                </div>
              )}
            </div>
          </section>

          {/* Adres */}
          <section>
            <h2 className="mb-3 text-lg font-medium">Dostawa</h2>
            <div className="rounded-lg border p-4 text-sm">
              {addr ? (
                <p>
                  {addr.firstName} {addr.lastName}
                  <br />
                  {addr.line1}
                  {addr.line2 ? `, ${addr.line2}` : ""}
                  <br />
                  {addr.postalCode} {addr.city}, {addr.country}
                  {addr.phone ? (
                    <>
                      <br />
                      tel. {addr.phone}
                    </>
                  ) : null}
                </p>
              ) : (
                <p className="text-muted-foreground">Brak adresu.</p>
              )}
              {order.shippingMethod && (
                <p className="mt-2 text-muted-foreground">Metoda: {order.shippingMethod}</p>
              )}
            </div>
          </section>

          {/* Przesyłki */}
          <section>
            <h2 className="mb-3 text-lg font-medium">Przesyłki</h2>
            {order.shipments.length > 0 && (
              <ul className="mb-3 space-y-2 text-sm">
                {order.shipments.map((s) => (
                  <li key={s.id} className="rounded-lg border p-3">
                    <span className="font-medium">{s.carrier ?? s.provider}</span>
                    {s.trackingNumber && <span> · {s.trackingNumber}</span>}
                    {s.costAmount != null && (
                      <span className="text-muted-foreground">
                        {" "}
                        · koszt {formatMoney(s.costAmount, s.costCurrency ?? order.currency)}
                      </span>
                    )}
                    <Badge variant="outline" className="ml-2">{s.status}</Badge>
                    {s.trackingUrl && (
                      <a href={s.trackingUrl} className="ml-2 underline" target="_blank">
                        śledź
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <form action={createShipmentAction} className="space-y-2 rounded-lg border border-dashed p-3">
              <input type="hidden" name="orderId" value={order.id} />
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Przewoźnik (provider)</Label>
                  <Select name="provider" defaultValue={defaultCarrier}>
                    {carriers.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nazwa kuriera (manual)</Label>
                  <Input name="carrier" placeholder="np. InPost" />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">service_id (Furgonetka)</Label>
                  <Input name="serviceCode" placeholder="np. 11553829 (dla providera furgonetka)" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Numer śledzenia</Label>
                  <Input name="trackingNumber" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Koszt (PLN)</Label>
                  <Input name="cost" placeholder="0.00" />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">URL śledzenia</Label>
                  <Input name="trackingUrl" />
                </div>
              </div>
              <Button type="submit" size="sm">Utwórz przesyłkę</Button>
            </form>
          </section>

          {/* Timeline */}
          <section>
            <h2 className="mb-3 text-lg font-medium">Historia</h2>
            <ul className="space-y-2 text-sm">
              {order.events.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="text-muted-foreground">
                    {e.createdAt.toLocaleString("pl-PL")}
                  </span>
                  <span>
                    <span className="font-medium">{e.type}</span>
                    {e.message ? ` — ${e.message}` : ""}
                  </span>
                </li>
              ))}
            </ul>
            <form action={addOrderNoteAction} className="mt-3 flex gap-2">
              <input type="hidden" name="id" value={order.id} />
              <Textarea name="message" rows={1} placeholder="Dodaj notatkę..." className="min-h-10" />
              <Button type="submit" size="sm" variant="outline">Dodaj</Button>
            </form>
          </section>
        </div>

        {/* PRAWA: akcje */}
        <aside className="space-y-4">
          <div className="space-y-3 rounded-lg border p-4">
            <h2 className="text-sm font-medium">Status</h2>
            <form action={updateOrderStatusAction} className="flex gap-2">
              <input type="hidden" name="id" value={order.id} />
              <Select name="status" defaultValue={order.status}>
                <option value="PENDING">PENDING</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </Select>
              <Button type="submit" size="sm" variant="outline">Zmień</Button>
            </form>

            {order.paymentStatus !== "PAID" && order.status !== "CANCELLED" && (
              <form action={markOrderPaidAction}>
                <input type="hidden" name="id" value={order.id} />
                <Button type="submit" size="sm" className="w-full">
                  Oznacz jako opłacone
                </Button>
              </form>
            )}

            <form action={resendConfirmationAction}>
              <input type="hidden" name="id" value={order.id} />
              <Button type="submit" size="sm" variant="outline" className="w-full">
                Wyślij potwierdzenie e-mail
              </Button>
            </form>

            {order.status !== "CANCELLED" && (
              <form action={cancelOrderAction}>
                <input type="hidden" name="id" value={order.id} />
                <Button type="submit" size="sm" variant="destructive" className="w-full">
                  Anuluj zamówienie
                </Button>
              </form>
            )}
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <h2 className="text-sm font-medium">Płatności</h2>
            {order.payments.length === 0 && (
              <p className="text-sm text-muted-foreground">Brak płatności.</p>
            )}
            {order.payments.map((p) => (
              <div key={p.id} className="text-sm">
                <div className="flex justify-between">
                  <span>{p.provider}</span>
                  <span>{formatMoney(p.amount, p.currency)}</span>
                </div>
                <div className="text-xs text-muted-foreground">{p.status}</div>
                {p.refunds.map((r) => (
                  <div key={r.id} className="text-xs text-muted-foreground">
                    zwrot {formatMoney(r.amount, p.currency)}
                  </div>
                ))}
              </div>
            ))}
            {paidPayment && (
              <form action={refundOrderAction} className="flex gap-2">
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="paymentId" value={paidPayment.id} />
                <Input name="amount" placeholder="kwota (pełna gdy puste)" className="text-xs" />
                <Button type="submit" size="sm" variant="outline">Zwróć</Button>
              </form>
            )}
          </div>

          {features.invoices && (
            <div className="space-y-3 rounded-lg border p-4">
              <h2 className="text-sm font-medium">Faktura</h2>
              {invoice ? (
                <div className="text-sm">
                  <Link href={`/admin/invoices/${invoice.id}`} className="font-medium underline">
                    {invoice.number}
                  </Link>
                  <span className="ml-2 text-xs text-muted-foreground">{invoice.status}</span>
                </div>
              ) : (
                <form action={issueInvoiceAction} className="space-y-2">
                  <input type="hidden" name="orderId" value={order.id} />
                  <Input name="buyerName" placeholder="Nabywca (opcjonalnie)" className="text-xs" />
                  <Input name="buyerNip" placeholder="NIP nabywcy (opcjonalnie)" className="text-xs" />
                  <Button type="submit" size="sm" className="w-full">
                    Wystaw fakturę
                  </Button>
                </form>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
