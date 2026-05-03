import { createAuthClient } from "better-auth/client";
import { apiKeyClient } from "@better-auth/api-key/client";
import { organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
  plugins: [
    apiKeyClient(),
    organizationClient(),
  ],
});
export const { signIn, signOut, useSession } = authClient;
