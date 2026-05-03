import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL!;

// Create the drizzle instance immediately (synchronous)
export const db = drizzle({
  schema,
  connection: { 
    connectionString: databaseUrl,
    // Add connection timeout
    connectionTimeoutMillis: 5000,
  },
});

// Configuration for connection retries
const RETRY_CONFIG = {
  maxRetries: 10,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Function to test database connection with retry logic
export async function testConnectionWithRetry(
  attempt: number = 1,
  delay: number = RETRY_CONFIG.initialDelayMs
): Promise<void> {
  try {
    console.log(`[DB] Testing database connection (attempt ${attempt}/${RETRY_CONFIG.maxRetries})...`);
    
    // Test the connection with a simple query
    await db.query.projects.findFirst();
    
    console.log("[DB] Database connection established successfully");
  } catch (error) {
    console.error(`[DB] Connection attempt ${attempt} failed:`, error);
    
    if (attempt >= RETRY_CONFIG.maxRetries) {
      console.error(`[DB] Max retries (${RETRY_CONFIG.maxRetries}) exceeded. Giving up.`);
      throw new Error(
        `Failed to connect to database after ${RETRY_CONFIG.maxRetries} attempts. ` +
        `Last error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Calculate next delay with exponential backoff
    const nextDelay = Math.min(
      delay * RETRY_CONFIG.backoffMultiplier,
      RETRY_CONFIG.maxDelayMs
    );

    console.log(`[DB] Retrying in ${delay}ms...`);
    await sleep(delay);
    
    return testConnectionWithRetry(attempt + 1, nextDelay);
  }
}

// Run the connection test when the module loads (but don't block)
testConnectionWithRetry().catch((error) => {
  console.error("[DB] Failed to connect to database:", error);
  // Don't exit - let the app handle this gracefully
});

console.log("[DB] Database module initialized");
