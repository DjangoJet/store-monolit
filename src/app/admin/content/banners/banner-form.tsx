"use client";

import { useActionState } from "react";
import {
  deleteBannerAction,
  saveBannerAction,
  type ContentState,
} from "@/modules/content/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";

export interface BannerData {
  id: string;
  key: string;
  title: string | null;
  subtitle: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  isActive: boolean;
}

export function BannerForm({ banner }: { banner?: BannerData }) {
  const [state, action, pending] = useActionState<ContentState, FormData>(
    saveBannerAction,
    undefined,
  );
  const errors = state?.fieldErrors;
  const isNew = !banner;

  return (
    <form
      action={action}
      className={`space-y-2 rounded-lg border p-4 ${isNew ? "border-dashed" : ""}`}
    >
      {isNew && <p className="text-sm font-medium">Nowy banner</p>}
      {banner && <input type="hidden" name="id" value={banner.id} />}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Klucz *</Label>
          <Input
            name="key"
            defaultValue={banner?.key}
            placeholder="hero"
            readOnly={!!banner}
            aria-invalid={!!errors?.key}
            required
          />
          <FieldError message={errors?.key} />
        </div>
        <label className="flex items-end gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={banner?.isActive ?? true} />
          Aktywny
        </label>
      </div>
      <Input name="title" placeholder="Tytuł" defaultValue={banner?.title ?? ""} />
      <Input name="subtitle" placeholder="Podtytuł" defaultValue={banner?.subtitle ?? ""} />
      <div className="space-y-1">
        <Input
          name="imageUrl"
          placeholder="URL obrazka"
          defaultValue={banner?.imageUrl ?? ""}
          aria-invalid={!!errors?.imageUrl}
        />
        <FieldError message={errors?.imageUrl} />
      </div>
      <div className="space-y-1">
        <Input
          name="linkUrl"
          placeholder="URL linku"
          defaultValue={banner?.linkUrl ?? ""}
          aria-invalid={!!errors?.linkUrl}
        />
        <FieldError message={errors?.linkUrl} />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "..." : isNew ? "Dodaj" : "Zapisz"}
        </Button>
        {banner && (
          <Button type="submit" size="sm" variant="ghost" formAction={deleteBannerAction}>
            Usuń
          </Button>
        )}
        {state?.success && <span className="text-xs text-green-600">{state.success}</span>}
      </div>
    </form>
  );
}
