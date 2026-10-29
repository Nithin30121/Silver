// SILVORA | Waiting for the API while its free server wakes up
// The API sleeps when nobody has visited for a while and takes 30 to 50 seconds to wake, and it can't
// answer while it restarts after a deploy. Requests that only read are tried again through that;
// requests that change something (orders, saves, uploads) are sent once, because repeating one could
// act twice.

/** Pauses between attempts, about a minute in all. */
export const WAKE_RETRY_DELAYS_MS = [2000, 3000, 5000, 5000, 8000, 10000, 10000, 10000, 10000];

/** What the host answers while the server is still starting. */
export const isWakingStatus = (status: number) => status >= 502 && status <= 504;

export function pause(milliseconds: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
  });
}

/**
 * fetch, except that a GET which can't reach the server, or gets a 502 to 504, is tried again after
 * each pause above. Other methods are sent once. When the pauses run out, the last response is
 * returned or the last network error thrown, just as fetch would.
 */
export async function fetchWhileWaking(url: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase();
  const delays = method === 'GET' || method === 'HEAD' ? WAKE_RETRY_DELAYS_MS : [];
  for (let attempt = 0; ; attempt += 1) {
    const delay = delays[attempt];
    try {
      const response = await fetch(url, init);
      if (delay === undefined || !isWakingStatus(response.status)) return response;
    } catch (error) {
      if (delay === undefined || init.signal?.aborted) throw error;
    }
    await pause(delay, init.signal);
  }
}
