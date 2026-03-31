import { after } from "next/server";

/** Run work after the HTTP response is sent (Next.js 15+). */
export function scheduleAfterResponse(task: () => Promise<void>): void {
  after(async () => {
    try {
      await task();
    } catch (e) {
      console.error("[ASYNC_JOB]", e);
    }
  });
}
