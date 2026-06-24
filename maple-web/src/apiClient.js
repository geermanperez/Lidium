const API_URL = import.meta.env.VITE_API_URL || "https://apims.redly.com.ar";

function getToken() {
  return localStorage.getItem("maple_token");
}

function saveToken(token) {
  if (token) localStorage.setItem("maple_token", token);
  else localStorage.removeItem("maple_token");
}

async function request(path, options = {}) {
  const { silent = false, ...fetchOptions } = options;
  const headers = options.headers || {};
  headers["Content-Type"] = headers["Content-Type"] || "application/json";

  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = `${API_URL}${path}`;
  const res = await fetch(url, { ...fetchOptions, headers });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    if (!silent) {
      console.error(`API request failed: ${url}`, { status: res.status, body });
    }
    const err = new Error(body?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export { API_URL, getToken, saveToken, request };
