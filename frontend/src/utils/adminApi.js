const ADMIN_API_BASE = 'http://localhost:5000/api/admin';

// Thin wrapper shared by every Admin Control Center page: attaches the admin
// JWT, and throws with the server's message on a non-OK response so callers
// can just try/catch.
export async function adminFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${ADMIN_API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }
  return data;
}
