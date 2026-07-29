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
