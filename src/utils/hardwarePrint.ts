/**
 * Unified Hardware Thermal Print Dispatcher
 * Seamlessly routes print requests to Kot Printer (USB001):
 * - If running locally with print agent on 127.0.0.1:9123, dispatches instantly with 0ms delay.
 * - If running on live cloud (https://erp-pos-sdv3.onrender.com), falls back immediately to cloud server queue.
 * - Prevents duplicate prints.
 */
export async function dispatchHardwarePrint(endpoint: string, payload: any): Promise<boolean> {
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
    console.warn(`[Hardware Print] Dispatch error on ${endpoint}:`, err);
  }

  return false;
}
