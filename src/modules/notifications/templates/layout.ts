export interface EmailBranding {
  storeName: string;
  appUrl: string;
}

/** Wspólny layout maili (lekki HTML; edytuj tu wygląd globalny). */
export function emailLayout(branding: EmailBranding, content: string): string {
  return `<!doctype html>
<html lang="pl"><body style="margin:0;background:#f5f5f5;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:12px;overflow:hidden;font-family:system-ui,Segoe UI,Roboto,sans-serif;color:#111">
    <div style="padding:16px 24px;border-bottom:1px solid #eee;font-weight:600;font-size:18px">${branding.storeName}</div>
    <div style="padding:24px;font-size:14px;line-height:1.6">${content}</div>
    <div style="padding:16px 24px;border-top:1px solid #eee;color:#888;font-size:12px">
      ${branding.storeName} · <a href="${branding.appUrl}" style="color:#888">${branding.appUrl}</a>
    </div>
  </div>
</body></html>`;
}
