import { handleWebhook } from "@/modules/payments/service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  try {
    await handleWebhook(provider, req);
    return new Response(null, { status: 200 });
  } catch (err) {
    console.error(`Webhook ${provider} error:`, err);
    return new Response("webhook error", { status: 400 });
  }
}
