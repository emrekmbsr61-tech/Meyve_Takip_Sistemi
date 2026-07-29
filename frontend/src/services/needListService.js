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
