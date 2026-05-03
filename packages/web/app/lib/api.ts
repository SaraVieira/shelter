export function apiUrl(path: string) {
  if (typeof window !== "undefined") return path;
  const base = process.env.BETTER_AUTH_URL || "http://localhost:3000";
  return `${base}${path}`;
}

export const fetchFromAPI = async (path: string, options?: RequestInit) => {
  const res = await fetch(apiUrl(path), options);
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "API request failed");
  }
  console.log("API response data:", await res.clone().json());
  return res.json();
};
