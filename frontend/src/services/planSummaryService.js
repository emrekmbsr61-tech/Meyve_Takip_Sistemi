import { API_BASE_URL } from "../config/api";

/*
  Bir planın İhtiyaç -> Alım -> Toplama -> Kabul miktar karşılaştırma özetini
  getirir. needListService.js ile aynı fetch + text->JSON parse deseni kullanılır.
*/
export async function getPlanSummary(planId, userId) {
  const response = await fetch(
    `${API_BASE_URL}/plans/${planId}/summary?userId=${userId}`
  );

  const responseText = await response.text();

  let data;

  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = responseText;
  }

  if (!response.ok) {
    throw new Error(typeof data === "string" ? data : "Plan sonuç özeti alınamadı.");
  }

  return data;
}