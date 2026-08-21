import { Platform } from "react-native";
import Constants from "expo-constants";

/*
  Backend'in adresi geliştirme sırasında SABİT DEĞİLDİR: bilgisayarın yerel IP'si
  ağ değiştiğinde (farklı Wi-Fi, hotspot, router yeniden başlaması) değişir.
  Bu adres buraya elle yazıldığında, IP her değiştiğinde uygulama eski adrese
  bağlanmaya çalışır ve "Baglanti hatasi: bilinmiyor" hatası alınır.

  Çözüm: adresi elle yazmak yerine Expo'nun bağlantı bilgisinden okuyoruz.
  Telefon uygulamanın kodunu hangi bilgisayardan indiriyorsa, backend de o
  bilgisayarda çalışıyordur - tek fark port numarasıdır
  (Metro: 8081, backend: 8080).
*/

/*
  Expo'nun bağlantı bilgisinden bilgisayarın IP'sini çıkarır.
  hostUri örneği: "10.219.244.215:8081"

  Neden expo-constants: Aynı bilgi React Native'in getDevServer'ında da var ama
  oraya ancak "react-native/Libraries/..." gibi derin bir yolla erişilebiliyor
  ve o yol kullanımdan kaldırılıyor (deep import uyarısı). expo-constants bunun
  resmi ve kalıcı karşılığıdır.

  Yayınlanmış (production) derlemede hostUri bulunmaz; o durumda null döner ve
  aşağıdaki yedek adres kullanılır.
*/
function resolveDevHost() {
  const hostUri =
    Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost;

  if (typeof hostUri !== "string") {
    return null;
  }

  const host = hostUri.split(":")[0];

  return host || null;
}

const devHost = resolveDevHost();

/*
  Adres seçim sırası:
    1) EXPO_PUBLIC_API_URL tanımlıysa her zaman o kullanılır (elle geçersiz kılma).
    2) Expo'dan IP okunabildiyse o IP + 8080 (normal geliştirme durumu).
    3) Okunamadıysa: Android emülatöründe 10.0.2.2 bilgisayarın localhost'udur,
       diğer durumlarda düz localhost.
*/
const autoBaseUrl = devHost
  ? `http://${devHost}:8080/api`
  : Platform.OS === "android"
    ? "http://10.0.2.2:8080/api"
    : "http://localhost:8080/api";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || autoBaseUrl;

export const API_SERVER_URL = API_BASE_URL.replace(/\/api$/, "");

/*
  Uygulama açılışında hangi adrese bağlanılacağı Expo konsoluna yazılır.
  Bağlantı sorunlarında ilk bakılacak yer burasıdır: adres beklediğin IP değilse
  sorun backend'de değil, adres çözümlemesindedir.
*/
console.log("[API] Backend adresi:", API_BASE_URL);
