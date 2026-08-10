import { API_BASE_URL } from "../config/api";

// Tüm ihtiyaç listelerini backend'den getirir.
export async function getNeedLists() {
  const response = await fetch(`${API_BASE_URL}/need-lists`);

  if (!response.ok) {
    throw new Error("İhtiyaç listeleri alınamadı");
  }

  return await response.json();
}

// Yeni ihtiyaç listesi oluşturur.
export async function createNeedList(needListData) {
  const response = await fetch(`${API_BASE_URL}/need-lists`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(needListData),
  });

  const responseText = await response.text();

  let data;

  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = responseText;
  }

  if (!response.ok) {
    throw new Error(data || "İhtiyaç listesi oluşturulamadı");
  }

  return data;
}

// ID'ye göre ihtiyaç listesini siler.
export async function deleteNeedList(id) {
  const response = await fetch(`${API_BASE_URL}/need-lists/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("İhtiyaç listesi silinemedi");
  }
}

/*
  YENİ ve güvenli plan oluşturma isteği: DeliveryPlan + tüm NeedList satırlarını
  backend'de tek seferde, tek transaction içinde oluşturur. planId burada
  GÖNDERİLMEZ — backend üretir. payload: { storeId, createdBy, generalNotes, items }
*/
export async function createNeedListPlan(payload) {
  const response = await fetch(`${API_BASE_URL}/need-lists/plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();

  let data;

  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = responseText;
  }

  if (!response.ok) {
    throw new Error(typeof data === "string" ? data : "İhtiyaç planı oluşturulamadı");
  }

  return data;
}

// Bir planı (tüm ürünleriyle birlikte) tek seferde iptal eder/siler.
export async function cancelNeedListPlan(planId, userId) {
  const response = await fetch(
    `${API_BASE_URL}/need-lists/plan/${planId}?userId=${userId}`,
    { method: "DELETE" }
  );

  const responseText = await response.text();

  let data;

  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = responseText;
  }

  if (!response.ok) {
    throw new Error(typeof data === "string" ? data : "Plan iptal edilemedi");
  }

  return data;
}

/*
  Müdürün, var olan bir plana ekstra ürün eklemesi için kullanılır. Yeni bir
  plan OLUŞTURMAZ — aynı planId'ye yeni ürün satırları ekler.
  payload: { managerId, items: [{ fruitId, requiredQuantity, notes }] }
*/
export async function addExtraItemsToPlan(planId, payload) {
  const response = await fetch(`${API_BASE_URL}/need-lists/plan/${planId}/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();

  let data;

  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = responseText;
  }

  if (!response.ok) {
    throw new Error(typeof data === "string" ? data : "Ekstra ürün eklenemedi");
  }

  return data;
}

// ID'ye göre ihtiyaç listesini günceller.
export async function updateNeedList(id, needListData) {
  const response = await fetch(`${API_BASE_URL}/need-lists/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(needListData),
  });

  const responseText = await response.text();

  let data;

  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = responseText;
  }

  if (!response.ok) {
    throw new Error(data || "İhtiyaç listesi güncellenemedi");
  }

  return data;
}
