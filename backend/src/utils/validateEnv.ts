import { cleanEnv, port, str, bool, url } from 'envalid';

/**
 * Validates required env vars at startup. Throws and prints a friendly error
 * if anything's missing/malformed — fail fast rather than crash later.
 */
export function validateEnv(): void {
  cleanEnv(process.env, {
    APP_NAME: str(),
    NODE_ENV: str({ choices: ['development', 'production', 'test'] }),
    PORT: port({ default: 3000 }),
    BASE_URL_PREFIX: str({ default: '/api' }),

    CLIENT_KEY: str(),
    CLIENT_SECRET: str(),
    TOKEN_URL: url(),
    API_BASE_URL: url(),
    MUNICIPALITY_ID: str(),

    SAML_CALLBACK_URL: url(),
    SAML_LOGOUT_CALLBACK_URL: url(),
    SAML_FAILURE_REDIRECT: url(),
    SAML_ENTRY_SSO: url(),
    SAML_ISSUER: str(),
    SAML_IDP_PUBLIC_CERT: str(),
    SAML_PRIVATE_KEY: str(),
    SAML_PUBLIC_KEY: str(),

    SECRET_KEY: str(),
    SESSION_MEMORY: bool({ default: true }),

    ORIGIN: str(),
    CREDENTIALS: bool({ default: true }),
  });
}
