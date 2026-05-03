export function apiUrl(path: string) {
  if (typeof window !== "undefined") return path;
  const base = process.env.BETTER_AUTH_URL || "http://localhost:3000";
  return `${base}${path}`;
}

export const fetchFromAPI = async (path: string, options?: RequestInit) => {
  const res = await fetch(apiUrl(path), options);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || json.error || "API request failed");
  }
  return json.data;
};
