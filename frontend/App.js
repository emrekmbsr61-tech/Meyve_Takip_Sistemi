import { useEffect, useState } from "react";

import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

// Uygulama açılışında kayıtlı oturumu (token + kullanıcı) geri yüklemek için.
import { loadSession, clearSession, getToken } from "./src/services/tokenStorage";

// Gerçek zamanlı bildirimler için merkezi WebSocket bağlantısı.
import {
  connect as connectWebSocket,
  disconnect as disconnectWebSocket,
  addNotificationListener,
} from "./src/services/websocketService";

// Telefonun üstündeki saat, Wi-Fi ve şarj alanını düzenler.
import { StatusBar } from "expo-status-bar";

// Uygulamadaki ekran geçişlerini yönetir.
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Uygulamadaki ekranlarımızı başka dosyalardan çağırıyoruz.
import Login from "./src/pages/Login";
import Register from "./src/pages/Register";
import VerifyEmail from "./src/pages/VerifyEmail";
import Home from "./src/pages/Home";
import Dashboard from "./src/pages/Dashboard";
import Fruits from "./src/pages/Fruits";
import NeedListCreate from "./src/pages/NeedListCreate";
import NeedListList from "./src/pages/NeedListList";
import Acceptance from "./src/pages/Acceptance";
import ActiveTasks from "./src/pages/ActiveTasks";
import SoforTaskDetail from "./src/pages/SoforTaskDetail";
import AdminUserApproval from "./src/pages/AdminUserApproval";
import PurchaseManagement from "./src/pages/PurchaseManagement";
import AdminAuditLog from "./src/pages/AdminAuditLog";
import CompletedAcceptances from "./src/pages/CompletedAcceptances";


// Uygulamadaki ekranları bir yığın şeklinde yönetir.
const Stack = createNativeStackNavigator();

// App.js içinde kullanılan ortak renkler.
const colors = {
  primary: "#2E7D32",
  primaryDark: "#1B5E20",

  white: "#FFFFFF",
  background: "#F4F7F4",
};

/*
  NeedListCreate ekranını açar.
  currentUser bilgisini gönderiyoruz çünkü ihtiyaç kaydını
  hangi kullanıcının oluşturduğunu bilmemiz gerekiyor.
*/
function NeedListCreateScreen({ navigation, currentUser }) {
  return <NeedListCreate navigation={navigation} currentUser={currentUser} />;
}

/*
  Mevcut ihtiyaçlar ekranını açar.
  Giriş yapan kullanıcı bilgisini bu ekrana da gönderiyoruz.
*/
function NeedListListScreen({ currentUser }) {
  return <NeedListList currentUser={currentUser} />;
}

/*
  Meyve listesini açar.
  Fruits ekranı kendi kaydırma sistemine sahip olduğu için
  tekrar ScrollView içine koymuyoruz.
*/
function FruitsScreen() {
  return <Fruits />;
}

/*
  Ana ekrandaki "Özet" kartına basılınca açılır.
  Hangi kartların (özellikle alım tutarlarının) gösterileceği role göre
  değiştiği için currentUser gönderilir.
*/
function DashboardScreen({ currentUser }) {
  return <Dashboard currentUser={currentUser} />;
}

function AcceptanceScreen(props) {
  return <Acceptance {...props} />;
}

function ActiveTasksScreen(props) {
  return <ActiveTasks {...props} />;
}

function SoforTaskDetailScreen(props) {
  return <SoforTaskDetail {...props} />;
}

/*
  Yönetici (ADMIN) kullanıcı onayları ekranını açar.
  Hangi kullanıcının işlem yaptığını bilmek için currentUser gönderilir.
*/
function AdminUserApprovalScreen({ currentUser }) {
  return <AdminUserApproval currentUser={currentUser} />;
}

/*
  MAGAZA_MUDURU'nün alım işlemleri ekranını açar.
  Hangi müdürün işlem yaptığını bilmek için currentUser gönderilir.
*/
function PurchaseManagementScreen({ currentUser }) {
  return <PurchaseManagement currentUser={currentUser} />;
}

/*
  Yönetici (ADMIN) işlem kayıtları (AuditLog) ekranını açar.
  Bu ekran currentUser'a ihtiyaç duymaz; GET /api/audit-logs herkese açık
  şekilde tüm kayıtları döner.
*/
function AdminAuditLogScreen() {
  return <AdminAuditLog />;
}

/*
  Ana ekrandaki "Tamamlanan İşlemler" kartına basılınca açılır.
  Hangi kullanıcının (ve hangi rolün) kendi/geneli göreceğini bilmek için
  currentUser gönderilir (bkz. AcceptanceService.getCompletedAcceptances).
*/
function CompletedAcceptancesScreen({ currentUser }) {
  return <CompletedAcceptances currentUser={currentUser} />;
}

