const rawApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "";

const apiBaseUrl = rawApiBaseUrl.replace(/\/+$/, "");

export function getApiUrl(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error(`API path must start with '/'. Received: ${path}`);
  }

  if (!apiBaseUrl) {
    return path;
  }

  return `${apiBaseUrl}${path}`;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const url = getApiUrl(path);
  const headers = new Headers(init.headers);

  if (url.includes("ngrok")) {
    headers.set("ngrok-skip-browser-warning", "true");
  }

  return fetch(url, { ...init, headers });
}
