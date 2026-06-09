"use client";

import { useActionState } from "react";
import { registerAction } from "@/modules/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, undefined);
  const errors = state?.fieldErrors;

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Imię i nazwisko</Label>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          aria-invalid={!!errors?.name}
        />
        <FieldError message={errors?.name} />
      </div>
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
        <Label htmlFor="password">Hasło</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          aria-invalid={!!errors?.password}
          required
        />
        <FieldError message={errors?.password} />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Tworzenie konta..." : "Załóż konto"}
      </Button>
    </form>
  );
}
