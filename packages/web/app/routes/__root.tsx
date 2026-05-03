import {
  createRootRouteWithContext,
  Outlet,
  HeadContent,
  Scripts,
  redirect,
} from "@tanstack/react-router";
import { getSession } from "../server/auth-helpers";
import "../app.css";
import { ThemeProvider } from "@/components/theme-provider";

type SessionResult = Awaited<ReturnType<typeof getSession>>;

interface RouterContext {
  auth: SessionResult;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ location }) => {
    const result = await getSession();
    if (!result.session && location.pathname !== "/login") {
      throw redirect({ to: "/login" });
    }
    return { auth: result };
  },
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider defaultTheme="system" storageKey="theme">
          <Outlet />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
