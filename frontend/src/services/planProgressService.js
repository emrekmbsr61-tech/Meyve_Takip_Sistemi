import { apiRequest } from "./httpClient";

/*
  Tamamlanmamış planların ŞU AN hangi aşamada beklediğini getirir
  ("Devam Eden İşlemler" ekranı).

  planSummaryService ile karıştırılmamalı: orası BİTMİŞ bir planın miktar
  karşılaştırmasıdır; burası devam eden planın konumudur.
*/
export async function getInProgressPlans(userId) {
  return await apiRequest(`/delivery-plans/in-progress?userId=${userId}`);
}
