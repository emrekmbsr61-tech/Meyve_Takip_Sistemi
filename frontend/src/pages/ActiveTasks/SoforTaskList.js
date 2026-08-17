import { useCallback, useState } from "react";
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

import { getTasks } from "../../services/taskService";
import CountdownText from "../../components/CountdownText";

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

const TASK_TYPE_LABELS = {
  ALIM: "Alım",
  TOPLAMA: "Alım Görevi",
  TESLIMAT: "Teslimat Görevi",
  ACCEPTANCE: "Mal Kabul",
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
  ŞOFÖR rolüne atanmış görevleri listeler. Sistemde SOFOR'a iki tür görev
  sırayla atanır: önce TOPLAMA ("Alım Görevi", bkz.
  PurchaseService.completeAlimTaskAndAssignToplama), o tamamlanınca aynı
  şoföre TESLIMAT ("Teslimat Görevi", bkz.
  CollectionService.completeToplamaAndAssignTeslimat). ActiveTasks/index.js'teki
  Mal Kabul akışından ayrı tutulur çünkü o akış NeedList.createdBy üzerinden
  çalışır ve SOFOR hiç NeedList oluşturmaz.
*/
export default function SoforTaskList({ currentUser, navigation }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const result = await getTasks(currentUser.id);

      // Tamamlanan görevler aktif görev listesinde gösterilmez.
      const activeTasks = Array.isArray(result)
        ? result.filter((task) => task.status !== "COMPLETED")
        : [];

      setTasks(activeTasks);
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.intro}>Size atanan görevler burada listelenir.</Text>

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
          <Text style={styles.emptyText}>Size atanmış bekleyen bir görev bulunmuyor.</Text>
        </View>
      ) : null}

      {!loading &&
        !errorMessage &&
        tasks.map((task) => (
          <Pressable
            key={task.id}
            style={styles.taskCard}
            onPress={() => navigation.navigate("SoforTaskDetail", { task })}
          >
            <View style={styles.cardTop}>
              <View style={styles.iconBox}>
                <Ionicons name="cube-outline" size={28} color={colors.green} />
              </View>

              <View style={styles.titleArea}>
                <Text style={styles.taskTitle}>
                  {TASK_TYPE_LABELS[task.taskType] || task.taskType}
                </Text>
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
});
