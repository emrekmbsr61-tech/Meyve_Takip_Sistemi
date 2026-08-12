import { apiRequest } from "./httpClient";

// Onay bekleyen (PENDING rolündeki) kullanıcıları getirir. Sadece ADMIN çağırabilir.
export async function getPendingUsers(adminId) {
  return await apiRequest(`/users/pending?adminId=${adminId}`, { method: "GET" });
}

// Bir kullanıcıya rol atar (onaylar). Sadece ADMIN çağırabilir.
export async function assignUserRole(adminId, userId, role) {
  return await apiRequest(`/users/${userId}/role`, {
    method: "PUT",
    body: JSON.stringify({ adminId, role }),
  });
}
