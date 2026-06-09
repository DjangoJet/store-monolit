import Link from "next/link";
import { ResetForm } from "./reset-form";

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nowe hasło</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ustaw nowe hasło do swojego konta.
        </p>
      </div>

      {token ? (
        <ResetForm token={token} />
      ) : (
        <p className="text-sm text-destructive">
          Brak tokenu resetu.{" "}
          <Link href="/auth/forgot" className="underline">
            Wyślij link ponownie
          </Link>
        </p>
      )}
    </div>
  );
}
