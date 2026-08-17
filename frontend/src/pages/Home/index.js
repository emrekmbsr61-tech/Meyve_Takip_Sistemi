import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

const colors = {
  primary: "#2E7D32",
  primaryDark: "#1B5E20",
  primaryLight: "#EAF5EC",

  background: "#F4F7F4",
  white: "#FFFFFF",
  border: "#DDE7DF",

  text: "#17211B",
  gray: "#6B7280",
  lightGray: "#9CA3AF",

  blue: "#2563EB",
  blueLight: "#E8F0FE",

  orange: "#D97706",
  orangeLight: "#FFF1DC",

  purple: "#7C3AED",
  purpleLight: "#F0EAFE",

  red: "#DC2626",
  redLight: "#FDECEC",
};

/*
  Sistemdeki tüm menü kartlarının TEK tanım kaynağı.
  Her kart burada yalnızca bir kez tanımlanır; roller aşağıdaki
  ROLE_MENU_KEYS listesinde hangi kartları görebileceğini belirtir.
*/
const ALL_MENU_ITEMS = {
  Dashboard: {
    screen: "Dashboard",
    title: "Özet",
    description: "Genel durumu ve tespit edilen kayıpları gör.",
    icon: "stats-chart-outline",
    iconColor: colors.primary,
    iconBackground: colors.primaryLight,
  },
  NeedListCreate: {
    screen: "NeedListCreate",
    title: "İhtiyaç Oluştur",
    description: "Mağaza için yeni ürün ihtiyacı oluştur.",
    icon: "clipboard-outline",
    iconColor: colors.primary,
    iconBackground: colors.primaryLight,
  },
  NeedListList: {
    screen: "NeedListList",
    title: "Mevcut İhtiyaçlar",
    description: "Oluşturulan ihtiyaçları görüntüle ve düzenle.",
    icon: "list-outline",
    iconColor: colors.blue,
    iconBackground: colors.blueLight,
  },
  Acceptance: {
    screen: "Acceptance",
    title: "Mal Kabul Sayımı",
    description: "Teslim edilen ürünlerin gerçek miktarını kaydet.",
    icon: "cube-outline",
    iconColor: colors.orange,
    iconBackground: colors.orangeLight,
  },
  ActiveTasks: {
    screen: "ActiveTasks",
    title: "Aktif Görevler",
    description: "Atanan görevleri ve kalan süreyi görüntüle.",
    icon: "time-outline",
    iconColor: colors.purple,
    iconBackground: colors.purpleLight,
  },
  Fruits: {
    screen: "Fruits",
    title: "Meyve Listesi",
    description: "Sistemde kayıtlı ürünleri görüntüle.",
    icon: "nutrition-outline",
    iconColor: colors.red,
    iconBackground: colors.redLight,
  },
  AdminUserApproval: {
    screen: "AdminUserApproval",
    title: "Kullanıcı Onayları",
    description: "Onay bekleyen kullanıcılara rol ata.",
    icon: "shield-checkmark-outline",
    iconColor: colors.primaryDark,
    iconBackground: colors.primaryLight,
  },
  PurchaseManagement: {
    screen: "PurchaseManagement",
    title: "Alım İşlemleri",
    description: "Bekleyen planlar için tedarikçiden alım kaydı oluştur.",
    icon: "cart-outline",
    iconColor: colors.orange,
    iconBackground: colors.orangeLight,
  },
  AdminAuditLog: {
    screen: "AdminAuditLog",
    title: "İşlem Kayıtları",
    description: "Sistemdeki tüm işlem kayıtlarını görüntüle.",
    icon: "document-text-outline",
    iconColor: colors.primaryDark,
    iconBackground: colors.primaryLight,
  },
  CompletedAcceptances: {
    screen: "CompletedAcceptances",
    title: "Tamamlanan İşlemler",
    description: "Tamamlanmış mal kabul kayıtlarını görüntüle.",
    icon: "checkmark-done-outline",
    iconColor: colors.primary,
    iconBackground: colors.primaryLight,
  },
};

