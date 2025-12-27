import { createAlova } from 'alova';
import adapterFetch from 'alova/fetch';
import ReactHook from 'alova/react';
import { getCookie } from '@/utils/cookie';
import { HttpError } from '@/lib/errors';
import type { HttpResponse } from '~/types';

export const alovaInstance = createAlova({
  baseURL: `${import.meta.env.VITE_BASE_URL}/api`,
  statesHook: ReactHook,
  requestAdapter: adapterFetch(),
  async beforeRequest(method) {

    // console.log('beforeRequest========method', method);

    if (typeof window === 'undefined') return;

    method.config = {
      ...(method.config || {}),
      credentials: 'include',
    };

    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    const methodType = ((method as any).type || 'GET').toUpperCase();
    const isSafe = safeMethods.includes(methodType);
    if (!isSafe) {
      const csrfToken = getCookie('csrf_token');
      if (csrfToken) {
        method.config.headers = {
          ...(method.config.headers || {}),
          'X-CSRF-Token': csrfToken,
        };
      }
    }

    try {
      const persisted = window.localStorage.getItem('auth-storage');
      if (!persisted) return;

      const parsed = JSON.parse(persisted) as {
        state?: { token?: string | null };
      };

      const token = parsed.state?.token;
      if (!token) return;

      method.config.headers = {
        ...(method.config.headers || {}),
        Authorization: `Bearer ${token}`,
      };
    } catch {
      // ignore storage parsing errors
    }
  },
  responded: {
    async onSuccess(response: any) {
      if (!response.ok) { //HTTP 失败 （状态码>=300）
        let json: HttpResponse = {} as HttpResponse;
        try {
          json = await response.json();
        } catch (error) {
            const message = response.statusText || 'Request failed';
            throw new HttpError(response.status, message);
        }
        throw new HttpError(json.code, json.errMsg || 'Request failed', json.data);
      }
      // HTTP 成功 （但可能业务异常，依赖data.code）
      const data = await response.json();

      if (data && typeof data === 'object' && 'code' in data && 'data' in data) {
        const body = data as HttpResponse;
        const success = body.code >= 200 && body.code < 300;
        if (!success) {
          const message = typeof body.errMsg === 'string' && body.errMsg.length > 0 ? body.errMsg : `Request failed with code ${body.code}`;
          throw new HttpError(body.code, message, body.data);
        }
        return body.data;
      }

      return data;
    },
  },
});
