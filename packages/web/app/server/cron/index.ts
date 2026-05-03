import { runRetention } from "./retention";

// Run retention job once at startup (after 10 seconds)
setTimeout(async () => {
  try {
    console.log("[cron] Running initial retention job...");
    await runRetention();
    console.log("[cron] Initial retention job complete");
  } catch (err) {
    console.error("[cron] Initial retention error:", err);
  }
}, 10000);

// Run retention job daily (every 24 hours)
const DAILY_MS = 24 * 60 * 60 * 1000;
setInterval(async () => {
  try {
    console.log("[cron] Running daily retention job...");
    await runRetention();
    console.log("[cron] Daily retention job complete");
  } catch (err) {
    console.error("[cron] Daily retention error:", err);
  }
}, DAILY_MS);

console.log("[cron] Scheduled daily retention job (every 24 hours)");
