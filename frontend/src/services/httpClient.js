import { API_BASE_URL } from "../config/api";
import { getToken } from "./tokenStorage";

/*
  Bütün servis dosyalarının (authService.js, needListService.js, ...)
  ortak kullandığı tek fetch fonksiyonu. Her istek çıkmadan önce, cihazda
  kayıtlı bir token varsa otomatik olarak "Authorization: Bearer <token>"
  header'ını ekler — böylece her servis dosyasında bunu tek tek yazmaya
  gerek kalmaz.

  path: API_BASE_URL'den SONRAKİ kısım, örn: "/need-lists" veya "/auth/login".
  options: fetch'in ikinci parametresiyle aynı (method, body, ekstra header vs).

  Cevap okuma mantığı, projede daha önce her dosyada tekrar eden desenle
  birebir aynı: text -> JSON.parse dene -> olmazsa düz metin kabul et.
*/
export async function apiRequest(path, options = {}) {
  const token = await getToken();

  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const responseText = await response.text();

  let data;

  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = responseText;
  }

  if (!response.ok) {
    throw new Error(typeof data === "string" && data ? data : "İstek başarısız oldu");
  }

  return data;
}
