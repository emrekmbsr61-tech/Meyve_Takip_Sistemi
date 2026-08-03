import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { getNeedLists } from "../../services/needListService";
import { getUnitLabel } from "../../utils/unit";

const colors = {
  green: "#2E7D32",
  greenLight: "#EAF5EC",
  background: "#F6F8F6",
  white: "#FFFFFF",
  border: "#DFE7E0",
  text: "#132118",
  muted: "#708075",
  red: "#C62828",
  orange: "#C96800",
  orangeLight: "#FFF4E2",
};

const TASK_TYPE_LABELS = {
  ALIM: "Alım",
  TOPLAMA: "Toplama",
  ACCEPTANCE: "Mal Kabul",
};

const TASK_STATUS_LABELS = {
  PENDING: "Bekliyor",
  IN_PROGRESS: "Devam Ediyor",
  COMPLETED: "Tamamlandı",
};

function formatDateTime(value) {
  if (!value) return "Belirtilmedi";

  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRemaining(dueDate) {
  if (!dueDate) return "Süre belirtilmedi";

  const diffMs = new Date(dueDate).getTime() - Date.now();
  if (diffMs <= 0) return "Süresi geçti";

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours} sa ${minutes} dk kaldı`;
}

/*
  ŞOFÖR'ün Aktif Görevler kartına basınca açılan detay ekranı.

  Görevin kendisi (id, planId, taskType, status, dueDate) navigation parametresiyle
  gelir; backend'de tek bir görevi id ile getiren bir GET /api/tasks/{id} endpoint'i
  yok (TaskAssignmentController yalnızca userId'ye göre liste ve /start döner), bu
  yüzden yeniden bir ağ isteği yapmak yerine SoforTaskList'in zaten sahip olduğu
  görev nesnesi doğrudan buraya taşınır.

  Plan ürünleri GET /api/need-lists üzerinden planId'ye göre filtrelenerek getirilir
  (bu endpoint rol kısıtlaması olmadığı için SOFOR da erişebilir).

  ÖNEMLİ: Burada gösterilen miktarlar NeedList.requiredQuantity, yani planın
  İHTİYAÇ (talep edilen) miktarlarıdır. Gerçekte SATIN ALINAN miktar ve tedarikçi
  bilgisi Purchase kayıtlarındadır, ama GET /api/purchases/plans/{planId}
  yalnızca MAGAZA_MUDURU/ADMIN'e açıktır (PurchaseService.requireViewer SOFOR'u
  reddeder). Bu yüzden o veri burada GÖSTERİLMEZ, uydurulmaz; ekranda da
  açıkça belirtilir.
*/
export default function SoforTaskDetail({ route }) {
  const task = route.params?.task || {};

  const [planInfo, setPlanInfo] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPlanInfo() {
      try {
        setLoading(true);
        setErrorMessage("");

        const needLists = await getNeedLists();
        const planItems = needLists.filter((item) => item.planId === task.planId);

        if (!isMounted) return;

        if (planItems.length > 0) {
          setPlanInfo({
            storeId: planItems[0].storeId,
            storeName: planItems[0].storeName,
          });
        }

        setItems(planItems);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || "Plan bilgisi alınamadı.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (task.planId) {
      loadPlanInfo();
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [task.planId]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.taskTitle}>
          {TASK_TYPE_LABELS[task.taskType] || task.taskType || "Görev"}
        </Text>
        <Text style={styles.taskSubtitle}>Plan #{task.planId ?? "-"}</Text>

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {TASK_STATUS_LABELS[task.status] || task.status || "-"}
          </Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Görev Bilgileri</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mağaza</Text>
          <Text style={styles.infoValue}>
            {planInfo?.storeName
              ? `${planInfo.storeName}${planInfo.storeId ? ` (#${planInfo.storeId})` : ""}`
              : loading
              ? "Yükleniyor..."
              : "Bulunamadı"}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Son tarih</Text>
          <Text style={styles.infoValue}>{formatDateTime(task.dueDate)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Kalan süre</Text>
          <Text style={styles.infoValue}>{formatRemaining(task.dueDate)}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Plana Ait İhtiyaç Ürünleri</Text>
        <Text style={styles.sectionNote}>
          Bu liste planın İHTİYAÇ miktarlarını gösterir. Satın alınan gerçek
          miktar ve tedarikçi bilgisi şoför yetkisiyle görüntülenemiyor.
        </Text>

        {loading ? <ActivityIndicator color={colors.green} style={styles.loadingSpacing} /> : null}

        {!loading && errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        {!loading && !errorMessage && items.length === 0 ? (
          <Text style={styles.emptyText}>Bu plana ait ürün bulunamadı.</Text>
        ) : null}

        {!loading &&
          !errorMessage &&
          items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.fruitName}</Text>
              <Text style={styles.itemQuantity}>
                {item.requiredQuantity} {getUnitLabel(item.fruitUnit)}
              </Text>
            </View>
          ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  headerCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
  },
  taskTitle: { color: colors.text, fontSize: 22, fontWeight: "800" },
  taskSubtitle: { color: colors.muted, fontSize: 14, marginTop: 4 },
  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.greenLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    marginTop: 12,
  },
  statusText: { color: colors.green, fontWeight: "700", fontSize: 12 },
  infoCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "800", marginBottom: 10 },
  sectionNote: { color: colors.muted, fontSize: 12, lineHeight: 17, marginBottom: 12 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: { color: colors.muted, fontWeight: "600" },
  infoValue: { color: colors.text, fontWeight: "700" },
  loadingSpacing: { marginTop: 10 },
  errorText: { color: colors.red, fontWeight: "600" },
  emptyText: { color: colors.muted, textAlign: "center", paddingVertical: 10 },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemName: { color: colors.text, fontWeight: "700" },
  itemQuantity: { color: colors.muted, fontWeight: "600" },
});
