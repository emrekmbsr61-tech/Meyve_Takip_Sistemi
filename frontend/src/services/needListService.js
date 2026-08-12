import { apiRequest } from "./httpClient";

// Tüm ihtiyaç listelerini backend'den getirir.
export async function getNeedLists() {
  return await apiRequest("/need-lists");
}

// Yeni ihtiyaç listesi oluşturur.
export async function createNeedList(needListData) {
  return await apiRequest("/need-lists", {
    method: "POST",
    body: JSON.stringify(needListData),
  });
}

// ID'ye göre ihtiyaç listesini siler.
export async function deleteNeedList(id) {
  return await apiRequest(`/need-lists/${id}`, { method: "DELETE" });
}

/*
  YENİ ve güvenli plan oluşturma isteği: DeliveryPlan + tüm NeedList satırlarını
  backend'de tek seferde, tek transaction içinde oluşturur. planId burada
  GÖNDERİLMEZ — backend üretir. payload: { storeId, createdBy, generalNotes, items }
*/
export async function createNeedListPlan(payload) {
  return await apiRequest("/need-lists/plan", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Bir planı (tüm ürünleriyle birlikte) tek seferde iptal eder/siler.
export async function cancelNeedListPlan(planId, userId) {
  return await apiRequest(`/need-lists/plan/${planId}?userId=${userId}`, { method: "DELETE" });
}

/*
  Müdürün, var olan bir plana ekstra ürün eklemesi için kullanılır. Yeni bir
  plan OLUŞTURMAZ — aynı planId'ye yeni ürün satırları ekler.
  payload: { managerId, items: [{ fruitId, requiredQuantity, notes }] }
*/
export async function addExtraItemsToPlan(planId, payload) {
  return await apiRequest(`/need-lists/plan/${planId}/items`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ID'ye göre ihtiyaç listesini günceller.
export async function updateNeedList(id, needListData) {
  return await apiRequest(`/need-lists/${id}`, {
    method: "PUT",
    body: JSON.stringify(needListData),
  });
}
