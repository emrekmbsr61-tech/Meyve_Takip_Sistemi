import { API_BASE_URL } from "../config/api";

export async function createAcceptance(payload) {
  const response = await fetch(`${API_BASE_URL}/acceptances`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  const data = responseText ? JSON.parse(responseText) : null;

  if (!response.ok) {
    throw new Error(data?.message || "Mal kabul kaydedilemedi.");
  }

  return data;
}

/*
  Kabul ekranının kaydetmeden ÖNCE göstereceği "beklenen miktar" listesini
  getirir. Bu değer toplanan (Collection) miktardır, ihtiyacın ilk istenen
  miktarı DEĞİL — backend'in create() sırasında kabul edeceği üst sınırla
  birebir aynı kaynaktır (bkz. AcceptanceService.getAcceptanceChecklist).
*/
export async function getAcceptanceChecklist(planId, userId) {
  const response = await fetch(`${API_BASE_URL}/acceptances/checklist/${planId}?userId=${userId}`);

  const responseText = await response.text();
  const data = responseText ? JSON.parse(responseText) : null;

  if (!response.ok) {
    throw new Error(data?.message || "Kabul listesi alınamadı.");
  }

  return data;
}

// "Tamamlanan İşlemler" ekranı için geçmiş mal kabul kayıtlarını getirir.
export async function getCompletedAcceptances(userId) {
  const response = await fetch(`${API_BASE_URL}/acceptances/completed?userId=${userId}`);

  const responseText = await response.text();
  const data = responseText ? JSON.parse(responseText) : null;

  if (!response.ok) {
    throw new Error(data?.message || "Tamamlanan mal kabuller alınamadı.");
  }

  return data;
}
