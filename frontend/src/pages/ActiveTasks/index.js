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

import { getNeedLists } from "../../services/needListService";
import { completeManualTask, getTasks } from "../../services/taskService";
import { addNotificationListener } from "../../services/websocketService";
import CountdownText from "../../components/CountdownText";
import SoforTaskList from "./SoforTaskList";
import MudurTaskList from "./MudurTaskList";

const colors = {
  green: "#2E7D32",
  greenLight: "#EAF5EC",
  dark: "#102416",
  background: "#F6F8F6",
  white: "#FFFFFF",
  border: "#DFE7E0",
  text: "#132118",
  muted: "#708075",
  orange: "#C96800",
  orangeLight: "#FFF4E2",
  red: "#C62828",
};

// APPROVED olmuş planlar artık aktif görev değildir.
function isOpenNeed(item) {
  const status = String(item.status || "").toUpperCase();

  return status !== "APPROVED" && status !== "COMPLETED";
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "Tarih belirtilmedi";
  }

  return new Date(dateValue).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/*
  Üç rol, üç farklı görev kaynağı kullanır — hiçbiri diğerinin NeedList/görev
  verisiyle karışmaz:
    - SOFOR: hiç NeedList oluşturmaz, yalnızca kendisine atanan TaskAssignment
      (TOPLAMA/TESLIMAT) kayıtlarını görür (bkz. SoforTaskList).
    - MAGAZA_MUDURU: hiç NeedList oluşturmaz, yalnızca kendisine atanan ALIM
      görevlerini görür (bkz. MudurTaskList, NeedListService.assignAlimTask).
      Önceden müdür de aşağıdaki MalKabulActiveTasks'a düşüyordu ve oradaki
      "item.createdBy === currentUser.id" filtresi müdür için hiçbir zaman
      eşleşmediğinden ekranı her zaman boş görünüyordu — bu artık düzeltildi.
    - MAGAZA_PERSONELI / ADMIN: aşağıdaki MalKabulActiveTasks (Mal Kabul akışı).
  Rol kontrolü burada, hook'lardan önce yapılır; her bileşen kendi hook'unu
  kendi içinde çağırır, bu yüzden React hook kuralını bozmaz.
*/
export default function ActiveTasks(props) {
  if (props.currentUser.role === "SOFOR") {
    return <SoforTaskList currentUser={props.currentUser} navigation={props.navigation} />;
  }

  if (props.currentUser.role === "MAGAZA_MUDURU") {
    return <MudurTaskList currentUser={props.currentUser} navigation={props.navigation} />;
  }

  return <MalKabulActiveTasks {...props} />;
}

