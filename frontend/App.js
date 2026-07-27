import { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import Login from "./src/pages/Login";
import Fruits from "./src/pages/Fruits";
import NeedListCreate from "./src/pages/NeedListCreate";
import NeedListList from "./src/pages/NeedListList";

const Stack = createNativeStackNavigator();

const colors = {
  orange: "#F97316",
  dark: "#111827",
  white: "#FFFFFF",
  background: "#F3F4F6",
  border: "#E5E7EB",
  text: "#1F2937",
  gray: "#6B7280",
};

function HomeScreen({ navigation, currentUser, onLogout }) {
  return (
    <ScrollView
      style={styles.screenBackground}
      contentContainerStyle={styles.homeContent}
    >
      <View style={styles.headerCard}>
        <Text style={styles.smallText}>Hoş geldin</Text>
        <Text style={styles.title}>{currentUser.fullName}</Text>
        <Text style={styles.roleText}>Rol: {currentUser.role}</Text>
      </View>

      <Text style={styles.sectionTitle}>İşlemler</Text>

      <Pressable
        style={styles.menuCard}
        onPress={() => navigation.navigate("NeedListCreate")}
      >
        <Text style={styles.menuTitle}>İhtiyaç Oluştur</Text>
        <Text style={styles.menuDesc}>
          Mağaza seçerek aynı plan altında birden fazla meyve ihtiyacı oluştur.
        </Text>
      </Pressable>

      <Pressable
        style={styles.menuCard}
        onPress={() => navigation.navigate("NeedListList")}
      >
        <Text style={styles.menuTitle}>Mevcut İhtiyaçlar</Text>
        <Text style={styles.menuDesc}>
          Girilen ihtiyaçları görüntüle, güncelle veya sil.
        </Text>
      </Pressable>

      <Pressable
        style={styles.menuCard}
        onPress={() => navigation.navigate("Acceptance")}
      >
        <Text style={styles.menuTitle}>Mal Kabul Sayımı</Text>
        <Text style={styles.menuDesc}>
          Kamyondan gelen ürünleri sayarak kabul kaydı oluştur.
        </Text>
      </Pressable>

      <Pressable
        style={styles.menuCard}
        onPress={() => navigation.navigate("ActiveTasks")}
      >
        <Text style={styles.menuTitle}>Aktif Görevler</Text>
        <Text style={styles.menuDesc}>
          Atanan görevleri ve kalan süreleri görüntüle.
        </Text>
      </Pressable>

      <Pressable
        style={styles.menuCard}
        onPress={() => navigation.navigate("Fruits")}
      >
        <Text style={styles.menuTitle}>Meyve Listesi</Text>
        <Text style={styles.menuDesc}>
          Sistemde kayıtlı meyveleri görüntüle.
        </Text>
      </Pressable>

      <Pressable style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </Pressable>
    </ScrollView>
  );
}

function NeedListCreateScreen({ currentUser }) {
  return <NeedListCreate currentUser={currentUser} />;
}

function NeedListListScreen({ currentUser }) {
  return <NeedListList currentUser={currentUser} />;
}

function FruitsScreen() {
  return (
    <ScrollView style={styles.screenBackground}>
      <Fruits />
    </ScrollView>
  );
}

function AcceptanceScreen() {
  return (
    <ScrollView
      style={styles.screenBackground}
      contentContainerStyle={styles.homeContent}
    >
      <View style={styles.headerCard}>
        <Text style={styles.title}>Mal Kabul Sayımı</Text>
        <Text style={styles.smallText}>
          Mağaza personeli kamyondan gelen ürünleri sayarak kabul kaydı
          oluşturacak.
        </Text>
      </View>

      <View style={styles.menuCard}>
        <Text style={styles.menuTitle}>Plan Seçimi</Text>
        <Text style={styles.menuDesc}>
          Sonraki adımda bu alanda mağazaya gelen aktif teslimat planları
          listelenecek.
        </Text>
      </View>

      <View style={styles.menuCard}>
        <Text style={styles.menuTitle}>Sayım Bilgisi</Text>
        <Text style={styles.menuDesc}>
          Ürün adı, sayılan miktar ve ürün durumu bu ekranda girilecek.
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Sıradaki Backend Adımı</Text>
        <Text style={styles.infoText}>
          Acceptance entity, request/response DTO, service ve controller
          oluşturulacak.
        </Text>
      </View>
    </ScrollView>
  );
}

function ActiveTasksScreen() {
  return (
    <ScrollView
      style={styles.screenBackground}
      contentContainerStyle={styles.homeContent}
    >
      <View style={styles.headerCard}>
        <Text style={styles.title}>Aktif Görevler</Text>
        <Text style={styles.smallText}>
          Mağaza personeline atanmış görevler ve kalan süreler burada
          gösterilecek.
        </Text>
      </View>

      <View style={styles.taskCard}>
        <Text style={styles.taskBadge}>BEKLEYEN GÖREV</Text>
        <Text style={styles.menuTitle}>Mal Kabul Görevi</Text>
        <Text style={styles.menuDesc}>
          Plan #3 için mal kabul sayımı bekleniyor.
        </Text>
        <Text style={styles.remainingTime}>Kalan süre: 03:45</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Sıradaki Backend Adımı</Text>
        <Text style={styles.infoText}>
          TaskAssignment yapısı backend tarafında bağlanınca bu ekran gerçek
          görevleri listeleyecek.
        </Text>
      </View>
    </ScrollView>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);

  if (!currentUser) {
    return (
      <>
        <Login onLoginSuccess={setCurrentUser} />
        <StatusBar style="auto" />
      </>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.dark,
          },
          headerTintColor: colors.white,
          headerTitleStyle: {
            fontWeight: "bold",
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="Home" options={{ title: "Meyve Takip Sistemi" }}>
          {(props) => (
            <HomeScreen
              {...props}
              currentUser={currentUser}
              onLogout={() => setCurrentUser(null)}
            />
          )}
        </Stack.Screen>

        <Stack.Screen
          name="NeedListCreate"
          options={{ title: "İhtiyaç Oluştur" }}
        >
          {() => <NeedListCreateScreen currentUser={currentUser} />}
        </Stack.Screen>

        <Stack.Screen
          name="NeedListList"
          options={{ title: "Mevcut İhtiyaçlar" }}
        >
          {() => <NeedListListScreen currentUser={currentUser} />}
        </Stack.Screen>

        <Stack.Screen
          name="Acceptance"
          component={AcceptanceScreen}
          options={{ title: "Mal Kabul Sayımı" }}
        />

        <Stack.Screen
          name="ActiveTasks"
          component={ActiveTasksScreen}
          options={{ title: "Aktif Görevler" }}
        />

        <Stack.Screen name="Fruits" options={{ title: "Meyve Listesi" }}>
          {() => <FruitsScreen />}
        </Stack.Screen>
      </Stack.Navigator>

      <StatusBar style="light" />
    </NavigationContainer>
  );
}

const styles = {
  screenBackground: {
    flex: 1,
    backgroundColor: colors.background,
  },
  homeContent: {
    padding: 20,
    paddingBottom: 35,
  },
  headerCard: {
    backgroundColor: colors.dark,
    padding: 22,
    borderRadius: 18,
    marginBottom: 24,
  },
  smallText: {
    color: "#D1D5DB",
    fontSize: 14,
    lineHeight: 20,
  },
  title: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 6,
  },
  roleText: {
    color: colors.orange,
    marginTop: 8,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 12,
  },
  menuCard: {
    backgroundColor: colors.white,
    padding: 18,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
  },
  menuDesc: {
    color: colors.gray,
    marginTop: 6,
    lineHeight: 20,
  },
  logoutButton: {
    marginTop: 18,
    backgroundColor: colors.orange,
    padding: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  logoutText: {
    color: colors.white,
    fontWeight: "bold",
    fontSize: 16,
  },
  infoCard: {
    backgroundColor: "#FFF7ED",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FDBA74",
    marginTop: 4,
  },
  infoTitle: {
    color: colors.orange,
    fontWeight: "bold",
    fontSize: 16,
  },
  infoText: {
    color: colors.text,
    marginTop: 6,
    lineHeight: 20,
  },
  taskCard: {
    backgroundColor: colors.white,
    padding: 18,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  taskBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF7ED",
    color: colors.orange,
    fontWeight: "bold",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginBottom: 10,
    fontSize: 12,
  },
  remainingTime: {
    color: colors.orange,
    marginTop: 10,
    fontWeight: "bold",
  },
};