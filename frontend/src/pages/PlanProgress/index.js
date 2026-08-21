import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { getInProgressPlans } from "../../services/planProgressService";

const colors = {
  green: "#2E7D32",
  greenLight: "#EAF5EC",
  background: "#F4F7F4",
  white: "#FFFFFF",
  border: "#DDE7DF",
  text: "#17211B",
  gray: "#6B7280",
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
  Aşama filtreleri. "Tümü" dışındaki değerler backend'in gönderdiği TaskType
  değerleriyle birebir eşleşir; ekranda ayrıca bir dönüşüm yapılmaz.
*/
const FILTERS = [
  { key: "ALL", label: "Tümü" },
  { key: "ALIM", label: "Alım" },
  { key: "TOPLAMA", label: "Toplama" },
  { key: "TESLIMAT", label: "Teslimat" },
  { key: "ACCEPTANCE", label: "Mal Kabul" },
];

// Her aşamanın kendi ikonu ve rengi olur; müdür listeye bakınca ayırt edebilsin.
const STAGE_STYLE = {
  ALIM: { icon: "cart-outline", color: colors.orange, background: colors.orangeLight },
  TOPLAMA: { icon: "basket-outline", color: colors.blue, background: colors.blueLight },
  TESLIMAT: { icon: "car-outline", color: colors.purple, background: colors.purpleLight },
  ACCEPTANCE: { icon: "cube-outline", color: colors.green, background: colors.greenLight },
};

function formatDate(value) {
  if (!value) return "Süre belirtilmedi";

  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/*
  "Devam Eden İşlemler": müdürün "alımı yaptım, mal şu an nerede?" sorusunun
  cevabıdır. Tamamlanmamış her plan, o an beklediği aşamayla birlikte listelenir.

  Erişim: yalnızca ADMIN ve MAGAZA_MUDURU (bkz. Home ROLE_MENU_KEYS ve
  backend DeliveryPlanController üzerindeki @PreAuthorize).
*/
export default function PlanProgress({ currentUser }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const data = await getInProgressPlans(currentUser.id);
      setPlans(Array.isArray(data) ? data : []);
    } catch (error) {
      setPlans([]);
      setErrorMessage(error.message || "Devam eden işlemler alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  useFocusEffect(
    useCallback(() => {
      loadPlans();
    }, [loadPlans])
  );

  // Filtreleme ekranda yapılır; her seçimde backend'e yeniden gitmeye gerek yok.
  const visiblePlans = useMemo(() => {
    if (activeFilter === "ALL") {
      return plans;
    }

    return plans.filter((plan) => plan.stage === activeFilter);
  }, [plans, activeFilter]);

  // Filtre düğmelerinin yanında kaç plan olduğu yazsın diye sayılır.
  const counts = useMemo(() => {
    const result = { ALL: plans.length };

    for (const plan of plans) {
      result[plan.stage] = (result[plan.stage] || 0) + 1;
    }

    return result;
  }, [plans]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.intro}>
        Tamamlanmamış planların şu an hangi aşamada beklediğini gösterir.
      </Text>

      {/* Aşama filtreleri */}
      <View style={styles.filterRow}>
        {FILTERS.map((filter) => {
          const selected = activeFilter === filter.key;
          const count = counts[filter.key] || 0;

          return (
            <Pressable
              key={filter.key}
              style={[styles.filterChip, selected && styles.filterChipSelected]}
              onPress={() => setActiveFilter(filter.key)}
            >
              <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                {filter.label} ({count})
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? <ActivityIndicator color={colors.green} style={{ marginTop: 12 }} /> : null}

      {!loading && errorMessage ? (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={38} color={colors.red} />
          <Text style={styles.errorText}>{errorMessage}</Text>

          <Pressable style={styles.retryButton} onPress={loadPlans}>
            <Text style={styles.retryText}>Tekrar Dene</Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && !errorMessage && visiblePlans.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="checkmark-done-outline" size={40} color={colors.green} />
          <Text style={styles.emptyTitle}>
            {activeFilter === "ALL" ? "Devam eden işlem yok" : "Bu aşamada plan yok"}
          </Text>
          <Text style={styles.emptyText}>
            {activeFilter === "ALL"
              ? "Tüm planlar tamamlanmış görünüyor."
              : "Başka bir aşamayı seçerek bakabilirsiniz."}
          </Text>
        </View>
      ) : null}

      {!loading &&
        !errorMessage &&
        visiblePlans.map((plan) => {
          const stageStyle = STAGE_STYLE[plan.stage] || {
            icon: "ellipse-outline",
            color: colors.gray,
            background: colors.background,
          };

          return (
            <View
              key={plan.planId}
              style={[styles.planCard, plan.overdue && styles.planCardOverdue]}
            >
              <View style={styles.cardTop}>
                <View style={[styles.iconBox, { backgroundColor: stageStyle.background }]}>
                  <Ionicons name={stageStyle.icon} size={23} color={stageStyle.color} />
                </View>

                <View style={styles.titleArea}>
                  <Text style={styles.storeName}>{plan.storeName}</Text>
                  <Text style={styles.planMeta}>
                    Plan #{plan.planId} · {plan.itemCount} ürün
                  </Text>
                </View>

                {plan.overdue ? (
                  <View style={styles.overdueBadge}>
                    <Text style={styles.overdueText}>Gecikti</Text>
                  </View>
                ) : null}
              </View>

              {/* "Mal şu an nerede" satırı: ekranın asıl cevabı budur. */}
              <View style={[styles.stageRow, { backgroundColor: stageStyle.background }]}>
                <Text style={[styles.stageLabel, { color: stageStyle.color }]}>
                  {plan.stageLabel}
                </Text>
              </View>

              <View style={styles.footerRow}>
                <View style={styles.footerItem}>
                  <Ionicons name="person-outline" size={14} color={colors.gray} />
                  <Text style={styles.footerText}>{plan.assigneeName || "Atanmadı"}</Text>
                </View>

                <View style={styles.footerItem}>
                  <Ionicons name="time-outline" size={14} color={colors.gray} />
                  <Text style={[styles.footerText, plan.overdue && styles.footerTextOverdue]}>
                    {formatDate(plan.dueDate)}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  intro: { color: colors.gray, fontSize: 13, lineHeight: 19, marginBottom: 12 },

  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 13,
  },
  filterChipSelected: { borderColor: colors.green, backgroundColor: colors.greenLight },
  filterText: { color: colors.gray, fontWeight: "700", fontSize: 13 },
  filterTextSelected: { color: colors.green },

  planCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  planCardOverdue: { borderColor: "#F5B8B3" },
  cardTop: { flexDirection: "row", alignItems: "center" },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  titleArea: { flex: 1 },
  storeName: { color: colors.text, fontSize: 16, fontWeight: "800" },
  planMeta: { color: colors.gray, fontSize: 12, marginTop: 3 },
  overdueBadge: {
    backgroundColor: colors.redLight,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
  },
  overdueText: { color: colors.red, fontWeight: "800", fontSize: 11 },

  stageRow: { borderRadius: 11, paddingVertical: 9, paddingHorizontal: 12, marginTop: 12 },
  stageLabel: { fontWeight: "800", fontSize: 13 },

  footerRow: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 11 },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  footerText: { color: colors.gray, fontSize: 12, fontWeight: "600" },
  footerTextOverdue: { color: colors.red },

  errorCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#F1C6C3",
    borderRadius: 18,
    padding: 26,
  },
  errorText: { color: colors.gray, textAlign: "center", marginTop: 8 },
  retryButton: {
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 22,
    marginTop: 14,
  },
  retryText: { color: colors.white, fontWeight: "800" },

  emptyCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 28,
  },
  emptyTitle: { color: colors.text, fontWeight: "800", fontSize: 16, marginTop: 9 },
  emptyText: { color: colors.gray, textAlign: "center", marginTop: 4, fontSize: 13 },
});
