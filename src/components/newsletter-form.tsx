"use client";

import { useActionState } from "react";
import { subscribeAction, type NewsletterState } from "@/modules/newsletter/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewsletterForm() {
  const [state, action, pending] = useActionState<NewsletterState, FormData>(
    subscribeAction,
    undefined,
  );

  return (
    <div className="space-y-1">
      <form action={action} className="flex gap-2">
        <Input name="email" type="email" placeholder="Twój email" className="max-w-56" required />
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          Zapisz się
        </Button>
      </form>
      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
      {state?.success && <p className="text-xs text-green-600">{state.success}</p>}
    </div>
  );
}