/*
  Her rolün hangi kartları görebileceği tek yerde, anlaşılır şekilde tanımlanır.

  ADMIN: bütün kayıtları İZLEYEBİLİR ama operasyon personeli gibi işlem
  TAMAMLAYAMAZ. Bu yüzden "İhtiyaç Oluştur" ve "Mal Kabul Sayımı" (aktif işlem
  ekranları) ADMIN menüsünde YOK; "Mevcut İhtiyaçlar", "Aktif Görevler" ve
  "Alım İşlemleri" ise salt okunur modda gösterilir (bkz. ilgili ekranlardaki
  isReadOnly/canManage kontrolleri). "Kullanıcı Onayları" ADMIN'in gerçek
  yönetim işidir, tam işlevsel kalır.

  MAGAZA_PERSONELI: ihtiyaç oluşturma ve mal kabul akışının tamamına sahiptir.
  MAGAZA_MUDURU: ihtiyaçları salt okunur görür, alım işlemlerini yapar.
  SOFOR: henüz kendine özel bir ekranı yok, sadece görevlerini ve ürünleri görür.
*/
const ROLE_MENU_KEYS = {
  ADMIN: [
    "Dashboard",
    "NeedListList",
    "ActiveTasks",
    "PurchaseManagement",
    "Fruits",
    "AdminUserApproval",
    "AdminAuditLog",
  ],
  MAGAZA_PERSONELI: [
    "Dashboard",
    "NeedListCreate",
    "NeedListList",
    "Acceptance",
    "ActiveTasks",
    "CompletedAcceptances",
    "Fruits",
  ],
  MAGAZA_MUDURU: ["Dashboard", "NeedListList", "PurchaseManagement", "ActiveTasks", "Fruits"],
  SOFOR: ["Dashboard", "ActiveTasks", "Fruits"],
};

// Kullanıcının rolüne göre görebileceği kart listesini üretir.
function getMenuItemsForRole(role) {
  const keys = ROLE_MENU_KEYS[role] || [];
  return keys.map((key) => ALL_MENU_ITEMS[key]);
}

function getReadableRole(role) {
  switch (role) {
    case "MAGAZA_PERSONELI":
      return "Mağaza Personeli";

    case "ADMIN":
      return "Yönetici";

    case "SOFOR":
      return "Şoför";

    case "MAGAZA_MUDURU":
      return "Mağaza Müdürü";

    default:
      return role || "Kullanıcı";
  }
}

