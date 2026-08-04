import { API_BASE_URL } from "../config/api";

/*
  ŞOFÖR'ün TOPLAMA görevi kapsamındaki toplama (Collection) isteklerini yapar.
  needListService.js / purchaseService.js ile aynı fetch + text->JSON parse
  deseni kullanılır (backend hata mesajlarını düz metin olarak da dönebiliyor).
*/

// Şoförün, kendisine atanmış bir TOPLAMA görevi için görebileceği güvenli plan detayını getirir.
export async function getCollectionPlanDetail(planId, driverId) {
  const response = await fetch(
    `${API_BASE_URL}/collections/plans/${planId}?driverId=${driverId}`
  );

  const responseText = await response.text();

  let data;

  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = responseText;
  }

  if (!response.ok) {
    throw new Error(typeof data === "string" ? data : "Toplama detayı alınamadı.");
  }

  return data;
}

// Bir planın tüm ürünleri için toplama kaydı oluşturur.
export async function createCollectionsForPlan(request) {
  const response = await fetch(`${API_BASE_URL}/collections/plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const responseText = await response.text();

  let data;

  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = responseText;
  }

  if (!response.ok) {
    throw new Error(typeof data === "string" ? data : "Toplama kaydı oluşturulamadı.");
  }

  return data;
}