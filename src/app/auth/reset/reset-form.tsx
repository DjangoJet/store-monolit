"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction } from "@/modules/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, undefined);

  if (state?.success) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-green-600">{state.success}</p>
        <Link href="/auth/login" className="font-medium underline">
          Przejdź do logowania
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-2">
        <Label htmlFor="password">Nowe hasło</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Zapisywanie..." : "Ustaw nowe hasło"}
      </Button>
    </form>
  );
}
