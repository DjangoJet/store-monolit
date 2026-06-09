"use client";

import { useActionState } from "react";
import { updateProductAction, type FormState } from "@/modules/catalog/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/ui/field-error";

export interface DetailsFormProps {
  product: {
    id: string;
    title: string;
    slug: string;
    subtitle: string | null;
    description: string | null;
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
    type: "PHYSICAL" | "DIGITAL";
    vatRate: number;
    metaTitle: string | null;
    metaDescription: string | null;
  };
}

export function DetailsForm({ product }: DetailsFormProps) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    updateProductAction,
    undefined,
  );
  const errors = state?.fieldErrors;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={product.id} />

      <div className="space-y-2">
        <Label htmlFor="title">Tytuł *</Label>
        <Input
          id="title"
          name="title"
          defaultValue={product.title}
          aria-invalid={!!errors?.title}
          required
        />
        <FieldError message={errors?.title} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" defaultValue={product.slug} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" defaultValue={product.status}>
              <option value="DRAFT">Szkic</option>
              <option value="ACTIVE">Aktywny</option>
              <option value="ARCHIVED">Zarchiwizowany</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Typ</Label>
            <Select id="type" name="type" defaultValue={product.type}>
              <option value="PHYSICAL">Fizyczny</option>
              <option value="DIGITAL">Cyfrowy</option>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="vatRate">Stawka VAT (%)</Label>
        <Select id="vatRate" name="vatRate" defaultValue={String(product.vatRate)}>
          <option value="23">23%</option>
          <option value="8">8%</option>
          <option value="5">5%</option>
          <option value="0">0% / zw.</option>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subtitle">Podtytuł</Label>
        <Input id="subtitle" name="subtitle" defaultValue={product.subtitle ?? ""} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Opis</Label>
        <Textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={product.description ?? ""}
        />
      </div>

      <fieldset className="space-y-4 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">SEO</legend>
        <div className="space-y-2">
          <Label htmlFor="metaTitle">Meta title</Label>
          <Input id="metaTitle" name="metaTitle" defaultValue={product.metaTitle ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="metaDescription">Meta description</Label>
          <Textarea
            id="metaDescription"
            name="metaDescription"
            rows={2}
            defaultValue={product.metaDescription ?? ""}
          />
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Zapisywanie..." : "Zapisz"}
        </Button>
        {state?.error && <span className="text-sm text-destructive">{state.error}</span>}
        {state?.success && <span className="text-sm text-green-600">{state.success}</span>}
      </div>
    </form>
  );
}
