import { apiRequest } from "../../services/httpClient";

// Meyve listesini backend'den getirme
export async function getFruits() {
  return await apiRequest("/fruits");
}
