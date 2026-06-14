import Link from "next/link";
import { verifyEmailToken } from "@/modules/auth/service";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const verified = token ? await verifyEmailToken(token) : false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Weryfikacja adresu e-mail
        </h1>
        {verified ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Adres e-mail został potwierdzony. Zamówienia złożone wcześniej jako
            gość na ten adres są już widoczne w Twoim koncie.
          </p>
        ) : (
          <p className="mt-1 text-sm text-destructive">
            Link weryfikacyjny jest nieprawidłowy lub wygasł.
          </p>
        )}
      </div>

      <Link href={verified ? "/account" : "/auth/login"} className="text-sm underline">
        {verified ? "Przejdź do konta →" : "Przejdź do logowania →"}
      </Link>
    </div>
  );
}
