import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
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

  Rol kuralı: alım tutarları (TL) yalnızca ADMIN ve MAGAZA_MUDURU'ne gösterilir.
  ŞOFÖR fiyat bilgisi göremez - bu projenin temel denetim kuralıdır.
*/
export default function Dashboard({ currentUser }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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

  const role = currentUser?.role;
  const canSeePrices = role === "ADMIN" || role === "MAGAZA_MUDURU";
  const canSeeIssues = role === "ADMIN" || role === "MAGAZA_MUDURU";

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

  const issues = data.recentIssues || [];
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

      {/* Alım tutarları - yalnızca fiyat görmeye yetkili roller */}
      {canSeePrices ? (
        <>
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
        </>
      ) : null}

      {/* Tespit edilen kayıp/fark uyarıları */}
      {canSeeIssues ? (
        <>
          <Text style={styles.sectionTitle}>Son Tespitler</Text>

          {issues.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="shield-checkmark-outline" size={34} color={colors.green} />
              <Text style={styles.emptyTitle}>Tespit yok</Text>
              <Text style={styles.emptyText}>
                Miktarlar tüm aşamalarda tutuyor.
              </Text>
            </View>
          ) : (
            issues.map((issue, index) => <IssueCard key={index} issue={issue} />)
          )}
        </>
      ) : null}
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
});
