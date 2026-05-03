import { runRetention } from "./retention";

setTimeout(async () => {
  try {
    await runRetention();
  } catch (err) {
    console.error("[cron] Startup retention error:", err);
  }
}, 10000);
