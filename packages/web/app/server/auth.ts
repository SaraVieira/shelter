import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { apiKey } from "@better-auth/api-key";
import { organization } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "../db";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  socialProviders: {
    github: {
      clientId: process.env.BETTER_AUTH_GITHUB_ID!,
      clientSecret: process.env.BETTER_AUTH_GITHUB_SECRET!,
    },
  },
  emailAndPassword: {
    enabled: false,
  },
  plugins: [apiKey(), organization(), tanstackStartCookies()],
});

import "./cron";
