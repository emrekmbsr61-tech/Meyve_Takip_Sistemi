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

/*
  Token'ın süresinin dolup dolmadığına bakar. İmzayı DOĞRULAMAZ - o backend'in
  işidir (bkz. JwtService.isTokenValid). Buradaki tek amaç şu: süresi dolmuş bir
  token'la uygulamanın "girişliyim" sanarak açılmasını engellemek.

  Neden gerekli: Süresi dolmuş token'la açılan uygulama normal görünür ama
  arka planda her HTTP isteği ve WebSocket bağlantısı sessizce reddedilir
  ("STOMP hatasi ... clientInboundChannel"). Kullanıcı sebebini anlayamaz,
  elle çıkış yapması gerektiğini bilemez.

  Token çözülemezse "süresi dolmamış" kabul edilir - emin olmadığımız bir
  durumda kullanıcıyı oturumdan atmayız.
*/
const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/*
  Base64 metni çözer. Ortamdaki atob'a bilerek güvenilmez: React Native
  sürümüne göre bulunmayabilir ve o durumda süre kontrolü sessizce hiç
  çalışmaz. JWT içeriği (sub, role, iat, exp) düz ASCII olduğu için bu
  basit çözücü yeterlidir.
*/
function decodeBase64(input) {
  let output = "";
  let buffer = 0;
  let bits = 0;

  for (const character of input) {
    if (character === "=") {
      break;
    }

    const value = BASE64_CHARS.indexOf(character);

    if (value === -1) {
      continue;
    }

    buffer = (buffer << 6) | value;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  return output;
}

function isTokenExpired(token) {
  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return false;
    }

    // JWT base64url kullanır; standart base64 alfabesine çevrilir.
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");

    const claims = JSON.parse(decodeBase64(base64));

    if (!claims.exp) {
      return false;
    }

    // exp saniye cinsindendir, Date.now() milisaniye döner.
    return claims.exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}

// Uygulama açılışında App.js'in kaydedilmiş oturumu geri yüklemesi için kullanılır.
// Token veya kullanıcı bilgisinden biri eksikse (hiç giriş yapılmamış/silinmiş) null döner.
export async function loadSession() {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const rawUser = await SecureStore.getItemAsync(USER_KEY);

  if (!token || !rawUser) {
    return null;
  }

  // Süresi dolmuş token'la devam edilmez: oturum temizlenir, Login ekranı açılır.
  if (isTokenExpired(token)) {
    await clearSession();
    return null;
  }

  return { user: JSON.parse(rawUser), token };
}

// Logout'ta token + kullanıcı bilgisini cihazdan tamamen siler.
export async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}
