"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUploadUrl } from "@/modules/media/actions";
import { addProductImageAction } from "@/modules/catalog/actions";

export function ImageUploader({ productId }: { productId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { uploadUrl, publicUrl } = await createUploadUrl(file.name, file.type);
      const res = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!res.ok) throw new Error("Upload do storage nie powiódł się.");

      const fd = new FormData();
      fd.set("productId", productId);
      fd.set("url", publicUrl);
      fd.set("alt", file.name);
      await addProductImageAction(fd);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd uploadu.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <label className="inline-flex cursor-pointer items-center rounded-md border border-dashed px-4 py-2 text-sm hover:bg-accent">
        {busy ? "Wgrywanie..." : "+ Dodaj zdjęcie"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onChange}
          disabled={busy}
        />
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
