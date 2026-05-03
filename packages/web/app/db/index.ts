import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL!;

export const db = drizzle({
  schema,
  connection: { connectionString: databaseUrl },
});
