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

// Backend'in düz text veya JSON dönebilen cevabını ortak şekilde okur.
async function parseResponse(response) {
  const responseText = await response.text();

  let data;

  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = responseText;
  }

  return data;
}

// Kayıt isteğini backend'e gönderir. Backend'deki RegisterRequest ile birebir eşleşir.
export async function register({ fullName, username, email, password, passwordRepeat }) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fullName,
      username,
      email,
      password,
      passwordRepeat,
    }),
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(typeof data === "string" ? data : "Kayıt başarısız");
  }

  // Kayıt başarılıysa RegisterResponse döner.
  return data;
}

// E-posta doğrulama kodunu backend'e gönderir.
export async function verifyEmail(email, code) {
  const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      code,
    }),
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(typeof data === "string" ? data : "Doğrulama başarısız");
  }

  // Başarılıysa backend sade bir Türkçe metin döner.
  return data;
}

// Doğrulama kodunun tekrar gönderilmesini backend'den ister.
export async function resendVerification(email) {
  const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
    }),
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(typeof data === "string" ? data : "Kod tekrar gönderilemedi");
  }

  return data;
}
