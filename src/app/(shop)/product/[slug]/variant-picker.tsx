"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addToCart } from "@/modules/cart/actions";
import { formatMoney } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface VariantDTO {
  id: string;
  title: string;
  priceAmount: number;
  currency: string;
  available: number;
}

export function VariantPicker({ variants }: { variants: VariantDTO[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(variants[0]?.id);
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];

  if (!selected) {
    return <p className="text-sm text-muted-foreground">Brak dostępnych wariantów.</p>;
  }

  const outOfStock = selected.available <= 0;

  function handleAdd() {
    const variantId = selected.id;
    startTransition(async () => {
      await addToCart(variantId, 1);
      setAdded(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-2xl font-semibold">
        {formatMoney(selected.priceAmount, selected.currency)}
      </p>

      {variants.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {variants.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setSelectedId(v.id)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm",
                v.id === selected.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-accent",
              )}
            >
              {v.title}
            </button>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {outOfStock ? "Niedostępny" : `Dostępne: ${selected.available} szt.`}
      </p>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={handleAdd}
          disabled={outOfStock || pending}
          className="w-full sm:w-auto"
        >
          {pending ? "Dodawanie..." : "Dodaj do koszyka"}
        </Button>
        {added && (
          <Link href="/cart" className="text-sm font-medium underline">
            Przejdź do koszyka →
          </Link>
        )}
      </div>
    </div>
  );
}
