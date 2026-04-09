/**
 * The session-resident user object. Stored on req.session.passport.user after
 * a successful SAML login. Returned (subset) by GET /api/me to the SPA.
 */
export interface User {
  userId: string | undefined;
  username: string | undefined;
  name: string;
  givenName: string | undefined;
  surname: string | undefined;
}
