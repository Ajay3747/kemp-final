const API_URL = "http://localhost:5000/api/orders";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
};

export const getMyWarranties = () =>
  fetch(`${API_URL}/warranties/mine`, { headers: authHeaders() }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to load warranties");
    return data;
  });
