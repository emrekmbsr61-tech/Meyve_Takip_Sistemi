import { useEffect, useState } from "react";

// Taslak Mal Kabul ve Aktif Görev ekranlarında kullanıyoruz.
import { View, Text,TextInput,Pressable, ScrollView,ActivityIndicator,Modal,Image } from "react-native";

// Uygulama açılışında kayıtlı oturumu (token + kullanıcı) geri yüklemek için.
import { loadSession, clearSession, getToken } from "./src/services/tokenStorage";

// Gerçek zamanlı bildirimler için merkezi WebSocket bağlantısı.
import { connect as connectWebSocket, disconnect as disconnectWebSocket } from "./src/services/websocketService";

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
  primaryLight: "#EAF5EC",

  white: "#FFFFFF",
  background: "#F4F7F4",
  border: "#DDE7DF",

  text: "#17211B",
  gray: "#6B7280",

  orange: "#D97706",
  orangeLight: "#FFF7E6",

  purple: "#7C3AED",
  purpleLight: "#F3EEFF",
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
  Bu ekran şu an sadece frontend taslağıdır.
  Daha sonra gerçek Acceptance backend yapısına bağlanacak.
*/
function AcceptancePlaceholderScreen() {
  return (
    <ScrollView
      style={styles.screenBackground}
      contentContainerStyle={styles.screenContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>Mal Kabul Sayımı</Text>

        <Text style={styles.headerDescription}>
          Mağazaya teslim edilen ürünlerin gerçek miktarları bu ekranda
          kaydedilecek.
        </Text>
      </View>

      <View style={styles.contentCard}>
        <Text style={styles.cardTitle}>Teslimat Planı</Text>

        <Text style={styles.cardDescription}>
          Mağazaya gelmiş ve mal kabul işlemi bekleyen teslimat planları burada
          listelenecek.
        </Text>
      </View>

      <View style={styles.contentCard}>
        <Text style={styles.cardTitle}>Ürün Sayımı</Text>

        <Text style={styles.cardDescription}>
          Her ürün için beklenen, kabul edilen ve reddedilen miktarlar
          girilecek.
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Backend bağlantısı hazırlanacak</Text>

        <Text style={styles.infoText}>
          Bu ekran Acceptance entity, DTO, repository, service ve controller
          yapılarıyla backend sistemine bağlanacak.
        </Text>
      </View>
    </ScrollView>
  );
}

/*
  Bu ekran da şu an frontend taslağıdır.
  Daha sonra TaskAssignment backend yapısından gerçek görevleri çekecek.
*/
function ActiveTasksPlaceholderScreen() {
  return (
    <ScrollView
      style={styles.screenBackground}
      contentContainerStyle={styles.screenContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>Aktif Görevler</Text>

        <Text style={styles.headerDescription}>
          Mağaza personeline atanmış görevler ve kalan süreleri burada
          gösterilecek.
        </Text>
      </View>

      <View style={styles.taskCard}>
        <View style={styles.taskBadge}>
          <Text style={styles.taskBadgeText}>BEKLEYEN GÖREV</Text>
        </View>

        <Text style={styles.cardTitle}>Mal Kabul Görevi</Text>

        <Text style={styles.cardDescription}>
          Plan #3 için mal kabul sayımı bekleniyor.
        </Text>

        <View style={styles.timeBox}>
          <Text style={styles.timeLabel}>Kalan süre</Text>
          <Text style={styles.timeText}>03 saat 45 dakika</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Backend bağlantısı hazırlanacak</Text>

        <Text style={styles.infoText}>
          TaskAssignment yapısı tamamlandığında kullanıcıya ait gerçek görevler
          bu ekranda listelenecek.
        </Text>
      </View>
    </ScrollView>
  );
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
  );
}

/*
  Buradaki kodlar ekranların çalışma mantığını değil,
  sadece tasarımını belirler.
*/
const styles = {
  screenBackground: {
    flex: 1,
    backgroundColor: colors.background,
  },

  screenContent: {
    padding: 20,
    paddingBottom: 40,
  },

  headerCard: {
    backgroundColor: colors.primaryDark,
    padding: 22,
    borderRadius: 20,
    marginBottom: 18,
  },

  headerTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "bold",
  },

  headerDescription: {
    color: "#D8EAD9",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },

  contentCard: {
    backgroundColor: colors.white,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },

  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "bold",
  },

  cardDescription: {
    color: colors.gray,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6,
  },

  infoCard: {
    backgroundColor: colors.primaryLight,
    padding: 17,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#BBD9BF",
    marginTop: 2,
  },

  infoTitle: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "bold",
  },

  infoText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },

  taskCard: {
    backgroundColor: colors.white,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },

  taskBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.purpleLight,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 20,
    marginBottom: 12,
  },

  taskBadgeText: {
    color: colors.purple,
    fontSize: 12,
    fontWeight: "bold",
  },

  timeBox: {
    backgroundColor: colors.orangeLight,
    borderRadius: 14,
    padding: 14,
    marginTop: 15,
  },

  timeLabel: {
    color: colors.orange,
    fontSize: 13,
    fontWeight: "600",
  },

  timeText: {
    color: colors.orange,
    fontSize: 17,
    fontWeight: "bold",
    marginTop: 3,
  },
};
