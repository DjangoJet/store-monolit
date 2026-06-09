"use client";

import { useActionState } from "react";
import {
  createPageAction,
  updatePageAction,
  type ContentState,
} from "@/modules/content/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/ui/field-error";

export interface PageFormData {
  id: string;
  title: string;
  slug: string;
  body: string;
  status: string;
  metaTitle: string | null;
  metaDescription: string | null;
}

export function PageForm({ page }: { page?: PageFormData }) {
  const action = page ? updatePageAction : createPageAction;
  const [state, formAction, pending] = useActionState<ContentState, FormData>(
    action,
    undefined,
  );
  const errors = state?.fieldErrors;

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      {page && <input type="hidden" name="id" value={page.id} />}

      <div className="space-y-2">
        <Label htmlFor="title">Tytuł *</Label>
        <Input id="title" name="title" defaultValue={page?.title} aria-invalid={!!errors?.title} required />
        <FieldError message={errors?.title} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {page && (
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" defaultValue={page.slug} aria-invalid={!!errors?.slug} />
            <FieldError message={errors?.slug} />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={page?.status ?? "DRAFT"}>
            <option value="DRAFT">Szkic</option>
            <option value="PUBLISHED">Opublikowana</option>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Treść (Markdown/tekst)</Label>
        <Textarea id="body" name="body" rows={12} defaultValue={page?.body} />
      </div>

      <fieldset className="space-y-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">SEO</legend>
        <div className="space-y-1">
          <Input
            name="metaTitle"
            placeholder="Meta title"
            defaultValue={page?.metaTitle ?? ""}
            aria-invalid={!!errors?.metaTitle}
          />
          <FieldError message={errors?.metaTitle} />
        </div>
        <div className="space-y-1">
          <Textarea
            name="metaDescription"
            rows={2}
            placeholder="Meta description"
            defaultValue={page?.metaDescription ?? ""}
            aria-invalid={!!errors?.metaDescription}
          />
          <FieldError message={errors?.metaDescription} />
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Zapisywanie..." : page ? "Zapisz" : "Utwórz"}
        </Button>
        {state?.error && <span className="text-sm text-destructive">{state.error}</span>}
        {state?.success && <span className="text-sm text-green-600">{state.success}</span>}
      </div>
    </form>
  );
}
