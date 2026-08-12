import { apiRequest } from "./httpClient";

// Alım ekranında seçilebilecek aktif tedarikçileri getirir.
export async function getActiveSuppliers() {
  return await apiRequest("/suppliers/active", { method: "GET" });
}
