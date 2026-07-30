// Backend ana adresidir.
import { API_BASE_URL } from "../config/api";

// Alım ekranında seçilebilecek aktif tedarikçileri getirir.
export async function getActiveSuppliers() {
  const response = await fetch(`${API_BASE_URL}/suppliers/active`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Tedarikçi listesi alınamadı");
  }

  return response.json();
}
