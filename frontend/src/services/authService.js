import { apiRequest } from "./httpClient";
import { saveSession } from "./tokenStorage";

/*
  Login isteğini backend'e gönderir. Başarılıysa dönen token + kullanıcı
  bilgisini cihaza kaydeder (App.js açılışta bunu geri yükler) ve token'ı
  ÇIKARARAK sade kullanıcı nesnesini döner - token uygulama state'inde/
  ekranlar arası prop olarak dolaşmaz, sadece SecureStore'da kalır.
*/
export async function login(username, password) {
  const data = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  const { token, ...user } = data;

  if (token) {
    await saveSession(user, token);
  }

  return user;
}

// Kayıt isteğini backend'e gönderir. Backend'deki RegisterRequest ile birebir eşleşir.
export async function register({ fullName, username, email, password, passwordRepeat }) {
  return await apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({ fullName, username, email, password, passwordRepeat }),
  });
}

// E-posta doğrulama kodunu backend'e gönderir.
export async function verifyEmail(email, code) {
  return await apiRequest("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });
}

// Doğrulama kodunun tekrar gönderilmesini backend'den ister.
export async function resendVerification(email) {
  return await apiRequest("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}