export default function Home({ navigation, currentUser, onLogout }) {
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const readableRole = getReadableRole(currentUser?.role);

  // Kullanıcının rolüne göre görebileceği kartlar (bkz. ROLE_MENU_KEYS).
  const visibleMenuItems = getMenuItemsForRole(currentUser?.role);

  const closeSettings = () => {
    setSettingsVisible(false);
  };

  const handleLogout = () => {
    closeSettings();
    onLogout();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Kullanıcı karşılama ve ayarlar kartı */}
        <Pressable
          style={styles.profileCard}
          onPress={() => setSettingsVisible(true)}
        >
          <View style={styles.decorativeCircleOne} />
          <View style={styles.decorativeCircleTwo} />

          <View style={styles.profileIconBox}>
            <Ionicons
              name="person-outline"
              size={34}
              color={colors.white}
            />
          </View>

          <View style={styles.profileTextArea}>
            <Text style={styles.welcomeText}>Hoş geldin</Text>

            <Text style={styles.userName}>
              {currentUser?.fullName || "Kullanıcı"}
            </Text>

            <View style={styles.roleBadge}>
              <Ionicons
                name="storefront-outline"
                size={14}
                color={colors.white}
              />

              <Text style={styles.roleText}>{readableRole}</Text>
            </View>
          </View>

          <View style={styles.settingsButton}>
            <Ionicons
              name="settings-outline"
              size={23}
              color={colors.white}
            />
          </View>
        </Pressable>

        {/* İşlemler başlığı */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>İşlemler</Text>
          <Text style={styles.sectionCount}>{visibleMenuItems.length} işlem</Text>
        </View>

        {/* Menü kartları */}
        {visibleMenuItems.map((item) => (
          <Pressable
            key={item.screen}
            style={({ pressed }) => [
              styles.menuCard,
              pressed && styles.pressedCard,
            ]}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View
              style={[
                styles.menuIconBox,
                { backgroundColor: item.iconBackground },
              ]}
            >
              <Ionicons
                name={item.icon}
                size={27}
                color={item.iconColor}
              />
            </View>

            <View style={styles.menuTextArea}>
              <Text style={styles.menuTitle}>{item.title}</Text>

              <Text style={styles.menuDescription}>
                {item.description}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={24}
              color="#B8C3BA"
            />
          </Pressable>
        ))}
      </ScrollView>

      {/* Ayarlar paneli */}
      <Modal
        visible={settingsVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeSettings}
      >
        {/* Bu alana dokunulursa ayarlar kapanır */}
        <Pressable style={styles.modalOverlay} onPress={closeSettings}>
          {/* Panelin içine basıldığında kapanmaması için */}
          <Pressable
            style={styles.settingsPanel}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.panelHandle} />

            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>Ayarlar</Text>

              <Pressable
                style={styles.closeButton}
                onPress={closeSettings}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={colors.text}
                />
              </Pressable>
            </View>

            <View style={styles.settingsProfileCard}>
              <View style={styles.settingsProfileIcon}>
                <Ionicons
                  name="person-outline"
                  size={27}
                  color={colors.primary}
                />
              </View>

              <View style={styles.settingsProfileText}>
                <Text style={styles.settingsUserName}>
                  {currentUser?.fullName || "Kullanıcı"}
                </Text>

                <Text style={styles.settingsRole}>
                  {readableRole}
                </Text>
              </View>
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIconBox}>
                  <Ionicons
                    name="notifications-outline"
                    size={22}
                    color={colors.primary}
                  />
                </View>

                <View>
                  <Text style={styles.settingName}>Bildirimler</Text>
                  <Text style={styles.settingDescription}>
                    Görev bildirimlerini göster
                  </Text>
                </View>
              </View>

              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{
                  false: "#D1D5DB",
                  true: "#8CCB92",
                }}
                thumbColor={
                  notificationsEnabled
                    ? colors.primary
                    : colors.white
                }
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIconBox}>
                  <Ionicons
                    name="information-circle-outline"
                    size={22}
                    color={colors.primary}
                  />
                </View>

                <View>
                  <Text style={styles.settingName}>
                    Uygulama Bilgisi
                  </Text>

                  <Text style={styles.settingDescription}>
                    Meyve Takip Sistemi v1.0
                  </Text>
                </View>
              </View>
            </View>

            <Pressable
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons
                name="log-out-outline"
                size={22}
                color={colors.red}
              />

              <Text style={styles.logoutText}>Çıkış Yap</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },

  profileCard: {
    minHeight: 112,
    backgroundColor: colors.primaryDark,
    borderRadius: 22,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",

    shadowColor: colors.primaryDark,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.18,
    shadowRadius: 15,
    elevation: 6,
  },

  decorativeCircleOne: {
    position: "absolute",
    width: 135,
    height: 135,
    borderRadius: 68,
    backgroundColor: "rgba(255,255,255,0.06)",
    right: -24,
    bottom: -44,
  },

  decorativeCircleTwo: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.04)",
    right: 44,
    top: -32,
  },

  profileIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  profileTextArea: {
    flex: 1,
  },

  welcomeText: {
    color: "#D8EAD9",
    fontSize: 13,
    fontWeight: "500",
  },

  userName: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },

  roleBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 11,
    marginTop: 9,
  },

  roleText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
  },

  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 10,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "800",
  },

  sectionCount: {
    color: colors.gray,
    fontSize: 14,
  },

  menuCard: {
    minHeight: 80,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",

    shadowColor: "#101811",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  pressedCard: {
    opacity: 0.7,
    transform: [{ scale: 0.99 }],
  },

  menuIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  menuTextArea: {
    flex: 1,
    paddingRight: 8,
  },

  menuTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },

  menuDescription: {
    color: colors.gray,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 18, 0.45)",
    justifyContent: "flex-end",
  },

  settingsPanel: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },

  panelHandle: {
    width: 45,
    height: 5,
    borderRadius: 5,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 16,
  },

  settingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  settingsTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },

  settingsProfileCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 18,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  settingsProfileIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  settingsProfileText: {
    flex: 1,
  },

  settingsUserName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },

  settingsRole: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 3,
  },

  settingRow: {
    minHeight: 75,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  settingIconBox: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  settingName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },

  settingDescription: {
    color: colors.gray,
    fontSize: 13,
    marginTop: 2,
  },

  logoutButton: {
    height: 54,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#F3B9B9",
    backgroundColor: "#FFF9F9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 22,
  },

  logoutText: {
    color: colors.red,
    fontSize: 16,
    fontWeight: "800",
  },
});