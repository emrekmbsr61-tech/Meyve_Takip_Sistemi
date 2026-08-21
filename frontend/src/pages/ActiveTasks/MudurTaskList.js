import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { createManualTask, getTasks } from "../../services/taskService";
import { addNotificationListener } from "../../services/websocketService";
import CountdownText from "../../components/CountdownText";
import AssignTaskModal from "./AssignTaskModal";

const colors = {
  green: "#2E7D32",
  greenLight: "#EAF5EC",
  background: "#F6F8F6",
  white: "#FFFFFF",
  border: "#DFE7E0",
  text: "#132118",
  muted: "#708075",
  red: "#C62828",
};

const TASK_STATUS_LABELS = {
  PENDING: "Bekliyor",
  IN_PROGRESS: "Devam Ediyor",
  COMPLETED: "Tamamlandı",
  // Süresi geçtiği için sistem tarafından otomatik işaretlenen görev
  // (bkz. backend OverdueTaskScheduler).
  OVERDUE: "Gecikti",
};

/*
  MAGAZA_MUDURU'ye atanan ALIM görevlerini listeler (bkz.
  NeedListService.assignAlimTask — bir ihtiyaç planı oluşturulunca otomatik
  atanır). SoforTaskList ile aynı basit GET /api/tasks deseni kullanılır,
  tek fark: burada ayrı bir "görev detay" ekranı yok — göreve dokununca
  doğrudan var olan "Alım İşlemleri" (PurchaseManagement) ekranı açılır,
  çünkü alımın kendisi zaten o ekranda yapılıyor.
*/
export default function MudurTaskList({ currentUser, navigation }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Görev atama penceresinin durumu.
  const [assignVisible, setAssignVisible] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const result = await getTasks(currentUser.id);

      const activeAlimTasks = Array.isArray(result)
        ? result.filter((task) => task.taskType === "ALIM" && task.status !== "COMPLETED")
        : [];

      setTasks(activeAlimTasks);
    } catch (error) {
      setTasks([]);
      setErrorMessage(error.message || "Görevler alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [loadTasks])
  );

  /*
    Atadığı görevi personel tamamlayınca müdür ekranda anında haberdar olur;
    ekranı elle yenilemesi gerekmez (bkz. TaskAssignmentService.completeManualTask).
  */
  useEffect(() => {
    const removeListener = addNotificationListener((notification) => {
      if (notification?.type === "GOREV_TAMAMLANDI") {
        setAssignSuccess(notification.message || "Atadığınız görev tamamlandı.");
      }
    });

    return removeListener;
  }, []);

  /*
    Görevi backend'e gönderir. Başarılıysa pencere kapanır ve ekranda kısa bir
    onay mesajı gösterilir. Görev karşı tarafa anında WebSocket ile düşer
    (bkz. TaskAssignmentService.createManualTask -> notifyUser).
  */
  const handleAssign = async (payload) => {
    try {
      setAssignSaving(true);
      setAssignError("");

      await createManualTask({ managerId: currentUser.id, ...payload });

      setAssignVisible(false);
      setAssignSuccess(`"${payload.title}" görevi atandı.`);
    } catch (error) {
      setAssignError(error.message || "Görev atanamadı.");
    } finally {
      setAssignSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.intro}>Size atanan alım görevleri burada listelenir.</Text>

      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={styles.stateText}>Görevler yükleniyor...</Text>
        </View>
      ) : null}

      {!loading && errorMessage ? (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={42} color={colors.red} />
          <Text style={styles.errorTitle}>Görevler alınamadı</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable style={styles.retryButton} onPress={loadTasks}>
            <Text style={styles.retryText}>Tekrar Dene</Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && !errorMessage && tasks.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="checkmark-circle-outline" size={44} color={colors.green} />
          <Text style={styles.emptyTitle}>Aktif görev yok</Text>
          <Text style={styles.emptyText}>Size atanmış bekleyen bir alım görevi bulunmuyor.</Text>
        </View>
      ) : null}

      {!loading &&
        !errorMessage &&
        tasks.map((task) => (
          <Pressable
            key={task.id}
            style={styles.taskCard}
            onPress={() => navigation.navigate("PurchaseManagement")}
          >
            <View style={styles.cardTop}>
              <View style={styles.iconBox}>
                <Ionicons name="cart-outline" size={26} color={colors.green} />
              </View>

              <View style={styles.titleArea}>
                <Text style={styles.taskTitle}>Alım Görevi</Text>
                <Text style={styles.taskSubtitle}>Plan #{task.planId}</Text>
              </View>

              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {TASK_STATUS_LABELS[task.status] || task.status}
                </Text>
              </View>
            </View>

            <View style={styles.footerRow}>
              <CountdownText dueDate={task.dueDate} style={styles.remainingText} />
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </View>
          </Pressable>
        ))}

      {/*
        ALT BÖLÜM: Görev atama.
        Üstteki liste müdürün KENDİ görevleridir; burası ise müdürün BAŞKASINA
        görev vermesi içindir. İkisi görsel olarak ayrılsın diye araya çizgi
        ve ayrı bir başlık konur.
      */}
      <View style={styles.sectionDivider} />

      <Text style={styles.sectionTitle}>Personele Görev Ata</Text>
      <Text style={styles.sectionDescription}>
        Mağaza personeline veya şoföre, plandan bağımsız bir görev verebilirsiniz.
      </Text>

      {assignSuccess ? (
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle-outline" size={18} color={colors.green} />
          <Text style={styles.successText}>{assignSuccess}</Text>
        </View>
      ) : null}

      <Pressable
        style={styles.assignButton}
        onPress={() => {
          setAssignError("");
          setAssignSuccess("");
          setAssignVisible(true);
        }}
      >
        <Ionicons name="add-circle-outline" size={20} color={colors.green} />
        <Text style={styles.assignButtonText}>Yeni Görev Ata</Text>
      </Pressable>

      <AssignTaskModal
        visible={assignVisible}
        managerId={currentUser.id}
        saving={assignSaving}
        errorMessage={assignError}
        onSave={handleAssign}
        onClose={() => setAssignVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  intro: { color: colors.muted, lineHeight: 19, marginBottom: 12, fontSize: 13 },
  stateContainer: { alignItems: "center", paddingVertical: 35 },
  stateText: { color: colors.muted, marginTop: 10 },
  errorCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1C6C3",
    padding: 28,
  },
  errorTitle: { color: colors.red, fontWeight: "800", fontSize: 18, marginTop: 10 },
  errorText: { color: colors.muted, textAlign: "center", marginTop: 7 },
  retryButton: {
    backgroundColor: colors.green,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 13,
    marginTop: 16,
  },
  retryText: { color: colors.white, fontWeight: "800" },
  emptyCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 30,
  },
  emptyTitle: { color: colors.text, fontWeight: "800", fontSize: 18, marginTop: 10 },
  emptyText: { color: colors.muted, textAlign: "center", lineHeight: 20, marginTop: 6 },
  taskCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: { flexDirection: "row", alignItems: "center" },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.greenLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  titleArea: { flex: 1 },
  taskTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  taskSubtitle: { color: colors.muted, fontSize: 13, marginTop: 3 },
  statusBadge: {
    backgroundColor: colors.greenLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: { color: colors.green, fontWeight: "700", fontSize: 12 },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  remainingText: { color: colors.muted, fontWeight: "600", fontSize: 13 },
  sectionDivider: { height: 1, backgroundColor: colors.border, marginTop: 22, marginBottom: 18 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  sectionDescription: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4, marginBottom: 12 },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.greenLight,
    borderRadius: 12,
    padding: 11,
    marginBottom: 10,
  },
  successText: { flex: 1, color: colors.green, fontSize: 13, fontWeight: "700" },
  assignButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.green,
    borderRadius: 14,
    paddingVertical: 14,
  },
  assignButtonText: { color: colors.green, fontWeight: "800", fontSize: 15 },
});