import { apiRequest } from "./httpClient";

export async function getTasks(userId) {
  return await apiRequest(`/tasks?userId=${userId}`);
}

export async function startTask(id) {
  return await apiRequest(`/tasks/${id}/start`, { method: "PATCH" });
}

// Şoförün TESLİMAT görevini tamamlar; backend gerekiyorsa yeni bir KABUL görevi atar.
export async function completeDelivery(id, driverId) {
  return await apiRequest(`/tasks/${id}/complete-delivery?driverId=${driverId}`, { method: "PATCH" });
}
