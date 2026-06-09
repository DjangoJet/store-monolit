import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/server/session";
import { readCartCookie, writeCartCookie } from "./cookie";

const linesInclude = {
  lines: {
    orderBy: { id: "asc" as const },
    include: {
      variant: {
        include: {
          inventory: true,
          product: {
            include: { images: { orderBy: { position: "asc" as const }, take: 1 } },
          },
        },
      },
    },
  },
} as const;

export interface CartLineView {
  id: string;
  variantId: string;
  quantity: number;
  productTitle: string;
  variantTitle: string;
  slug: string;
  imageUrl: string | null;
  unitAmount: number;
  lineTotal: number;
  available: number;
}

export interface CartView {
  id: string;
  currency: string;
  lines: CartLineView[];
  itemCount: number;
  subtotal: number;
  discountCode: string | null;
  discountAmount: number;
  freeShipping: boolean;
  total: number; // subtotal - discountAmount (bez wysyłki)
}

type CartWithLines = Prisma.CartGetPayload<{ include: typeof linesInclude }>;

function toCartView(cart: CartWithLines): CartView {
  const lines: CartLineView[] = cart.lines.map((l) => ({
    id: l.id,
    variantId: l.variantId,
    quantity: l.quantity,
    productTitle: l.variant.product.title,
    variantTitle: l.variant.title,
    slug: l.variant.product.slug,
    imageUrl: l.variant.product.images[0]?.url ?? null,
    unitAmount: l.variant.priceAmount,
    lineTotal: l.variant.priceAmount * l.quantity,
    available:
      (l.variant.inventory?.quantity ?? 0) - (l.variant.inventory?.reserved ?? 0),
  }));

  const subtotal = lines.reduce((n, l) => n + l.lineTotal, 0);
  return {
    id: cart.id,
    currency: cart.currency,
    lines,
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal,
    discountCode: cart.discountCode ?? null,
    discountAmount: 0,
    freeShipping: false,
    total: subtotal,
  };
}

/** Odczyt koszyka (RSC/header) — bez mutacji. */
export async function getCurrentCart(): Promise<CartView | null> {
  const user = await getCurrentUser();
  let cart: CartWithLines | null = null;

  if (user) {
    cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: linesInclude,
    });
  } else {
    const id = await readCartCookie();
    if (id) {
      cart = await prisma.cart.findUnique({ where: { id }, include: linesInclude });
    }
  }

  if (!cart) return null;

  const view = toCartView(cart);
  if (view.discountCode) {
    const { evaluateDiscount } = await import("@/modules/discounts/service");
    const evalResult = await evaluateDiscount(
      view.discountCode,
      view.subtotal,
      user?.id,
    );
    if (evalResult.ok) {
      view.discountAmount = evalResult.amount;
      view.freeShipping = evalResult.freeShipping;
      view.total = view.subtotal - evalResult.amount;
    }
  }
  return view;
}

/** Zwraca id koszyka, tworząc go (i cookie dla gościa) jeśli trzeba. Tylko w server actions. */
export async function getOrCreateCartId(): Promise<string> {
  const user = await getCurrentUser();

  if (user) {
    const existing = await prisma.cart.findUnique({ where: { userId: user.id } });
    if (existing) return existing.id;
    const created = await prisma.cart.create({ data: { userId: user.id } });
    return created.id;
  }

  const cookieId = await readCartCookie();
  if (cookieId) {
    const existing = await prisma.cart.findUnique({ where: { id: cookieId } });
    if (existing) return existing.id;
  }
  const created = await prisma.cart.create({ data: {} });
  await writeCartCookie(created.id);
  return created.id;
}

export async function addItem(variantId: string, quantity = 1) {
  const cartId = await getOrCreateCartId();
  await prisma.cartLine.upsert({
    where: { cartId_variantId: { cartId, variantId } },
    create: { cartId, variantId, quantity },
    update: { quantity: { increment: quantity } },
  });
}

export async function setItemQuantity(variantId: string, quantity: number) {
  const cartId = await getOrCreateCartId();
  if (quantity <= 0) {
    await prisma.cartLine.deleteMany({ where: { cartId, variantId } });
    return;
  }
  await prisma.cartLine.updateMany({
    where: { cartId, variantId },
    data: { quantity },
  });
}

export async function removeItem(variantId: string) {
  const cartId = await getOrCreateCartId();
  await prisma.cartLine.deleteMany({ where: { cartId, variantId } });
}

export async function clearCart(cartId: string) {
  await prisma.cartLine.deleteMany({ where: { cartId } });
}
