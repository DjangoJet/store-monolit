import { getMethodPickupPoints } from "@/modules/shipping/service";

/**
 * Punkty odbioru dla wybranej metody wysyłki (publiczne — używane w checkoucie).
 * Provider-agnostic: deleguje do adaptera aktywnego przewoźnika. Zwraca zawsze
 * `{ points }` (pusta lista przy braku wsparcia / błędzie), by front był prosty.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    methodId?: string;
    query?: string;
    postalCode?: string;
    lat?: number;
    lng?: number;
  };
  if (!body.methodId) return Response.json({ points: [] });

  const points = await getMethodPickupPoints(body.methodId, {
    query: body.query,
    postalCode: body.postalCode,
    lat: body.lat,
    lng: body.lng,
  });
  return Response.json({ points });
}
