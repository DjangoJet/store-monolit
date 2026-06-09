import Link from "next/link";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rejestracja</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Utwórz nowe konto klienta.
        </p>
      </div>
      <RegisterForm />
      <p className="text-center text-sm text-muted-foreground">
        Masz już konto?{" "}
        <Link href="/auth/login" className="font-medium underline">
          Zaloguj się
        </Link>
      </p>
    </div>
  );
}
