/**
 * Unified Hardware Thermal Print Dispatcher
 * Seamlessly routes print requests to Kot Printer (USB001):
 * - If running locally with print agent on 127.0.0.1:9123, dispatches instantly with 0ms delay.
 * - If running on live cloud, falls back immediately to cloud server queue.
 * - Prevents duplicate prints and avoids mixed-content timeouts on HTTPS.
 */
export async function dispatchHardwarePrint(endpoint: string, payload: any): Promise<boolean> {
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // 1. Instant Local Agent Dispatch (only attempt when on localhost or plain HTTP to avoid mixed-content hang)
  if (!isHttps || isLocalhost) {
    try {
      const localUrl = `http://127.0.0.1:9123${endpoint}`;
      const localRes = await fetch(localUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(600)
      });
      if (localRes.ok) {
        const data = await localRes.json().catch(() => ({}));
        if (data && data.success === true) {
          return true;
        }
      }
    } catch {
      // Local agent unavailable, fallback to cloud queue
    }
  }

  // 2. Cloud Server Queue Fallback
  try {
    const serverRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000)
    });
    if (serverRes.ok) {
      const data = await serverRes.json().catch(() => ({}));
      return data.success === true || !!data.queued;
    }
  } catch (err) {
    console.warn(`[Hardware Print] Cloud dispatch error on ${endpoint}:`, err);
  }

  return false;
}
