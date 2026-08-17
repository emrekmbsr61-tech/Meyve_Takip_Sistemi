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
    throw new Error(extractErrorMessage(data));
  }

  return data;
}

/*
  Backend hata cevabından kullanıcıya gösterilecek mesajı çıkarır.

  Backend artık tüm hataları tek merkezden (GlobalExceptionHandler) şu biçimde
  döndürüyor: { timestamp, status, error, message, path }. Bu yüzden önce
  nesnenin "message" alanına bakılır. Eski/düz metin dönen bir cevap gelirse
  (ör. Spring'in kendi varsayılan hataları) o da desteklenmeye devam eder.
*/
function extractErrorMessage(data) {
  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data && typeof data === "object") {
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }

    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
  }

  return "İstek başarısız oldu";
}
