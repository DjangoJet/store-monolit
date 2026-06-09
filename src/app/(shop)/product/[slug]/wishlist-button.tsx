"use client";

import { useState, useTransition } from "react";
import { toggleWishlistAction } from "@/modules/wishlist/actions";
import { Button } from "@/components/ui/button";

export function WishlistButton({
  productId,
  slug,
  initial,
}: {
  productId: string;
  slug: string;
  initial: boolean;
}) {
  const [inList, setInList] = useState(initial);
  const [pending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      const next = await toggleWishlistAction(productId, slug);
      setInList(next);
    });
  }

  return (
    <Button type="button" variant="outline" onClick={handle} disabled={pending}>
      {inList ? "♥ Na liście życzeń" : "♡ Do listy życzeń"}
    </Button>
  );
}
