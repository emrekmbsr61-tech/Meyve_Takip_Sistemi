// Backend ana adresidir.
import { API_BASE_URL } from "../config/api";

// Backend'in düz text veya JSON dönebilen cevabını ortak şekilde okur.
async function parseResponse(response) {
  const responseText = await response.text();

  let data;

  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = responseText;
  }

  return data;
}

// MAGAZA_MUDURU için alımı henüz tamamlanmamış planları getirir.
export async function getPendingPurchasePlans(managerId) {
  const response = await fetch(
    `${API_BASE_URL}/purchases/pending-plans?managerId=${managerId}`,
    { method: "GET" }
  );

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      typeof data === "string" ? data : "Bekleyen alım planları alınamadı"
    );
  }

  return data;
}

// Seçilen planın ürünlerini ve ihtiyaç bilgilerini getirir.
export async function getPurchasePlanDetail(managerId, planId) {
  const response = await fetch(
    `${API_BASE_URL}/purchases/plans/${planId}?managerId=${managerId}`,
    { method: "GET" }
  );

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(typeof data === "string" ? data : "Plan bilgisi alınamadı");
  }

  return data;
}

// Bir planın tüm ürünleri için alım kaydı oluşturur.
export async function createPurchasesForPlan(planId, createdBy, items) {
  const response = await fetch(`${API_BASE_URL}/purchases/plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      planId,
      createdBy,
      items,
    }),
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(typeof data === "string" ? data : "Alım kaydı oluşturulamadı");
  }

  return data;
}
