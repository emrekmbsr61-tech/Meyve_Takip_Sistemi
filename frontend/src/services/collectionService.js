import { apiRequest } from "./httpClient";

/*
  ŞOFÖR'ün TOPLAMA görevi kapsamındaki toplama (Collection) isteklerini yapar.
*/

// Şoförün, kendisine atanmış bir TOPLAMA görevi için görebileceği güvenli plan detayını getirir.
export async function getCollectionPlanDetail(planId, driverId) {
  return await apiRequest(`/collections/plans/${planId}?driverId=${driverId}`);
}

// Şoförün Teslimat Görevi ekranında göreceği, kendi topladığı ürün/miktar özetini getirir.
export async function getDeliverySummary(planId, driverId) {
  return await apiRequest(`/collections/plans/${planId}/delivery-summary?driverId=${driverId}`);
}

// Bir planın tüm ürünleri için toplama kaydı oluşturur.
export async function createCollectionsForPlan(request) {
  return await apiRequest("/collections/plan", {
    method: "POST",
    body: JSON.stringify(request),
  });
}
