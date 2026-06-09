import { listBanners } from "@/modules/content/service";
import { BannerForm } from "./banner-form";

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
          <BannerForm
            key={b.id}
            banner={{
              id: b.id,
              key: b.key,
              title: b.title,
              subtitle: b.subtitle,
              imageUrl: b.imageUrl,
              linkUrl: b.linkUrl,
              isActive: b.isActive,
            }}
          />
        ))}

        <BannerForm />
      </div>
    </div>
  );
}
