import { API_BASE_URL } from "../config/api";

export async function getTasks(userId) {
  const response = await fetch(`${API_BASE_URL}/tasks?userId=${userId}`);

  if (!response.ok) {
    throw new Error("Görevler alınamadı.");
  }

  return response.json();
}

export async function startTask(id) {
  const response = await fetch(`${API_BASE_URL}/tasks/${id}/start`, {
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error("Görev başlatılamadı.");
  }

  return response.json();
}

// Şoförün TESLİMAT görevini tamamlar; backend gerekiyorsa yeni bir KABUL görevi atar.
export async function completeDelivery(id, driverId) {
  const response = await fetch(
    `${API_BASE_URL}/tasks/${id}/complete-delivery?driverId=${driverId}`,
    { method: "PATCH" }
  );

  const responseText = await response.text();

  let data;

  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = responseText;
  }

  if (!response.ok) {
    throw new Error(typeof data === "string" ? data : "Teslimat tamamlanamadı.");
  }

  return data;
}
