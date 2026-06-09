import Link from "next/link";
import { listReviews } from "@/modules/reviews/service";
import { moderateReviewAction } from "@/modules/reviews/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_VARIANT = { PENDING: "muted", APPROVED: "success", REJECTED: "outline" } as const;

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status = (sp.status as "PENDING" | "APPROVED" | "REJECTED") || undefined;
  const reviews = await listReviews(status);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Recenzje</h1>

      <div className="mt-4 flex gap-2 text-sm">
        {[
          { label: "Wszystkie", value: "" },
          { label: "Oczekujące", value: "PENDING" },
          { label: "Zatwierdzone", value: "APPROVED" },
          { label: "Odrzucone", value: "REJECTED" },
        ].map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/admin/reviews?status=${f.value}` : "/admin/reviews"}
            className={`rounded-md border px-3 py-1 ${
              (sp.status ?? "") === f.value ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {reviews.length === 0 && (
          <p className="text-muted-foreground">Brak recenzji.</p>
        )}
        {reviews.map((r) => (
          <div key={r.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">
                  {"★".repeat(r.rating)}
                  <span className="text-muted-foreground">{"★".repeat(5 - r.rating)}</span>
                  {r.title ? ` — ${r.title}` : ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  {r.product.title} · {r.user?.email ?? "anonim"} ·{" "}
                  {r.createdAt.toLocaleDateString("pl-PL")}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
            </div>
            {r.body && <p className="mt-2 text-sm">{r.body}</p>}

            <div className="mt-3 flex gap-2">
              {r.status !== "APPROVED" && (
                <form action={moderateReviewAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="status" value="APPROVED" />
                  <Button type="submit" size="sm">Zatwierdź</Button>
                </form>
              )}
              {r.status !== "REJECTED" && (
                <form action={moderateReviewAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="status" value="REJECTED" />
                  <Button type="submit" size="sm" variant="outline">Odrzuć</Button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
