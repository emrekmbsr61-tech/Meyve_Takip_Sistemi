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

import { getNeedLists } from "../../services/needListService";
import { getTasks } from "../../services/taskService";
import SoforTaskList from "./SoforTaskList";

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
  SOFOR hiç NeedList oluşturmadığı için aşağıdaki Mal Kabul akışı SOFOR
  için her zaman boş listeye düşer. Bu yüzden SOFOR, TaskAssignment
  tabanlı ayrı bir görev listesine (SoforTaskList) yönlendirilir.
  Rol kontrolü burada, hook'lardan önce yapılır; iki bileşen de kendi
  hook'larını kendi içinde çağırır, bu yüzden React hook kuralını bozmaz.
*/
export default function ActiveTasks(props) {
  if (props.currentUser.role === "SOFOR") {
    return <SoforTaskList currentUser={props.currentUser} navigation={props.navigation} />;
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
        return;
      }

      const [needLists, myTasks] = await Promise.all([
        getNeedLists(),
        getTasks(currentUser.id),
      ]);

      const kabulPlanIds = new Set(
        (Array.isArray(myTasks) ? myTasks : [])
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

      {/* Hata yok fakat açık plan yoksa */}
      {!loading &&
      !errorMessage &&
      tasks.length === 0 ? (
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
});