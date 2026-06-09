import { listBanners } from "@/modules/content/service";
import { deleteBannerAction, saveBannerAction } from "@/modules/content/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function BannerFields({
  banner,
}: {
  banner?: {
    key: string;
    title: string | null;
    subtitle: string | null;
    imageUrl: string | null;
    linkUrl: string | null;
    isActive: boolean;
  };
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Klucz *</Label>
          <Input
            name="key"
            defaultValue={banner?.key}
            placeholder="hero"
            readOnly={!!banner}
            required
          />
        </div>
        <label className="flex items-end gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={banner?.isActive ?? true} />
          Aktywny
        </label>
      </div>
      <Input name="title" placeholder="Tytuł" defaultValue={banner?.title ?? ""} />
      <Input name="subtitle" placeholder="Podtytuł" defaultValue={banner?.subtitle ?? ""} />
      <Input name="imageUrl" placeholder="URL obrazka" defaultValue={banner?.imageUrl ?? ""} />
      <Input name="linkUrl" placeholder="URL linku" defaultValue={banner?.linkUrl ?? ""} />
    </>
  );
}

export default async function AdminBannersPage() {
  const banners = await listBanners();

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Bannery</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Edytowalne sekcje strony głównej (np. klucz <code>hero</code>).
      </p>

      <div className="mt-6 space-y-4">
        {banners.map((b) => (
          <form key={b.id} action={saveBannerAction} className="space-y-2 rounded-lg border p-4">
            <BannerFields banner={b} />
            <div className="flex gap-2">
              <Button type="submit" size="sm">Zapisz</Button>
              <Button type="submit" size="sm" variant="ghost" formAction={deleteBannerAction}>
                Usuń
              </Button>
              <input type="hidden" name="id" value={b.id} />
            </div>
          </form>
        ))}

        <form action={saveBannerAction} className="space-y-2 rounded-lg border border-dashed p-4">
          <p className="text-sm font-medium">Nowy banner</p>
          <BannerFields />
          <Button type="submit" size="sm">Dodaj</Button>
        </form>
      </div>
    </div>
  );
}
