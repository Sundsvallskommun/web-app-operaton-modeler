const envalid = require('envalid');

// NEXT_PUBLIC_API_URL points at the BFF (e.g. http://localhost:3001/api).
// MUNICIPALITY_ID lives on the BFF now — the SPA only ever talks to the BFF.
envalid.cleanEnv(process.env, {
  NEXT_PUBLIC_API_URL: envalid.str(),
});

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  // `standalone` emits a trimmed-down server bundle at .next/standalone that
  // the docker runtime stage can copy without pulling in the full node_modules
  // tree. See https://nextjs.org/docs/pages/api-reference/next-config-js/output
  output: 'standalone',
};
