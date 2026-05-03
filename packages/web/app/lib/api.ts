export function apiUrl(path: string) {
  if (typeof window !== "undefined") return path;
  const base = process.env.BETTER_AUTH_URL || "http://localhost:3000";
  return `${base}${path}`;
}
