import * as SecureStore from "expo-secure-store";

/*
  JWT token'ı ve giriş yapan kullanıcı bilgisini cihazda güvenli (şifreli)
  şekilde saklayan/okuyan/silen yardımcı dosya.
  - httpClient.js sadece token'ı (getToken) okuyup her isteğe ekler.
  - App.js, uygulama açılışında loadSession ile oturumu geri yükler.
*/
const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

// Login başarılı olunca token + kullanıcı bilgisini cihaza kaydeder.
export async function saveSession(user, token) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

// httpClient.js'in her isteğe eklediği Authorization header'ı için token'ı okur.
export async function getToken() {
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

// Uygulama açılışında App.js'in kaydedilmiş oturumu geri yüklemesi için kullanılır.
// Token veya kullanıcı bilgisinden biri eksikse (hiç giriş yapılmamış/silinmiş) null döner.
export async function loadSession() {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const rawUser = await SecureStore.getItemAsync(USER_KEY);

  if (!token || !rawUser) {
    return null;
  }

  return { user: JSON.parse(rawUser), token };
}

// Logout'ta token + kullanıcı bilgisini cihazdan tamamen siler.
export async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}
