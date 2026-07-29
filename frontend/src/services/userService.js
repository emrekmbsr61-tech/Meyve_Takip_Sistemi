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

// Onay bekleyen (PENDING rolündeki) kullanıcıları getirir. Sadece ADMIN çağırabilir.
export async function getPendingUsers(adminId) {
  const response = await fetch(
    `${API_BASE_URL}/users/pending?adminId=${adminId}`,
    { method: "GET" }
  );

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      typeof data === "string" ? data : "Onay bekleyen kullanıcılar alınamadı"
    );
  }

  return data;
}

// Bir kullanıcıya rol atar (onaylar). Sadece ADMIN çağırabilir.
export async function assignUserRole(adminId, userId, role) {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      adminId,
      role,
    }),
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      typeof data === "string" ? data : "Rol ataması yapılamadı"
    );
  }

  return data;
}
