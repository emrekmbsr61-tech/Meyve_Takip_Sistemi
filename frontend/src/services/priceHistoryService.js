import { apiRequest } from "./httpClient";

// Bir ürünün son 3 alış fiyatını getirir (en yeniden en eskiye).
export async function getRecentPrices(fruitId) {
  return await apiRequest(`/price-history/${fruitId}`);
}
