const API_URL = "http://localhost:5000/api/ratings";

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

export const submitRating = (orderId, rating, review) =>
  fetch(API_URL, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ orderId, rating, review })
  }).then(handle);

export const updateRating = (ratingId, rating, review) =>
  fetch(`${API_URL}/${ratingId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ rating, review })
  }).then(handle);

export const getMyRatings = () =>
  fetch(`${API_URL}/mine`, { headers: authHeaders() }).then(handle);

export const getSellerRatings = (sellerId) =>
  fetch(`${API_URL}/seller/${sellerId}`).then(handle);

export const getSellersRatingSummary = (sellerIds) => {
  const ids = Array.from(new Set(sellerIds.filter(Boolean)));
  if (ids.length === 0) return Promise.resolve({});
  return fetch(`${API_URL}/summary?sellerIds=${ids.join(",")}`).then(handle);
};
