"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/modules/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  const errors = state?.fieldErrors;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="redirectTo" value={callbackUrl ?? "/account"} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors?.email}
          required
        />
        <FieldError message={errors?.email} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Hasło</Label>
          <Link
            href="/auth/forgot"
            className="text-xs text-muted-foreground underline"
          >
            Nie pamiętasz hasła?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors?.password}
          required
        />
        <FieldError message={errors?.password} />
      </div>

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Logowanie..." : "Zaloguj się"}
      </Button>
    </form>
  );
}
