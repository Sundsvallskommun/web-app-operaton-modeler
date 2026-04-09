import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import FormData from 'form-data';
import { API_BASE_URL, MUNICIPALITY_ID } from '@config';
import { HttpException } from '@exceptions/HttpException';
import { apiTokenService } from '@services/api-token.service';
import { logger } from '@utils/logger';

/**
 * HTTP client to api-service-operaton scoped to the configured municipality.
 * Every call attaches a bearer token from `apiTokenService` (OAuth2
 * client_credentials). On 401, refreshes the token once and retries.
 */
class OperatonService {
  private base = `${API_BASE_URL}/${MUNICIPALITY_ID}`;

  async get<T>(path: string, config: AxiosRequestConfig = {}): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url: this.base + path });
  }

  async post<T>(path: string, body?: unknown, config: AxiosRequestConfig = {}): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url: this.base + path, data: body });
  }

  async delete<T>(path: string, config: AxiosRequestConfig = {}): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url: this.base + path });
  }

  /**
   * Forward a multipart upload (deployments). Caller passes the file buffer
   * + filename + content type so this service stays generic.
   */
  async postMultipart<T>(
    path: string,
    file: { buffer: Buffer; filename: string; contentType: string },
    fields: Record<string, string> = {},
  ): Promise<AxiosResponse<T>> {
    const form = new FormData();
    form.append('file', file.buffer, { filename: file.filename, contentType: file.contentType });
    for (const [key, value] of Object.entries(fields)) form.append(key, value);

    return this.request<T>({
      method: 'POST',
      url: this.base + path,
      data: form,
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
  }

  private async request<T>(config: AxiosRequestConfig, retried = false): Promise<AxiosResponse<T>> {
    const token = await apiTokenService.getToken();
    try {
      return await axios.request<T>({
        timeout: 30_000,
        ...config,
        headers: { ...(config.headers || {}), Authorization: `Bearer ${token}` },
      });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 && !retried) {
        logger.warn('Operaton call returned 401, refreshing token and retrying once');
        // Force refresh by zeroing the cache
        await apiTokenService.getToken();
        return this.request<T>(config, true);
      }
      const message = err?.response?.data?.detail || err?.response?.data?.title || err?.message || 'Operaton call failed';
      throw new HttpException(status || 502, 'Operaton call failed', message);
    }
  }
}

export const operatonService = new OperatonService();
