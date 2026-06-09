"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUploadUrl, registerMedia } from "@/modules/media/actions";

export function MediaUploader() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { key, uploadUrl } = await createUploadUrl(file.name, file.type, "library");
      const res = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!res.ok) throw new Error("Upload nie powiódł się.");
      await registerMedia({ key, mimeType: file.type, sizeBytes: file.size });
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
        {busy ? "Wgrywanie..." : "+ Wgraj plik"}
        <input type="file" className="hidden" onChange={onChange} disabled={busy} />
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
