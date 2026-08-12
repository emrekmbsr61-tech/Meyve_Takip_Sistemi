import { apiRequest } from "./httpClient";

/*
  Sistemdeki tüm işlem kayıtlarını (AuditLog) getirir. Sadece ADMIN
  ekranından çağrılır (bkz. pages/AdminAuditLog).
*/
export async function getAuditLogs() {
  const data = await apiRequest("/audit-logs");
  return Array.isArray(data) ? data : [];
}