/*
  Uygulamamızın ana kapısı burasıdır.
  Kullanıcı giriş yaptı mı diye burada kontrol ediyoruz.
*/
export default function App() {
  /*
    currentUser = giriş yapan kullanıcı bilgisi.
    Başlangıçta null çünkü henüz giriş yapan kullanıcı yok.
  */
  const [currentUser, setCurrentUser] = useState(null);

  /*
    Uygulama açılışında cihazda kayıtlı bir oturum (token + kullanıcı) var mı
    diye kontrol ederiz. Kontrol bitene kadar Login ekranını GÖSTERMEYİZ,
    yoksa kullanıcı zaten girişliyken bir an için Login ekranı yanıp söner.
  */
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    loadSession()
      .then((session) => {
        if (session) {
          setCurrentUser(session.user);
          connectWebSocket(session.token, session.user.id);
        }
      })
      .finally(() => setCheckingSession(false));
  }, []);

  /*
    notificationBanner: WebSocket'ten gelen bildirimi, kullanıcı hangi ekranda
    olursa olsun ekranın üstünde kısa süreliğine gösteren küçük bir kutu.
    Öncesinde bildirimler yalnızca ActiveTasks ekranı açıkken fark ediliyordu;
    artık currentUser var olduğu sürece (yani oturum açıkken) her zaman dinlenir.
  */
  const [notificationBanner, setNotificationBanner] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    const removeListener = addNotificationListener((payload) => {
      setNotificationBanner({
        id: Date.now(),
        message: payload?.message || "Yeni bildirim",
      });
    });

    return removeListener;
  }, [currentUser]);

  // Bildirim kutusu 4 saniye sonra kendiliğinden kaybolur.
  useEffect(() => {
    if (!notificationBanner) return;

    const timer = setTimeout(() => setNotificationBanner(null), 4000);
    return () => clearTimeout(timer);
  }, [notificationBanner]);

  /*
    Giriş yapmadan önceki ekranlar arasındaki geçişi (Login/Register/VerifyEmail)
    currentUser'a benzer şekilde basit bir state ile yönetiyoruz.
    authScreen: "login" | "register" | "verify"
  */
  const [authScreen, setAuthScreen] = useState("login");

  // Register ekranında girilen e-posta, VerifyEmail ekranına buradan aktarılır.
  const [pendingEmail, setPendingEmail] = useState("");

  // Kayıtlı oturum kontrolü sürerken boş bir yükleniyor ekranı gösteririz.
  if (checkingSession) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  /*
    currentUser boşsa kullanıcı giriş yapmamıştır.
    Bu durumda authScreen'e göre Login, Register veya VerifyEmail ekranını gösteriyoruz.
  */
  if (!currentUser) {
    if (authScreen === "register") {
      return (
        <>
          <Register
            onRegisterSuccess={(email) => {
              setPendingEmail(email);
              setAuthScreen("verify");
            }}
            onGoToLogin={() => setAuthScreen("login")}
          />
          <StatusBar style="dark" />
        </>
      );
    }

    if (authScreen === "verify") {
      return (
        <>
          <VerifyEmail
            email={pendingEmail}
            onVerified={() => setAuthScreen("login")}
            onGoBack={() => setAuthScreen("register")}
          />
          <StatusBar style="dark" />
        </>
      );
    }

    return (
      <>
        <Login
          onLoginSuccess={async (user) => {
            setCurrentUser(user);

            const token = await getToken();
            if (token) {
              connectWebSocket(token, user.id);
            }
          }}
          onGoToRegister={() => setAuthScreen("register")}
        />
        <StatusBar style="dark" />
      </>
    );
  }

  /*
    currentUser doluysa kullanıcı giriş yapmıştır.
    Bu durumda navigation sistemini ve uygulama ekranlarını açıyoruz.
  */
  return (
    <>
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          // Diğer ekranların üst başlık alanı koyu yeşil olur.
          headerStyle: {
            backgroundColor: colors.white,
          },

          // Geri butonu ve başlık yazıları beyaz olur.
          headerTintColor: colors.primaryDark,

          // Başlık yazısı kalın olur.
          headerTitleStyle: {
            fontWeight: "bold",
          },

          // Ekranların genel arka plan rengi.
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        {/*
          Ana ekranımız ayrı Home dosyasından gelir.
          Kendi özel tasarımı olduğu için standart navigation başlığını gizliyoruz.
        */}
        <Stack.Screen
          name="Home"
          options={{
            headerShown: false,
          }}
        >
          {(props) => (
            <Home
              {...props}
              currentUser={currentUser}
              onLogout={async () => {
                disconnectWebSocket();
                await clearSession();
                setCurrentUser(null);
              }}
            />
          )}
        </Stack.Screen>

        {/* Ana ekrandaki "Özet" kartına basılınca bu ekran açılır. */}
        <Stack.Screen
          name="Dashboard"
          options={{
            title: "Özet",
          }}
        >
          {() => <DashboardScreen currentUser={currentUser} />}
        </Stack.Screen>

        {/*
          Ana ekrandaki "İhtiyaç Oluştur" kartına basılınca
          bu ekran açılır.
        */}
        <Stack.Screen
          name="NeedListCreate"
          options={{
            title: "Yeni İhtiyaç Planı",
          }}
        >
          {(props) => (
            <NeedListCreateScreen {...props} currentUser={currentUser} />
          )}
        </Stack.Screen>

        {/*
          Ana ekrandaki "Mevcut İhtiyaçlar" kartına basılınca
          bu ekran açılır.
        */}
        <Stack.Screen
          name="NeedListList"
          options={{
            title: "Mevcut İhtiyaçlar",
          }}
        >
          {() => <NeedListListScreen currentUser={currentUser} />}
        </Stack.Screen>

        {/*
          Ana ekrandaki "Mal Kabul Sayımı" kartına basılınca
          AcceptanceScreen açılır.
        */}
        <Stack.Screen
          name="Acceptance"
          options={{
            title: "Mal Kabul Sayımı",
          }}
        >
          {(props) => <AcceptanceScreen {...props} currentUser={currentUser} />}
        </Stack.Screen>

        {/*
          Ana ekrandaki "Aktif Görevler" kartına basılınca
          ActiveTasksScreen açılır.
        */}
        <Stack.Screen
          name="ActiveTasks"
          options={{
            title: "Aktif Görevler",
          }}
        >
          {(props) => <ActiveTasksScreen {...props} currentUser={currentUser} />}
        </Stack.Screen>

        {/*
          ŞOFÖR'ün Aktif Görevler ekranındaki bir göreve basınca açılır.
          route.params.task, SoforTaskList'in zaten elinde olan görev nesnesidir.
        */}
        <Stack.Screen
          name="SoforTaskDetail"
          options={{
            title: "Görev Detayı",
          }}
        >
          {(props) => <SoforTaskDetailScreen {...props} />}
        </Stack.Screen>

        {/*
          Ana ekrandaki "Meyve Listesi" kartına basılınca
          Fruits ekranı açılır.
        */}
        <Stack.Screen
          name="Fruits"
          options={{
            title: "Meyve Listesi",
          }}
        >
          {() => <FruitsScreen />}
        </Stack.Screen>

        {/*
          Ana ekrandaki "Kullanıcı Onayları" kartına basılınca açılır.
          Bu kart Home ekranında yalnızca ADMIN rolündeki kullanıcıya gösterilir.
        */}
        <Stack.Screen
          name="AdminUserApproval"
          options={{
            title: "Kullanıcı Onayları",
          }}
        >
          {() => <AdminUserApprovalScreen currentUser={currentUser} />}
        </Stack.Screen>

        {/*
          Ana ekrandaki "Alım İşlemleri" kartına basılınca açılır.
          Bu kart Home ekranında yalnızca MAGAZA_MUDURU rolündeki kullanıcıya gösterilir.
        */}
        <Stack.Screen
          name="PurchaseManagement"
          options={{
            title: "Alım İşlemleri",
          }}
        >
          {() => <PurchaseManagementScreen currentUser={currentUser} />}
        </Stack.Screen>

        {/*
          Ana ekrandaki "İşlem Kayıtları" kartına basılınca açılır.
          Bu kart Home ekranında yalnızca ADMIN rolündeki kullanıcıya gösterilir.
        */}
        <Stack.Screen
          name="AdminAuditLog"
          options={{
            title: "İşlem Kayıtları",
          }}
        >
          {() => <AdminAuditLogScreen />}
        </Stack.Screen>

        {/*
          Ana ekrandaki "Tamamlanan İşlemler" kartına basılınca açılır.
          Bu kart Home ekranında MAGAZA_PERSONELI ve ADMIN rollerine gösterilir.
        */}
        <Stack.Screen
          name="CompletedAcceptances"
          options={{
            title: "Tamamlanan İşlemler",
          }}
        >
          {() => <CompletedAcceptancesScreen currentUser={currentUser} />}
        </Stack.Screen>
      </Stack.Navigator>

      <StatusBar style="light" />
    </NavigationContainer>

    {notificationBanner ? (
      <SafeAreaView
        edges={["top"]}
        style={styles.notificationSafeArea}
        pointerEvents="box-none"
      >
        <Pressable
          style={styles.notificationBanner}
          onPress={() => setNotificationBanner(null)}
        >
          <Ionicons name="notifications" size={18} color={colors.white} />
          <Text style={styles.notificationBannerText} numberOfLines={2}>
            {notificationBanner.message}
          </Text>
        </Pressable>
      </SafeAreaView>
    ) : null}
    </>
  );
}

// Yalnızca üstteki bildirim kutusunun tasarımını belirler.
const styles = {
  notificationSafeArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },

  notificationBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 14,
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.primaryDark,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 6,
  },

  notificationBannerText: {
    flex: 1,
    color: colors.white,
    fontWeight: "700",
  },
};
