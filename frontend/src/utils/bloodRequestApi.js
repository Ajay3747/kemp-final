const API_URL = "http://localhost:5000/api/blood-requests";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
};

async function handle(response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

export const createBloodRequest = (payload) =>
  fetch(API_URL, { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) }).then(handle);

export const listBloodRequests = () =>
  fetch(API_URL, { headers: authHeaders() }).then(handle);

export const getBloodRequest = (id) =>
  fetch(`${API_URL}/${id}`, { headers: authHeaders() }).then(handle);

export const getBloodRequestResponders = (id) =>
  fetch(`${API_URL}/${id}/responders`, { headers: authHeaders() }).then(handle);

export const respondToBloodRequest = (id) =>
  fetch(`${API_URL}/${id}/respond`, { method: "POST", headers: authHeaders() }).then(handle);

export const updateBloodRequestStatus = (id, status) =>
  fetch(`${API_URL}/${id}/status`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ status }) }).then(handle);
