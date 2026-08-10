import { API_BASE_URL } from "../config/api";

// Bir ürünün son 3 alış fiyatını getirir (en yeniden en eskiye).
export async function getRecentPrices(fruitId) {
  const response = await fetch(`${API_BASE_URL}/price-history/${fruitId}`);

  if (!response.ok) {
    throw new Error("Fiyat geçmişi alınamadı");
  }

  return response.json();
}