function MalKabulActiveTasks({
  currentUser,
  navigation,
}) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  /*
    Müdürün elle atadığı serbest görevler (bkz. TaskType.GENEL).
    Mal Kabul kartlarından ayrı tutulur: bunların planı yoktur, ekranı da yoktur;
    yalnızca "ne yapılacak + ne kadar süre kaldı" bilgisini taşırlar.
  */
  const [generalTasks, setGeneralTasks] = useState([]);

  // ADMIN tüm planları salt okunur görür; işlem yapamaz (Mal Kabulü Aç gizlenir).
  const isReadOnly = currentUser.role === "ADMIN";

  /*
   * Backend'de her meyve ayrı NeedList kaydıdır.
   * Burada aynı planId altındaki meyveleri tek görev kartı olarak grupluyoruz.
   */
  function groupByPlan(openNeeds) {
    const groupedTasks = {};

    openNeeds.forEach((item) => {
      if (!groupedTasks[item.planId]) {
        groupedTasks[item.planId] = {
          planId: item.planId,
          storeName: item.storeName,
          createdDate: item.createdDate,
          itemCount: 0,
        };
      }

      groupedTasks[item.planId].itemCount += 1;
    });

    return Object.values(groupedTasks);
  }

  /*
   * Bu projede mağaza personelinin aktif görevi, kendisine gerçekten
   * atanmış ve henüz tamamlanmamış bir KABUL (ACCEPTANCE) görevidir.
   *
   * Önceden bu liste doğrudan NeedList durumuna bakarak üretiliyordu; bu
   * yüzden Teslimat aşaması tamamlanmadan bile bir plan "Mal Kabul" kartı
   * olarak görünebiliyor ve mağaza personeli sırayı atlayıp doğrudan mal
   * kabul ekranına girebiliyordu. Artık plan listesi GET /api/tasks
   * üzerinden gelen gerçek ACCEPTANCE görevleriyle sınırlandırılıyor; bir
   * planın burada görünmesi için Alım -> Toplama -> Teslimat adımlarının
   * hepsinin tamamlanmış olması (yani TaskAssignmentService.completeDelivery
   * tarafından bu kullanıcıya bir KABUL görevi atanmış olması) gerekir.
   *
   * ADMIN için bu kural uygulanmaz: ADMIN'e hiçbir zaman görev atanmaz, o
   * yalnızca salt okunur izleme yapar (bkz. isReadOnly), bu yüzden ADMIN
   * eskisi gibi tüm açık planları NeedList üzerinden görmeye devam eder.
   */
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      if (isReadOnly) {
        const needLists = await getNeedLists();
        const openNeeds = needLists.filter(isOpenNeed);
        setTasks(groupByPlan(openNeeds));
        // ADMIN'e hiç görev atanmaz; bu liste onda her zaman boştur.
        setGeneralTasks([]);
        return;
      }

      const [needLists, myTasks] = await Promise.all([
        getNeedLists(),
        getTasks(currentUser.id),
      ]);

      const safeTasks = Array.isArray(myTasks) ? myTasks : [];

      // Müdürün elle atadığı, henüz tamamlanmamış görevler.
      setGeneralTasks(
        safeTasks.filter((task) => task.taskType === "GENEL" && task.status !== "COMPLETED")
      );

      const kabulPlanIds = new Set(
        safeTasks
          .filter((task) => task.taskType === "ACCEPTANCE" && task.status !== "COMPLETED")
          .map((task) => task.planId)
      );

      const openNeeds = needLists.filter(
        (item) =>
          item.createdBy === currentUser.id &&
          isOpenNeed(item) &&
          kabulPlanIds.has(item.planId)
      );

      setTasks(groupByPlan(openNeeds));
    } catch (error) {
      setTasks([]);
      setGeneralTasks([]);
      setErrorMessage(
        error.message || "Görevler alınamadı."
      );
    } finally {
      setLoading(false);
    }
  }, [currentUser.id, isReadOnly]);

  // Ekrana her girildiğinde görevler yeniden alınır.
  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [loadTasks])
  );

  /*
    Gerçek zamanlı güncelleme: kullanıcıya YENİ bir görev atandığında veya var
    olan bir görevin süresi geçtiğinde, ekran açıkken bile elle yenilemeye
    gerek kalmadan liste tazelenir.

    Not: Önceden yalnızca KABUL görevi dinleniyordu; bu yüzden şoföre atanan
    toplama/teslimat görevleri ve gecikme uyarıları ekranda anında görünmüyordu.
  */
  const TASK_NOTIFICATION_TYPES = [
    "ALIM_GOREVI_ATANDI",
    "TOPLAMA_GOREVI_ATANDI",
    "TESLIMAT_GOREVI_ATANDI",
    "KABUL_GOREVI_ATANDI",
    "GOREV_SURESI_ASILDI",
    // Müdürün elle atadığı görev; ekran açıkken bile anında listeye düşmeli.
    "GOREV_ATANDI",
  ];

  useEffect(() => {
    const unsubscribe = addNotificationListener((notification) => {
      if (TASK_NOTIFICATION_TYPES.includes(notification?.type)) {
        loadTasks();
      }
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadTasks]);

  /*
    Müdürün atadığı görevi tamamlar. Başarılı olursa liste yeniden çekilir ve
    görev listeden düşer; müdüre de anlık bildirim gider (backend tarafında).
  */
  const [completingTaskId, setCompletingTaskId] = useState(null);

  const completeTask = async (task) => {
    try {
      setCompletingTaskId(task.id);
      setErrorMessage("");

      await completeManualTask(task.id, currentUser.id);
      await loadTasks();
    } catch (error) {
      setErrorMessage(error.message || "Görev tamamlanamadı.");
    } finally {
      setCompletingTaskId(null);
    }
  };

  // Göreve basılınca doğrudan o planın Mal Kabul ekranı açılır.
  const openTask = (task) => {
    navigation.navigate("Acceptance", {
      planId: task.planId,
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.intro}>
        Mal kabul işlemi bekleyen ihtiyaç planları burada gösterilir.
      </Text>

      {/* Veriler yükleniyorsa */}
      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator
            size="large"
            color={colors.green}
          />

          <Text style={styles.stateText}>
            Görevler yükleniyor...
          </Text>
        </View>
      ) : null}

      {/* Gerçek hata varsa sadece hata alanı gösterilir */}
      {!loading && errorMessage ? (
        <View style={styles.errorCard}>
          <Ionicons
            name="alert-circle-outline"
            size={42}
            color={colors.red}
          />

          <Text style={styles.errorTitle}>
            Görevler alınamadı
          </Text>

          <Text style={styles.errorText}>
            {errorMessage}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={loadTasks}
          >
            <Text style={styles.retryText}>
              Tekrar Dene
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/*
        Müdürün elle atadığı görevler.
        Mal Kabul kartlarının ÜSTÜNDE gösterilir: bunların son teslim süresi
        vardır ve gecikince otomatik OVERDUE olur, bu yüzden ilk göze çarpması
        gereken bilgi budur. Planları olmadığı için "Plan #" bilgisi yazılmaz.
      */}
      {!loading && !errorMessage && generalTasks.length > 0 ? (
        <View style={styles.assignedSection}>
          <Text style={styles.assignedSectionTitle}>Size Atanan Görevler</Text>

          {generalTasks.map((task) => (
            <View key={task.id} style={styles.assignedCard}>
              <View style={styles.assignedCardTop}>
                <View style={styles.iconBox}>
                  <Ionicons name="clipboard-outline" size={26} color={colors.green} />
                </View>

                <View style={styles.titleArea}>
                  <Text style={styles.taskTitle}>{task.title || "Görev"}</Text>
                  <CountdownText dueDate={task.dueDate} style={styles.assignedRemaining} />
                </View>

                {task.status === "OVERDUE" ? (
                  <View style={styles.overdueBadge}>
                    <Text style={styles.overdueText}>Gecikti</Text>
                  </View>
                ) : null}
              </View>

              {/* Süresi geçmiş olsa bile görev tamamlanabilir; gecikme kaydı zaten düşülmüştür. */}
              <Pressable
                style={[
                  styles.completeButton,
                  completingTaskId === task.id && styles.completeButtonDisabled,
                ]}
                onPress={() => completeTask(task)}
                disabled={completingTaskId === task.id}
              >
                <Ionicons name="checkmark-circle-outline" size={19} color={colors.green} />
                <Text style={styles.completeButtonText}>
                  {completingTaskId === task.id ? "Kaydediliyor..." : "Tamamlandı olarak işaretle"}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {/*
        Hata yok fakat hiçbir görev yoksa.
        generalTasks da kontrol edilir: atanmış bir görev varken "Açık görev yok"
        yazması yanıltıcı olurdu.
      */}
      {!loading &&
      !errorMessage &&
      tasks.length === 0 &&
      generalTasks.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name="checkmark-circle-outline"
            size={44}
            color={colors.green}
          />

          <Text style={styles.emptyTitle}>
            Açık görev yok
          </Text>

          <Text style={styles.emptyText}>
            Mal kabul bekleyen ihtiyaç planı bulunmuyor.
          </Text>
        </View>
      ) : null}

      {/* Açık planlar görev kartı olarak gösterilir */}
      {!loading &&
        !errorMessage &&
        tasks.map((task) => (
          <View
            key={task.planId}
            style={styles.taskCard}
          >
            <View style={styles.cardTop}>
              <View style={styles.iconBox}>
                <Ionicons
                  name="cube-outline"
                  size={28}
                  color={colors.green}
                />
              </View>

              <View style={styles.titleArea}>
                <Text style={styles.taskTitle}>
                  Mal Kabul
                </Text>

                <Text style={styles.taskSubtitle}>
                  Plan #{task.planId} · {task.storeName}
                </Text>
              </View>

              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  Bekliyor
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoArea}>
                <Text style={styles.infoLabel}>
                  OLUŞTURULMA
                </Text>

                <Text style={styles.infoValue}>
                  {formatDate(task.createdDate)}
                </Text>
              </View>

              <View style={styles.infoArea}>
                <Text style={styles.infoLabel}>
                  ÜRÜN SAYISI
                </Text>

                <Text style={styles.infoValue}>
                  {task.itemCount} ürün
                </Text>
              </View>
            </View>

            {isReadOnly ? null : (
              <Pressable
                style={styles.openButton}
                onPress={() => openTask(task)}
              >
                <Text style={styles.openButtonText}>
                  Mal Kabulü Aç
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={21}
                  color={colors.white}
                />
              </Pressable>
            )}
          </View>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: 16,
    paddingBottom: 32,
  },

  intro: {
    color: colors.muted,
    lineHeight: 19,
    marginBottom: 12,
    fontSize: 13,
  },

  stateContainer: {
    alignItems: "center",
    paddingVertical: 35,
  },

  stateText: {
    color: colors.muted,
    marginTop: 10,
  },

  errorCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1C6C3",
    padding: 28,
  },

  errorTitle: {
    color: colors.red,
    fontWeight: "800",
    fontSize: 18,
    marginTop: 10,
  },

  errorText: {
    color: colors.muted,
    textAlign: "center",
    marginTop: 7,
  },

  retryButton: {
    backgroundColor: colors.green,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 13,
    marginTop: 16,
  },

  retryText: {
    color: colors.white,
    fontWeight: "800",
  },

  emptyCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 30,
  },

  emptyTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 18,
    marginTop: 10,
  },

  emptyText: {
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 6,
  },

  taskCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.greenLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  titleArea: {
    flex: 1,
  },

  taskTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },

  taskSubtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 3,
  },

  statusBadge: {
    backgroundColor: colors.orangeLight,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 18,
  },

  statusText: {
    color: colors.orange,
    fontWeight: "700",
    fontSize: 12,
  },

  infoRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 14,
  },

  infoArea: {
    flex: 1,
  },

  infoLabel: {
    color: "#98A29B",
    fontSize: 12,
    fontWeight: "800",
  },

  infoValue: {
    color: colors.text,
    fontWeight: "700",
    marginTop: 4,
  },

  openButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.green,
    paddingVertical: 13,
    borderRadius: 13,
    marginTop: 13,
  },

  openButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
  },

  assignedSection: {
    marginBottom: 18,
  },

  assignedSectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 9,
  },

  assignedCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 13,
    marginBottom: 9,
  },

  assignedCardTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 12,
    paddingVertical: 11,
    marginTop: 12,
  },

  completeButtonDisabled: { opacity: 0.6 },

  completeButtonText: { color: colors.green, fontWeight: "800", fontSize: 14 },

  assignedRemaining: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 3,
    fontWeight: "600",
  },

  overdueBadge: {
    backgroundColor: "#FDECEC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },

  overdueText: {
    color: colors.red,
    fontWeight: "800",
    fontSize: 12,
  },
});