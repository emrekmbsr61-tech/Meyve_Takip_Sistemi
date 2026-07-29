//backend'e istek atacağım

// Backend'deki meyve listesini çekeceğim adres
import { API_BASE_URL } from "../../config/api";

const API_URL = `${API_BASE_URL}/fruits`;

// Meyve listesini backend'den getirme
export async function getFruits() {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error("Meyve listesi alınamadı");
  }

  return await response.json();
}
