import { config } from 'dotenv';

config({ path: `.env.${process.env.NODE_ENV || 'development'}.local` });
config({ path: '.env.local' });
config(); // .env

export const {
  APP_NAME,
  NODE_ENV,
  PORT,
  BASE_URL_PREFIX,
  LOG_FORMAT,
  CLIENT_KEY,
  CLIENT_SECRET,
  TOKEN_URL,
  API_BASE_URL,
  MUNICIPALITY_ID,
  SAML_CALLBACK_URL,
  SAML_LOGOUT_CALLBACK_URL,
  SAML_FAILURE_REDIRECT,
  SAML_ENTRY_SSO,
  SAML_ISSUER,
  SAML_IDP_PUBLIC_CERT,
  SAML_PRIVATE_KEY,
  SAML_PUBLIC_KEY,
  SECRET_KEY,
  ORIGIN,
} = process.env;

export const SESSION_MEMORY = process.env.SESSION_MEMORY === 'true';
export const CREDENTIALS = process.env.CREDENTIALS === 'true';
