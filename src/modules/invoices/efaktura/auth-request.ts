// Budowniczy dokumentu AuthTokenRequest (KSeF 2.0, schema auth v2).
// namespace: http://ksef.mf.gov.pl/auth/token/2.0
// Dokument jest następnie podpisywany XAdES (patrz xades.ts) i wysyłany na /auth/xades-signature.

const AUTH_NS = "http://ksef.mf.gov.pl/auth/token/2.0";

// Sposób identyfikacji podmiotu po certyfikacie:
//  - certificateSubject     — NIP/PESEL zaszyty w polu subject certyfikatu (cert kwalifikowany),
//  - certificateFingerprint — odcisk SHA-256 certyfikatu zarejestrowany jako uprawnienie (self-signed/TE).
export type SubjectIdentifierType = "certificateSubject" | "certificateFingerprint";

export function buildAuthTokenRequestXml(
  challenge: string,
  nip: string,
  subjectType: SubjectIdentifierType,
): string {
  // Challenge (wzorzec MF) i NIP (cyfry) nie zawierają znaków wymagających escapowania.
  return `<?xml version="1.0" encoding="UTF-8"?>
<AuthTokenRequest xmlns="${AUTH_NS}">
	<Challenge>${challenge}</Challenge>
	<ContextIdentifier>
		<Nip>${nip}</Nip>
	</ContextIdentifier>
	<SubjectIdentifierType>${subjectType}</SubjectIdentifierType>
</AuthTokenRequest>`;
}
