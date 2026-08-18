import { Client } from "@stomp/stompjs";
import { API_SERVER_URL } from "../config/api";

/*
  Uygulama genelinde TEK bir WebSocket bağlantısını yöneten merkezi servis.
  Her ekran kendi bağlantısını açmaz - App.js login sonrası connect(), logout'ta
  disconnect() çağırır. Ekranlar sadece addNotificationListener() ile "bir
  bildirim geldiğinde beni haberdar et" der (bkz. pages/ActiveTasks/index.js).

  Backend'deki karşılığı: config/WebSocketConfig.java (/ws adresi) ve
  notification/NotificationService.java (/topic/notifications/{userId}).
*/
let client = null;
const listeners = new Set();

// Bağlantının o anki durumu; sorun ararken faydalıdır (bkz. isConnected).
let connected = false;

// token: HTTP isteklerinde kullandığımız aynı JWT. userId: kullanıcının kendi
// bildirim adresine (/topic/notifications/{userId}) abone olmak için gerekli.
export function connect(token, userId) {
  if (client) {
    return;
  }

  const wsUrl = `${API_SERVER_URL.replace(/^http/, "ws")}/ws`;

  client = new Client({
    webSocketFactory: () => new WebSocket(wsUrl),
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnectDelay: 5000,

    /*
      ---- REACT NATIVE İÇİN ZORUNLU İKİ AYAR ----

      React Native'in WebSocket uygulamasında "null chopping" denen bir hata
      vardır: STOMP protokolünün paket sonunu belirten NULL karakterini metin
      paketlerinden siler. Bunun sonucunda paketler geçersiz hale gelir ve
      bağlantı HİÇBİR HATA VERMEDEN sessizce kurulamaz; kütüphane sürekli
      yeniden bağlanmayı dener ama mesajlar asla ulaşmaz.

      forceBinaryWSFrames    : giden paketleri ikili (binary) biçimde gönderir,
                               böylece NULL karakteri korunur.
      appendMissingNULLonIncoming: gelen paketlerdeki eksik NULL karakterini
                               tamamlar.

      Kaynak: stomp-js resmi dokümanı, "React Native - Additional notes".
      Bu ayarlar olmadan bildirimler çalışmaz
    */
    forceBinaryWSFrames: true,
    appendMissingNULLonIncoming: true,

    /*
      Hata ayıklama: Önceden bağlantı sorunları tamamen sessizdi, bu yüzden
      bildirimlerin neden gelmediği anlaşılamıyordu. Artık her sorun Expo
      konsoluna yazılır.
    */
    onStompError: (frame) => {
      connected = false;
      console.warn("[WebSocket] STOMP hatasi:", frame.headers?.message, frame.body);
    },

    onWebSocketError: (event) => {
      connected = false;
      console.warn("[WebSocket] Baglanti hatasi:", event?.message || "bilinmiyor");
    },

    onWebSocketClose: () => {
      connected = false;
      console.log("[WebSocket] Baglanti kapandi, yeniden denenecek.");
    },
  });

  client.onConnect = () => {
    connected = true;
    console.log("[WebSocket] Baglandi. Dinlenen adres: /topic/notifications/" + userId);

    client.subscribe(`/topic/notifications/${userId}`, (message) => {
      let payload;

      try {
        payload = JSON.parse(message.body);
      } catch {
        return;
      }

      console.log("[WebSocket] Bildirim geldi:", payload?.type);

      listeners.forEach((listener) => listener(payload));
    });
  };

  client.activate();
}

export function disconnect() {
  if (client) {
    client.deactivate();
    client = null;
  }

  connected = false;
  listeners.clear();
}

// Bağlantı kurulu mu? Sorun ararken ekranda göstermek için kullanılabilir.
export function isConnected() {
  return connected;
}

/*
  Bir ekran, gelen HER bildirimi ({ type, message }) almak için bunu çağırır.
  Dönen fonksiyon, dinlemeyi bırakmak için useEffect'in cleanup'ında
  çağrılmalıdır - örnek kullanım: pages/ActiveTasks/index.js.
*/
export function addNotificationListener(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
