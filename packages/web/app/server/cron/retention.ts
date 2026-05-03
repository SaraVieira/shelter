import { db } from "../../db";
import { runs } from "../../db/schema";
import { lte } from "drizzle-orm";

export async function runRetention() {
  const fileDays = parseInt(process.env.RETENTION_FILE_DAYS || "90", 10);
  const fullDays = parseInt(process.env.RETENTION_FULL_DAYS || "365", 10);

  const now = new Date();

  const fileCutoffDate = new Date(now);
  fileCutoffDate.setDate(fileCutoffDate.getDate() - fileDays);

  const clearedCount = await db
    .update(runs)
    .set({ fileCoverage: null })
    .where(lte(runs.uploadedAt, fileCutoffDate))
    .returning({ id: runs.id });

  console.log(`Cleared file coverage for ${clearedCount.length} runs older than ${fileDays} days`);

  const deleteCutoffDate = new Date(now);
  deleteCutoffDate.setDate(deleteCutoffDate.getDate() - fullDays);

  const deletedRows = await db
    .delete(runs)
    .where(lte(runs.uploadedAt, deleteCutoffDate))
    .returning({ id: runs.id });

  console.log(`Deleted ${deletedRows.length} runs older than ${fullDays} days`);
}
