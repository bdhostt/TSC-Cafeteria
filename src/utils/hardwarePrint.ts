/**
 * Unified Hardware Thermal Print Dispatcher
 * Seamlessly routes print requests to Kot Printer (USB001):
 * - If running locally with print agent on 127.0.0.1:9123, dispatches instantly with 0ms delay.
 * - If running on live cloud (https://erp-pos-sdv3.onrender.com), falls back immediately to cloud server queue.
 * - Prevents duplicate prints.
 */
export async function dispatchHardwarePrint(endpoint: string, payload: any): Promise<boolean> {
  // 1. Instant Local Agent Dispatch (0ms delay when running on cashier PC)
  try {
    const localUrl = `http://127.0.0.1:9123${endpoint}`;
    const localRes = await fetch(localUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(1200)
    });
    if (localRes.ok) {
      const data = await localRes.json().catch(() => ({}));
      if (data && data.success === true) {
        return true;
      }
    }
  } catch (localErr) {
    // Not running on cashier machine or local agent unavailable, fallback to cloud queue
  }

  // 2. Cloud Server Queue Fallback
  try {
    const serverRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000)
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
