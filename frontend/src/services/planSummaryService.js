import { apiRequest } from "./httpClient";

/*
  Bir planın İhtiyaç -> Alım -> Toplama -> Kabul miktar karşılaştırma özetini
  getirir.
*/
export async function getPlanSummary(planId, userId) {
  return await apiRequest(`/plans/${planId}/summary?userId=${userId}`);
}
