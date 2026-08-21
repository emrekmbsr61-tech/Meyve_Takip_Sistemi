import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { getDashboard } from "../../services/dashboardService";
import IssueCard from "./IssueCard";

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
  red: "#DC2626",
  redLight: "#FDECEC",
};

/*
  "Özet" ekranı: sistemin genel durumunu tek bakışta gösterir.

  Verinin tamamı tek bir istekle backend'den gelir (GET /api/dashboard);
  bu ekran hiçbir sayıyı kendisi hesaplamaz veya uydurmaz.

  Erişim: Bu ekrana yalnızca ADMIN ve MAGAZA_MUDURU girebilir; ana ekrandaki
  "Özet" kartı diğer rollere hiç gösterilmez (bkz. Home/index.js
  ROLE_MENU_KEYS). Bu yüzden ekranın içinde ayrıca rol kontrolü yapılmaz -
  içerideki alım tutarlarını görmesi sakıncalı olan roller buraya zaten
  ulaşamaz.
*/
export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // O an açık olan planın numarası; aynı anda tek bir plan açık kalır.
  const [expandedPlanKey, setExpandedPlanKey] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      setErrorMessage("");
      setData(await getDashboard());
    } catch (error) {
      setErrorMessage(error.message || "Özet bilgiler alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  /*
    Farkları PLAN bazında gruplar.

    Neden: backend her ürün için ayrı bir satır döner. Bir planda 5 üründe fark
    varsa ekranda alt alta 5 kart görünüyordu ve hangi kartın hangi plana ait
    olduğu karışıyordu. Artık önce plan kartları listelenir; bir plana
    dokununca YALNIZCA o planın ürün farkları açılır.

    Not: Bu hook, aşağıdaki erken "return"lerin ÜSTÜNDE olmak zorundadır -
    React hook'ları koşullu çalıştırılamaz. Bu yüzden data henüz yokken de
    güvenle çalışacak şekilde (data?.) yazılmıştır.
  */
  const issueGroups = useMemo(() => {
    const groupsByPlan = new Map();

    for (const issue of data?.recentIssues || []) {
      const key = issue.planId ?? "bilinmeyen";

      if (!groupsByPlan.has(key)) {
        groupsByPlan.set(key, {
          key,
          planId: issue.planId,
          storeName: issue.storeName,
          completedAt: issue.completedAt,
          lossCount: 0,
          items: [],
        });
      }

      const group = groupsByPlan.get(key);
      group.items.push(issue);

      if (issue.lossDetected) {
        group.lossCount += 1;
      }
    }

    return Array.from(groupsByPlan.values());
  }, [data]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.gray} />
        <Text style={styles.errorText}>{errorMessage}</Text>
      </View>
    );
  }

  if (!data) {
    return null;
  }

  const problemCount = data.criticalIssueCount + data.warningIssueCount;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Durum bandı: her şey yolunda mı, değil mi - tek bakışta */}
      <View
        style={[
          styles.banner,
          data.criticalIssueCount > 0
            ? styles.bannerCritical
            : problemCount > 0
            ? styles.bannerWarning
            : styles.bannerOk,
        ]}
      >
        <Ionicons
          name={
            data.criticalIssueCount > 0
              ? "alert-circle"
              : problemCount > 0
              ? "warning"
              : "checkmark-circle"
          }
          size={26}
          color={colors.white}
        />

        <View style={styles.bannerTextArea}>
          <Text style={styles.bannerTitle}>
            {data.criticalIssueCount > 0
              ? "Kayıp şüphesi var"
              : problemCount > 0
              ? "Dikkat edilmesi gereken farklar var"
              : "Her şey yolunda"}
          </Text>

          <Text style={styles.bannerSubtitle}>
            {data.criticalIssueCount > 0
              ? `${data.criticalIssueCount} kritik, ${data.warningIssueCount} uyarı`
              : problemCount > 0
              ? `${data.warningIssueCount} uyarı`
              : "Miktar farkı tespit edilmedi"}
          </Text>
        </View>
      </View>

      {/* Temel sayılar */}
      <Text style={styles.sectionTitle}>Durum</Text>

      <View style={styles.grid}>
        <StatCard
          icon="nutrition-outline"
          color={colors.green}
          background={colors.greenLight}
          value={data.totalFruitCount}
          label="Kayıtlı ürün"
        />
        <StatCard
          icon="clipboard-outline"
          color={colors.blue}
          background={colors.blueLight}
          value={data.activePlanCount}
          label="Devam eden plan"
        />
        <StatCard
          icon="time-outline"
          color={colors.orange}
          background={colors.orangeLight}
          value={data.activeTaskCount}
          label="Aktif görev"
        />
        <StatCard
          icon="alert-circle-outline"
          color={data.overdueTaskCount > 0 ? colors.red : colors.gray}
          background={data.overdueTaskCount > 0 ? colors.redLight : colors.background}
          value={data.overdueTaskCount}
          label="Geciken görev"
        />
      </View>

      {/* Alım tutarları */}
      <Text style={styles.sectionTitle}>Alım Tutarları</Text>

      <View style={styles.moneyCard}>
        <View style={styles.moneyRow}>
          <Text style={styles.moneyLabel}>Bugün</Text>
          <Text style={styles.moneyValue}>{formatMoney(data.todayPurchaseTotal)}</Text>
        </View>

        <View style={styles.moneyDivider} />

        <View style={styles.moneyRow}>
          <Text style={styles.moneyLabel}>Son 7 gün</Text>
          <Text style={styles.moneyValue}>
            {formatMoney(data.lastSevenDaysPurchaseTotal)}
          </Text>
        </View>
      </View>

      {/*
        Bu bölüm yalnızca TAMAMLANMIŞ planları (mal kabulü bitmiş) tarar.
        Devam eden bir plan burada hiç görünmez - süreç bitmeden gösterilen
        ara bulgular kafa karıştırıyordu, artık yalnızca son hâli gösterilir.
      */}
      <Text style={styles.sectionTitle}>Miktar Farkları</Text>

      {issueGroups.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="shield-checkmark-outline" size={34} color={colors.green} />
          <Text style={styles.emptyTitle}>Fark yok</Text>
          <Text style={styles.emptyText}>Tamamlanan planlarda miktar farkı bulunamadı.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionHint}>
            Fark tespit edilen planlar (en yeniden eskiye). Ayrıntıyı görmek için bir plana dokunun.
          </Text>

          {issueGroups.map((group) => {
            const acik = expandedPlanKey === group.key;
            const kayipVar = group.lossCount > 0;

            return (
              <View key={group.key} style={styles.planGroup}>
                {/* Plan başlığı: dokununca o planın ürün farkları açılır/kapanır */}
                <Pressable
                  style={styles.planHeader}
                  onPress={() => setExpandedPlanKey(acik ? null : group.key)}
                >
                  <View
                    style={[
                      styles.planIconBox,
                      { backgroundColor: kayipVar ? colors.redLight : colors.orangeLight },
                    ]}
                  >
                    <Ionicons
                      name={kayipVar ? "alert-circle-outline" : "warning-outline"}
                      size={19}
                      color={kayipVar ? colors.red : colors.orange}
                    />
                  </View>

                  <View style={styles.planHeaderText}>
                    <Text style={styles.planTitle}>
                      {group.storeName || "Bilinmeyen mağaza"}
                    </Text>

                    <Text style={styles.planMeta}>
                      {group.planId ? `Plan #${group.planId} · ` : ""}
                      {group.items.length} üründe fark
                      {kayipVar ? ` · ${group.lossCount} kayıp şüphesi` : ""}
                    </Text>
                  </View>

                  <Ionicons
                    name={acik ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={colors.gray}
                  />
                </Pressable>

                {/* Yalnızca açık plandaki ürün kartları çizilir */}
                {acik ? (
                  <View style={styles.planBody}>
                    {group.items.map((issue, index) => (
                      <IssueCard key={index} issue={issue} />
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

// Tek bir sayı kutusu.
function StatCard({ icon, color, background, value, label }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.iconBox, { backgroundColor: background }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>

      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// Tutarı "1.234,50 TL" biçiminde gösterir.
function formatMoney(value) {
  const amount = Number(value || 0);

  return `${amount.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} TL`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    padding: 24,
    gap: 10,
  },
  errorText: { color: colors.gray, textAlign: "center" },

  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  bannerOk: { backgroundColor: colors.green },
  bannerWarning: { backgroundColor: colors.orange },
  bannerCritical: { backgroundColor: colors.red },
  bannerTextArea: { flex: 1 },
  bannerTitle: { color: colors.white, fontSize: 17, fontWeight: "800" },
  bannerSubtitle: { color: colors.white, fontSize: 13, marginTop: 3, opacity: 0.9 },

  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
    marginTop: 4,
  },
  sectionHint: { color: colors.gray, fontSize: 12, marginBottom: 10, lineHeight: 17 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  statCard: {
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },
  statValue: { color: colors.text, fontSize: 22, fontWeight: "800" },
  statLabel: { color: colors.gray, fontSize: 13, marginTop: 2 },

  moneyCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  moneyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  moneyLabel: { color: colors.gray, fontSize: 14, fontWeight: "600" },
  moneyValue: { color: colors.green, fontSize: 18, fontWeight: "800" },
  moneyDivider: { height: 1, backgroundColor: colors.border },

  emptyCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  emptyTitle: { color: colors.text, fontWeight: "800", marginTop: 8, fontSize: 15 },
  emptyText: { color: colors.gray, fontSize: 13, marginTop: 3, textAlign: "center" },

  planGroup: { marginBottom: 10 },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 13,
  },
  planIconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  planHeaderText: { flex: 1 },
  planTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  planMeta: { color: colors.gray, fontSize: 12, marginTop: 3 },
  // Açılan ürün kartları, ait oldukları planın altında hafif içeriden başlar.
  planBody: { marginTop: 9, paddingLeft: 10 },
});
