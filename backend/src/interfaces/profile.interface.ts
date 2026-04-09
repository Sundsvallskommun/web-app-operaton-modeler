/**
 * Shape of the SAML profile we expect from the IdP. Field names mirror what
 * web-app-fake-sso-idp emits in dev and what ADFS emits in prod (after the
 * standard claim mapping).
 */
export interface Profile {
  username?: unknown;
  givenName?: string;
  surname?: string;
  userId?: unknown;
  citizenIdentifier?: string;
}
