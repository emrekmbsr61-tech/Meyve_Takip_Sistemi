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
  });

  client.onConnect = () => {
    client.subscribe(`/topic/notifications/${userId}`, (message) => {
      let payload;

      try {
        payload = JSON.parse(message.body);
      } catch {
        return;
      }

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

  listeners.clear();
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
