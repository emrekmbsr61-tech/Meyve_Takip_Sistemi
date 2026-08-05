import { API_BASE_URL } from "../config/api";

/*
  Sistemdeki tüm işlem kayıtlarını (AuditLog) getirir. Sadece ADMIN
  ekranından çağrılır (bkz. pages/AdminAuditLog). planSummaryService.js
  ile aynı fetch + text->JSON parse deseni kullanılır.
*/
export async function getAuditLogs() {
  const response = await fetch(`${API_BASE_URL}/audit-logs`);

  const responseText = await response.text();

  let data;

  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = responseText;
  }

  if (!response.ok) {
    throw new Error(typeof data === "string" ? data : "İşlem kayıtları alınamadı.");
  }

  return Array.isArray(data) ? data : [];
}
