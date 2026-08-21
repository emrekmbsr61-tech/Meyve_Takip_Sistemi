import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { getCompletedAcceptances } from "../../services/acceptanceService";
import { getCompletedTasks } from "../../services/taskService";
import { getPlanSummary } from "../../services/planSummaryService";
import PlanSummaryModal from "../NeedListList/PlanSummaryModal";

const colors = {
  green: "#2E7D32",
  blue: "#2364E8",
  dark: "#112018",
  background: "#F6F8F6",
  white: "#FFFFFF",
  border: "#DFE7E0",
  muted: "#708075",
  red: "#C62828",
};

function formatDate(value) {
  if (!value) return "Tarih yok";

  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/*
  Tamamlanmış işlemleri PLAN bazında listeler. "Aktif Görevler" ve "Mevcut
  İhtiyaçlar" ekranları yalnızca bekleyen/devam eden işleri gösterdiği için,
  bir plan mal kabulü bittiğinde kaybolmuş gibi görünmesin diye buraya taşınır.

  Her kart yalnızca özet bilgi (mağaza, plan no, ürün sayısı, tarih) gösterir;
  ayrıntılı sonuç (İhtiyaç/Alım/Toplama/Kabul karşılaştırması) "Sonucu Gör"
  butonuna basılınca açılır. Bu buton ve modal, NeedListList ekranında zaten
  var olan PlanSummaryModal + getPlanSummary ile aynıdır — yeni bir mekanizma
  icat edilmedi, sadece doğru ekrana taşındı. Yeni bir veritabanı tablosu da
  kullanmaz — mevcut Acceptance/AcceptanceItem kayıtları
  GET /api/acceptances/completed üzerinden okunur.
*/
export default function CompletedAcceptances({ currentUser }) {
  const [rawItems, setRawItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [summaryModalPlan, setSummaryModalPlan] = useState(null);
  const [planSummaries, setPlanSummaries] = useState({});

  /*
    Müdürün personele atadığı ve personelin tamamladığı serbest görevler
    (bkz. TaskType.GENEL). Mal kabullerden AYRI bir bölümde gösterilir:
    ikisi farklı şeylerdir, aynı listede karıştırmak kafa karıştırırdı.
  */
  const [completedTasks, setCompletedTasks] = useState([]);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      // İki liste birlikte çekilir; biri diğerini beklemez.
      const [acceptanceData, taskData] = await Promise.all([
        getCompletedAcceptances(currentUser.id),
        getCompletedTasks(currentUser.id),
      ]);

      setRawItems(Array.isArray(acceptanceData) ? acceptanceData : []);
      setCompletedTasks(Array.isArray(taskData) ? taskData : []);
    } catch (error) {
      setRawItems([]);
      setCompletedTasks([]);
      setErrorMessage(error.message || "Tamamlanan işlemler alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems])
  );

  // Ürün bazındaki satırlar, ekranda tek bir işlem kartı olması için plan bazında gruplanır.
  const plans = useMemo(() => {
    const grouped = {};

    rawItems.forEach((item) => {
      if (!grouped[item.planId]) {
        grouped[item.planId] = {
          planId: item.planId,
          storeName: item.storeName,
          createdAt: item.createdAt,
          receivedByName: item.receivedByName,
          itemCount: 0,
        };
      }
      grouped[item.planId].itemCount += 1;
    });

    return Object.values(grouped).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [rawItems]);

  const openSummary = async (plan) => {
    setSummaryModalPlan(plan);

    if (planSummaries[plan.planId]?.data) return;

    setPlanSummaries((current) => ({
      ...current,
      [plan.planId]: { loading: true, data: null, error: null },
    }));

    try {
      const data = await getPlanSummary(plan.planId, currentUser.id);
      setPlanSummaries((current) => ({
        ...current,
        [plan.planId]: { loading: false, data, error: null },
      }));
    } catch (error) {
      setPlanSummaries((current) => ({
        ...current,
        [plan.planId]: { loading: false, data: null, error: error.message },
      }));
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>Tamamlanan işlemlerin sonucunu buradan görebilirsiniz.</Text>

      {loading ? <ActivityIndicator color={colors.green} style={{ marginTop: 8 }} /> : null}

      {!loading && errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {!loading && !errorMessage && plans.length === 0 && completedTasks.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="checkmark-done-outline" size={38} color={colors.muted} />
          <Text style={styles.emptyTitle}>Henüz tamamlanan işlem yok</Text>
        </View>
      ) : null}

      {/*
        Tamamlanan görevler bölümü. Mal kabul kartlarının ÜSTÜNDE durur çünkü
        bunlar müdürün kendi verdiği işlerdir ve önce onların sonucunu görmek ister.
      */}
      {!loading && !errorMessage && completedTasks.length > 0 ? (
        <View style={styles.taskSection}>
          <Text style={styles.sectionTitle}>Tamamlanan Görevler</Text>

          {completedTasks.map((task) => (
            <View key={task.id} style={styles.taskCard}>
              <View style={styles.taskTop}>
                <Ionicons name="checkmark-circle" size={20} color={colors.green} />

                <View style={{ flex: 1 }}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskMeta}>{task.assigneeName}</Text>
                </View>

                {task.completedLate ? (
                  <View style={styles.lateBadge}>
                    <Text style={styles.lateText}>Geç tamamlandı</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.taskDate}>{formatDate(task.completedAt)}</Text>
            </View>
          ))}

          {plans.length > 0 ? <Text style={styles.sectionTitle}>Tamamlanan Mal Kabuller</Text> : null}
        </View>
      ) : null}

      {!loading && !errorMessage
        ? plans.map((plan) => (
            <View key={plan.planId} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.storeName}>{plan.storeName}</Text>
                <Text style={styles.planBadge}>Plan #{plan.planId}</Text>
              </View>

              <Text style={styles.metaText}>
                {plan.itemCount} ürün · {formatDate(plan.createdAt)}
              </Text>

              <Pressable style={styles.resultButton} onPress={() => openSummary(plan)}>
                <Ionicons name="stats-chart-outline" size={18} color={colors.blue} />
                <Text style={styles.resultButtonText}>Sonucu Gör</Text>
              </Pressable>
            </View>
          ))
        : null}

      <PlanSummaryModal
        visible={Boolean(summaryModalPlan)}
        plan={summaryModalPlan}
        summary={summaryModalPlan ? planSummaries[summaryModalPlan.planId]?.data : null}
        loading={summaryModalPlan ? Boolean(planSummaries[summaryModalPlan.planId]?.loading) : false}
        errorMessage={summaryModalPlan ? planSummaries[summaryModalPlan.planId]?.error : null}
        onClose={() => setSummaryModalPlan(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  intro: { color: colors.muted, marginBottom: 12, fontSize: 13 },
  errorText: { color: colors.red, fontWeight: "600", marginBottom: 10 },

  taskSection: { marginBottom: 4 },
  sectionTitle: {
    color: colors.dark,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
    marginTop: 4,
  },
  taskCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 13,
    marginBottom: 9,
  },
  taskTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  taskTitle: { color: colors.dark, fontSize: 15, fontWeight: "700" },
  taskMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  taskDate: { color: colors.muted, fontSize: 12, marginTop: 9 },
  lateBadge: {
    backgroundColor: "#FDECEC",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
  },
  lateText: { color: colors.red, fontWeight: "800", fontSize: 11 },
  empty: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { color: colors.dark, fontWeight: "700", marginTop: 8, fontSize: 14 },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  storeName: { color: colors.dark, fontSize: 16, fontWeight: "800" },
  planBadge: { color: colors.green, fontWeight: "700", fontSize: 12 },
  metaText: { color: colors.muted, fontSize: 12, marginTop: 4 },
  resultButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  resultButtonText: { color: colors.blue, fontWeight: "800", fontSize: 14 },
});
