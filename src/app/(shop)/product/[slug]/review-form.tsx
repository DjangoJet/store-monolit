"use client";

import { useActionState } from "react";
import { submitReviewAction, type ReviewState } from "@/modules/reviews/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function ReviewForm({ productId, slug }: { productId: string; slug: string }) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(
    submitReviewAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-3 rounded-lg border p-4">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="slug" value={slug} />
      <div className="grid grid-cols-[120px_1fr] gap-3">
        <div className="space-y-2">
          <Label htmlFor="rating">Ocena</Label>
          <Select id="rating" name="rating" defaultValue="5">
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} ★
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Tytuł</Label>
          <Input id="title" name="title" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="body">Treść</Label>
        <Textarea id="body" name="body" rows={3} />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Wysyłanie..." : "Dodaj recenzję"}
      </Button>
    </form>
  );
}
