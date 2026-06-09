import Link from "next/link";
import { ForgotForm } from "./forgot-form";

export default function ForgotPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reset hasła</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Podaj email, a wyślemy instrukcję resetu.
        </p>
      </div>
      <ForgotForm />
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/auth/login" className="font-medium underline">
          Powrót do logowania
        </Link>
      </p>
    </div>
  );
}
