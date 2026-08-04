import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { createCollectionsForPlan, getCollectionPlanDetail } from "../../services/collectionService";
import { cleanQuantity, getUnitLabel } from "../../utils/unit";

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

  Görevin kendisi (id, planId, taskType, status, dueDate, assignedUserId)
  navigation parametresiyle gelir; backend'de tek bir görevi id ile getiren bir
  GET /api/tasks/{id} endpoint'i yok, bu yüzden SoforTaskList'in zaten sahip
  olduğu görev nesnesi doğrudan buraya taşınır. driverId olarak da bu görevin
  assignedUserId'si kullanılır (SoforTaskList her zaman yalnızca giriş yapan
  şoförün kendi görevlerini getirdiği için bu değer her zaman currentUser.id
  ile aynıdır).

  Ürün/tedarikçi bilgisi GET /api/collections/plans/{planId}?driverId= üzerinden
  gelir. Bu endpoint şoföre yalnızca güvenli alanları (planId, mağaza, fruitId,
  fruitName, fruitUnit, supplierCode, supplierName) döner; purchasedQuantity,
  unitPrice, totalPrice, salesPrice ve mağazanın istediği miktar (requiredQuantity)
  hiçbir zaman backend'den gelmez, bu yüzden burada da hiç gösterilmez.
