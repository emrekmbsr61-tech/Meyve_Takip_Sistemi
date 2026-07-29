// Backend ana adresidir.
import { API_BASE_URL } from "../config/api";

// Login isteğini backend'e gönderir.
export async function login(username, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },

    // Backend'deki LoginRequest sınıfına gidecek veri.
    body: JSON.stringify({
      username: username,
      password: password,
    }),
  });

  // Backend bazen hata mesajını düz text olarak dönebilir.
  const responseText = await response.text();

  let data;

  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = responseText;
  }

  // Login başarısızsa hata yollar.
  if (!response.ok) {
    throw new Error(data || "Login başarısız");
  }

  // Login başarılıysa LoginResponse döner.
  return data; 
  
}
