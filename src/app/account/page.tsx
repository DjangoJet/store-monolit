import Link from "next/link";
import { requireUser } from "@/server/session";
import { logoutAction } from "@/modules/auth/actions";
import { Button } from "@/components/ui/button";

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Moje konto</h1>
        <form action={logoutAction}>
          <Button variant="outline" size="sm" type="submit">
            Wyloguj
          </Button>
        </form>
      </div>

      <div className="mt-6 space-y-2 rounded-lg border p-4 text-sm">
        <p>
          <span className="text-muted-foreground">Email:</span> {user.email}
        </p>
        <p>
          <span className="text-muted-foreground">Rola:</span> {user.role}
        </p>
      </div>

      <div className="mt-4 flex gap-4 text-sm">
        <Link href="/account/orders" className="font-medium underline">
          Moje zamówienia →
        </Link>
        <Link href="/account/wishlist" className="font-medium underline">
          Lista życzeń →
        </Link>
      </div>

      {(user.role === "ADMIN" || user.role === "STAFF") && (
        <p className="mt-4 text-sm">
          <Link href="/admin" className="font-medium underline">
            Przejdź do panelu administracyjnego →
          </Link>
        </p>
      )}
    </main>
  );
}
