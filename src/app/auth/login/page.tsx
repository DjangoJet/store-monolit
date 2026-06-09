import Link from "next/link";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Logowanie</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Zaloguj się do swojego konta.
        </p>
      </div>
      <LoginForm callbackUrl={callbackUrl} />
      <p className="text-center text-sm text-muted-foreground">
        Nie masz konta?{" "}
        <Link href="/auth/register" className="font-medium underline">
          Zarejestruj się
        </Link>
      </p>
    </div>
  );
}
