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

/*
  Personelin, kendisine atanan serbest görevi (GENEL) tamamlamasını sağlar.
  Akış görevleri (alım/toplama/teslimat/kabul) buradan tamamlanamaz; onlar
  asıl işin kaydı girilince kendiliğinden tamamlanır.
*/
export async function completeManualTask(id, userId) {
  return await apiRequest(`/tasks/${id}/complete?userId=${userId}`, { method: "PATCH" });
}

/*
  "Tamamlanan İşlemler" ekranı için tamamlanmış serbest görevleri getirir.
  Müdür kendi atadıklarını, ADMIN hepsini görür.
*/
export async function getCompletedTasks(userId) {
  return await apiRequest(`/tasks/completed?userId=${userId}`);
}

// Müdürün görev atayabileceği personelleri (mağaza personeli + şoför) getirir.
export async function getAssignableUsers(managerId) {
  return await apiRequest(`/tasks/assignable-users?managerId=${managerId}`);
}

/*
  Müdürün elle görev atamasını backend'e gönderir.
  payload: { managerId, assignedUserId, title, durationHours }
  planId GÖNDERİLMEZ - bu görevler bir ihtiyaç planına bağlı değildir.
*/
export async function createManualTask(payload) {
  return await apiRequest("/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