*/
export default function SoforTaskDetail({ route, navigation }) {
  const task = route.params?.task || {};

  const [planDetail, setPlanDetail] = useState(null);
  const [collectedValues, setCollectedValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isToplamaTask = task.taskType === "TOPLAMA";
  const alreadyCompleted = task.status === "COMPLETED";

  useEffect(() => {
    let isMounted = true;

    async function loadPlanDetail() {
      try {
        setLoading(true);
        setErrorMessage("");

        const detail = await getCollectionPlanDetail(task.planId, task.assignedUserId);

        if (!isMounted) return;

        setPlanDetail(detail);

        const initialValues = {};
        (detail.items || []).forEach((item) => {
          initialValues[item.fruitId] = { collectedQuantity: "", notes: "" };
        });
        setCollectedValues(initialValues);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || "Toplama detayı alınamadı.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (task.planId && task.assignedUserId && isToplamaTask && !alreadyCompleted) {
      loadPlanDetail();
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.planId, task.assignedUserId]);

  const handleChange = (fruitId, field, value, fruitUnit) => {
    setCollectedValues((current) => ({
      ...current,
      [fruitId]: {
        ...current[fruitId],
        [field]: field === "collectedQuantity" ? cleanQuantity(value, fruitUnit) : value,
      },
    }));
  };

  const handleSubmit = async () => {
    if (submitting || !planDetail) return;

    const items = planDetail.items || [];

    const hasInvalidQuantity = items.some((item) => {
      const raw = collectedValues[item.fruitId]?.collectedQuantity;
      const quantity = Number(raw);
      return !raw || Number.isNaN(quantity) || quantity <= 0;
    });

    if (hasInvalidQuantity) {
      Alert.alert(
        "Eksik bilgi",
        "Lütfen tüm ürünler için toplanan miktarı (sıfırdan büyük) girin."
      );
      return;
    }

    setSubmitting(true);

    try {
      await createCollectionsForPlan({
        planId: planDetail.planId,
        createdBy: task.assignedUserId,
        items: items.map((item) => {
          const values = collectedValues[item.fruitId];
          return {
            fruitId: item.fruitId,
            collectedQuantity: Number(values.collectedQuantity),
            notes: values.notes ? values.notes.trim() : null,
          };
        }),
      });

      Alert.alert("Toplama tamamlandı", "Toplama kaydınız başarıyla kaydedildi.", [
        {
          text: "Tamam",
          /*
            Bu ekrana her zaman ActiveTasks (SoforTaskList) içinden geçiliyor
            (bkz. SoforTaskList.js -> navigation.navigate("SoforTaskDetail", { task })).
            goBack() hem bu ekranı yığından kaldırır hem de ActiveTasks'ın
            useFocusEffect'ini tetikleyerek görev listesini yeniler.
          */
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert("Kaydedilemedi", error.message || "Toplama kaydı oluşturulamadı.");
    } finally {
      setSubmitting(false);
    }
  };

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

      {alreadyCompleted ? (
        // Tamamlanan görevde kalan süre, miktar alanları ve buton hiç gösterilmez.
        <View style={styles.infoCard}>
          <Text style={styles.sectionNote}>Bu görev tamamlandı.</Text>
        </View>
      ) : !isToplamaTask ? (
        <View style={styles.infoCard}>
          <Text style={styles.sectionNote}>
            Bu görev türü için toplama ekranı bulunmuyor.
          </Text>
        </View>
      ) : (
        <>
          {loading ? (
            <ActivityIndicator color={colors.green} style={styles.loadingSpacing} />
          ) : null}

          {!loading && errorMessage ? (
            <View style={styles.infoCard}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/*
            Mağaza/son tarih/kalan süre bilgisi yalnızca backend'den plan detayı
            başarıyla geldiyse gösterilir; resolveStoreInfo mağaza adını
            çözemezse bile her zaman "Mağaza #<id>" gibi anlamlı bir metin
            döner, bu yüzden burada asla "Bulunamadı" gibi belirsiz bir metin
            yazılmaz.
          */}
          {!loading && !errorMessage && planDetail ? (
            <>
              <View style={styles.infoCard}>
                <Text style={styles.sectionTitle}>Görev Bilgileri</Text>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Mağaza</Text>
                  <Text style={styles.infoValue}>
                    {planDetail.storeName}
                    {planDetail.storeId ? ` (#${planDetail.storeId})` : ""}
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
                <Text style={styles.sectionTitle}>Topladığınız Ürünler</Text>
                <Text style={styles.sectionNote}>
                  Aşağıya, müdürün alım miktarından bağımsız olarak kendi
                  saydığınız miktarı girin.
                </Text>

                {(planDetail.items || []).length === 0 ? (
                  <Text style={styles.emptyText}>Bu plana ait ürün bulunamadı.</Text>
                ) : null}

                {(planDetail.items || []).map((item) => {
                  const values = collectedValues[item.fruitId] || {};

                  return (
                    <View key={item.fruitId} style={styles.productCard}>
                      <Text style={styles.productName}>{item.fruitName}</Text>
                      <Text style={styles.productSupplier}>
                        Tedarikçi:{" "}
                        {item.supplierCode
                          ? `${item.supplierCode} - ${item.supplierName}`
                          : item.supplierName || "Bilinmeyen tedarikçi"}
                      </Text>

                      <Text style={styles.label}>
                        Toplanan Miktar ({getUnitLabel(item.fruitUnit)})
                      </Text>
                      <TextInput
                        value={values.collectedQuantity}
                        onChangeText={(value) =>
                          handleChange(item.fruitId, "collectedQuantity", value, item.fruitUnit)
                        }
                        placeholder="0"
                        keyboardType="decimal-pad"
                        style={styles.input}
                      />

                      <Text style={styles.label}>Not (opsiyonel)</Text>
                      <TextInput
                        value={values.notes}
                        onChangeText={(value) => handleChange(item.fruitId, "notes", value)}
                        placeholder="Opsiyonel not..."
                        style={styles.input}
                      />
                    </View>
                  );
                })}

                {(planDetail.items || []).length > 0 ? (
                  <Pressable
                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                  >
                    <Text style={styles.submitButtonText}>
                      {submitting ? "Kaydediliyor..." : "Toplamayı Tamamla"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </>
          ) : null}
        </>
      )}
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
  loadingSpacing: { marginTop: 10, marginBottom: 16 },
  errorText: { color: colors.red, fontWeight: "600" },
  emptyText: { color: colors.muted, textAlign: "center", paddingVertical: 10 },
  productCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  productName: { color: colors.text, fontSize: 16, fontWeight: "800" },
  productSupplier: { color: colors.muted, fontSize: 12, marginTop: 3, marginBottom: 4 },
  label: { color: colors.text, fontWeight: "700", marginTop: 8, marginBottom: 6, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  submitButton: {
    backgroundColor: colors.green,
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 6,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: colors.white, fontWeight: "800", fontSize: 17 },
});