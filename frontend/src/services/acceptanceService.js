import { apiRequest } from "./httpClient";

export async function createAcceptance(payload) {
  return await apiRequest("/acceptances", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/*
  Kabul ekranının kaydetmeden ÖNCE göstereceği "beklenen miktar" listesini
  getirir (bkz. AcceptanceService.getAcceptanceChecklist).
*/
export async function getAcceptanceChecklist(planId, userId) {
  return await apiRequest(`/acceptances/checklist/${planId}?userId=${userId}`);
}

// "Tamamlanan İşlemler" ekranı için geçmiş mal kabul kayıtlarını getirir.
export async function getCompletedAcceptances(userId) {
  return await apiRequest(`/acceptances/completed?userId=${userId}`);
}
