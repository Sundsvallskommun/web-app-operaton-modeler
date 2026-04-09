/*
 * Generates typed TypeScript clients from the running api-service-operaton
 * backend's OpenAPI spec. Run via `yarn generate:contracts` — requires the
 * backend to be running locally on the URL in NEXT_PUBLIC_API_URL.
 *
 * Output lands in src/data-contracts/operaton/ (gitignored).
 */
import { generateApi } from 'swagger-typescript-api';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

(async () => {
  await generateApi({
    fileName: 'operaton.ts',
    output: path.resolve(process.cwd(), 'src/data-contracts/operaton'),
    url: `${API_URL}/api-docs`,
    httpClientType: 'fetch',
    generateClient: false,
    generateResponses: true,
    extractRequestParams: true,
    extractRequestBody: true,
  });
  // eslint-disable-next-line no-console
  console.log(`✔ Generated operaton contracts from ${API_URL}/api-docs`);
})().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to generate contracts:', error);
  process.exit(1);
});
