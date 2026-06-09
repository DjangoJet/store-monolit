"use client";

import { useActionState } from "react";
import { createCategoryAction, type FormState } from "@/modules/catalog/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FieldError } from "@/components/ui/field-error";

export function CategoryForm({
  parents,
}: {
  parents: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    createCategoryAction,
    undefined,
  );
  const errors = state?.fieldErrors;

  return (
    <form action={action} className="space-y-3 rounded-lg border p-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nazwa *</Label>
        <Input id="name" name="name" aria-invalid={!!errors?.name} required />
        <FieldError message={errors?.name} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="parentId">Kategoria nadrzędna</Label>
        <Select id="parentId" name="parentId" defaultValue="">
          <option value="">— (główna)</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Dodawanie..." : "Dodaj kategorię"}
      </Button>
    </form>
  );
}
