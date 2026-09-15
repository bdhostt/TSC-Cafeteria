/**
 * Unified Hardware Thermal Print Dispatcher
 * Seamlessly routes print requests to Kot Printer (USB001):
 * - If running locally with print agent on 127.0.0.1:9123, dispatches instantly with 0ms delay.
 * - If running on live cloud (https://erp-pos-sdv3.onrender.com), falls back immediately to cloud server queue.
 * - Prevents duplicate prints.
 */
export async function dispatchHardwarePrint(endpoint: string, payload: any): Promise<boolean> {
  // 1. Try local direct print bridge (port 9123)
  try {
    const localRes = await fetch(`http://127.0.0.1:9123${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(800)
    });
    if (localRes.ok) {
      const data = await localRes.json().catch(() => ({}));
      if (data.success !== false) {
        return true;
      }
    }
  } catch (_) {
    // Expected to fail on HTTPS cloud deployment (Mixed Content block) or when agent not running
  }

  // 2. Fall back to Server endpoint (Windows server prints directly; Cloud Render queues for polling print-agent)
  try {
    const serverRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000)
    });
    if (serverRes.ok) {
      const data = await serverRes.json().catch(() => ({}));
      return data.success === true || !!data.queued;
    }
  } catch (err) {
    console.warn(`[Hardware Print] Server dispatch error on ${endpoint}:`, err);
  }

  return false;
}
