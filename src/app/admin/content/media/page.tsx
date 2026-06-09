import { listMedia } from "@/modules/media/service";
import { deleteMediaAction } from "@/modules/media/actions";
import { MediaUploader } from "./media-uploader";

export default async function AdminMediaPage() {
  const assets = await listMedia();

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Biblioteka mediów</h1>
        <MediaUploader />
      </div>

      {assets.length === 0 ? (
        <p className="mt-6 text-muted-foreground">Brak plików.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {assets.map((a) => (
            <div key={a.id} className="rounded-lg border p-2">
              <div className="aspect-square overflow-hidden rounded bg-muted">
                {a.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.url} alt={a.key} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    {a.mimeType}
                  </div>
                )}
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground" title={a.url}>
                {a.url}
              </p>
              <form action={deleteMediaAction} className="mt-1">
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className="text-xs text-destructive hover:underline">
                  Usuń
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
