import { apiRequest } from "./httpClient";

// MAGAZA_MUDURU için alımı henüz tamamlanmamış planları getirir.
export async function getPendingPurchasePlans(managerId) {
  return await apiRequest(`/purchases/pending-plans?managerId=${managerId}`, { method: "GET" });
}

// Seçilen planın ürünlerini ve ihtiyaç bilgilerini getirir.
export async function getPurchasePlanDetail(managerId, planId) {
  return await apiRequest(`/purchases/plans/${planId}?managerId=${managerId}`, { method: "GET" });
}

// Bir planın tüm ürünleri için alım kaydı oluşturur.
export async function createPurchasesForPlan(planId, createdBy, items) {
  return await apiRequest("/purchases/plan", {
    method: "POST",
    body: JSON.stringify({ planId, createdBy, items }),
  });
}
