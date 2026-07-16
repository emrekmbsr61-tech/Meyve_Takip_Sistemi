//backend'e istek atacağım

// Backend'deki meyve listesini çekeceğim adres
const API_URL = "http://localhost:8080/api/fruits";

// Meyve listesini backend'den getirme
export async function getFruits() {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error("Meyve listesi alınamadı");
  }

  return await response.json();
}