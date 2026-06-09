import Link from "next/link";

const SECTIONS = [
  { href: "/admin/content/pages", label: "Strony", desc: "Regulamin, FAQ, polityki…" },
  { href: "/admin/content/blog", label: "Blog", desc: "Wpisy blogowe" },
  { href: "/admin/content/banners", label: "Bannery", desc: "Sekcje strony głównej" },
  { href: "/admin/content/media", label: "Media", desc: "Biblioteka plików" },
];

export default function AdminContentPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Treści</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-lg border p-4 hover:bg-accent"
          >
            <p className="font-medium">{s.label}</p>
            <p className="text-sm text-muted-foreground">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
