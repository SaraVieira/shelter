import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { apiKey } from "@better-auth/api-key";
import { organization } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { createAccessControl } from "better-auth/plugins/access";
import { db } from "../db";

// Define access control statements for organization roles
const statements = {
  apiKey: ["create", "read", "update", "delete"],
  project: ["create", "read", "update", "delete"],
} as const;

const ac = createAccessControl(statements);

// Define roles with their permissions
const ownerRole = ac.newRole({
  apiKey: ["create", "read", "update", "delete"],
  project: ["create", "read", "update", "delete"],
});

const adminRole = ac.newRole({
  apiKey: ["create", "read", "update", "delete"],
  project: ["create", "read", "update", "delete"],
});

const memberRole = ac.newRole({
  apiKey: ["create", "read"],
  project: ["create", "read"],
});

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
  // CSRF Protection is enabled by default with tanstackStartCookies
  // Additional security settings
  advanced: {
    // Use secure cookies in production
    useSecureCookies: process.env.NODE_ENV === "production",
    // Disable CSRF for API key authenticated requests (they use Authorization header)
    disableCSRFCheck: false, // Keep CSRF enabled for session-based requests
  },
  plugins: [
    apiKey({
      // Configure API keys to be organization-owned
      // This makes the plugin properly handle organizationId
      references: "organization",
    }), 
    organization({
      ac,
      roles: {
        owner: ownerRole,
        admin: adminRole,
        member: memberRole,
      },
    }), 
    tanstackStartCookies()
  ],
});

import "./cron";
