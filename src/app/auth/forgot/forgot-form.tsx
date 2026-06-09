"use client";

import { useActionState } from "react";
import { forgotAction } from "@/modules/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotAction, undefined);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Wysyłanie..." : "Wyślij instrukcję"}
      </Button>
    </form>
  );
}
