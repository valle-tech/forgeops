import { AsyncLocalStorage } from 'async_hooks';

type RequestStore = { requestId: string };

export const requestContext = new AsyncLocalStorage<RequestStore>();

export function getRequestIdFromContext(): string | undefined {
  return requestContext.getStore()?.requestId;
}
