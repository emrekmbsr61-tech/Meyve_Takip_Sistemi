//backend'e istek atacağım

// Backend'deki meyve listesini çekeceğim adres
const API_URL = "http://10.0.2.2:8080/api/fruits";

// Meyve listesini backend'den getirme
export async function getFruits() {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error("Meyve listesi alınamadı");
  }

  return await response.json();
}