import axios from 'axios';
import qs from 'qs';
import { CLIENT_KEY, CLIENT_SECRET, TOKEN_URL } from '@config';
import { HttpException } from '@exceptions/HttpException';
import { logger } from '@utils/logger';

interface Token {
  access_token: string;
  expires_in: number;
}

/**
 * In-memory OAuth2 client_credentials token cache. Re-fetches on demand
 * when expired (with a 10s safety margin). Single-replica friendly; if we
 * scale to N replicas later, each replica caches independently which is
 * fine — token endpoint is cheap.
 */
class ApiTokenService {
  private accessToken = '';
  private expiresAt = 0;

  async getToken(): Promise<string> {
    if (Date.now() >= this.expiresAt) {
      await this.fetchToken();
    }
    return this.accessToken;
  }

  private async fetchToken(): Promise<void> {
    const auth = Buffer.from(`${CLIENT_KEY}:${CLIENT_SECRET}`, 'utf-8').toString('base64');

    try {
      const { data } = await axios({
        timeout: 30_000,
        method: 'POST',
        url: TOKEN_URL,
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: qs.stringify({ grant_type: 'client_credentials' }),
      });
      const token = data as Token;
      if (!token?.access_token) throw new HttpException(502, 'Bad Gateway', 'OAuth2 token endpoint returned no access_token');

      this.accessToken = token.access_token;
      this.expiresAt = Date.now() + token.expires_in * 1000 - 10_000;
      logger.info(`OAuth2 client_credentials token refreshed; valid for ${token.expires_in}s`);
    } catch (err) {
      logger.error('Failed to fetch OAuth2 client_credentials token', err as Error);
      throw new HttpException(502, 'Bad Gateway', 'Failed to fetch OAuth2 token');
    }
  }
}

export const apiTokenService = new ApiTokenService();
