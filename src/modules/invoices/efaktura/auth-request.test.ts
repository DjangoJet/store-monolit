import { describe, expect, it } from "vitest";
import { buildAuthTokenRequestXml } from "./auth-request";

describe("buildAuthTokenRequestXml", () => {
  const challenge = "20260101-CR-1A2B3C4D5E-0F1E2D3C4B-A1";

  it("buduje dokument w namespace auth v2 z wymaganymi elementami", () => {
    const xml = buildAuthTokenRequestXml(challenge, "1111111111", "certificateFingerprint");
    expect(xml).toContain('<AuthTokenRequest xmlns="http://ksef.mf.gov.pl/auth/token/2.0">');
    expect(xml).toContain(`<Challenge>${challenge}</Challenge>`);
    expect(xml).toContain("<Nip>1111111111</Nip>");
    expect(xml).toContain("<SubjectIdentifierType>certificateFingerprint</SubjectIdentifierType>");
  });

  it("respektuje typ identyfikacji podmiotu", () => {
    const xml = buildAuthTokenRequestXml(challenge, "9999999999", "certificateSubject");
    expect(xml).toContain("<SubjectIdentifierType>certificateSubject</SubjectIdentifierType>");
  });
});
