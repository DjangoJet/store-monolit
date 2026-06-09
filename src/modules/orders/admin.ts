import { prisma } from "@/lib/prisma";
import { release } from "@/modules/inventory/service";
import { sendOrderCancellation } from "@/modules/notifications/service";
import type { OrderStatus, PaymentStatus } from "@/generated/prisma/enums";

export interface ListOrdersParams {
  q?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  page?: number;
  perPage?: number;
}

export async function listOrders(params: ListOrdersParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const perPage = params.perPage ?? 20;

  const where = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.paymentStatus ? { paymentStatus: params.paymentStatus } : {}),
    ...(params.q
      ? {
          OR: [
            { number: { contains: params.q, mode: "insensitive" as const } },
            { email: { contains: params.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { _count: { select: { lines: true } } },
    }),
    prisma.order.count({ where }),
  ]);

  return { items, total, page, perPage, pages: Math.ceil(total / perPage) };
}

export async function getOrderDetail(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      lines: true,
      payments: { include: { refunds: true }, orderBy: { createdAt: "asc" } },
      shipments: { orderBy: { createdAt: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
      user: { select: { id: true, email: true, name: true } },
    },
  });
}

export async function changeOrderStatus(
  id: string,
  status: OrderStatus,
  actorId?: string,
) {
  await prisma.order.update({
    where: { id },
    data: {
      status,
      events: {
        create: { type: "status_change", message: `Status: ${status}`, actorId },
      },
    },
  });
}

export async function addOrderNote(id: string, message: string, actorId?: string) {
  await prisma.orderEvent.create({
    data: { orderId: id, type: "note", message, actorId },
  });
}

/** Anuluje zamówienie. Jeśli nie było opłacone — zwalnia rezerwację magazynu. */
export async function cancelOrder(id: string, actorId?: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!order) return;

  if (order.paymentStatus !== "PAID") {
    await release(
      order.lines
        .filter((l): l is typeof l & { variantId: string } => Boolean(l.variantId))
        .map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
    );
  }

  await prisma.order.update({
    where: { id },
    data: {
      status: "CANCELLED",
      events: { create: { type: "cancelled", message: "Zamówienie anulowane", actorId } },
    },
  });

  await sendOrderCancellation(id);
}
