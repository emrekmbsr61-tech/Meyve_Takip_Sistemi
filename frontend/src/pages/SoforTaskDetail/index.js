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

import { createCollectionsForPlan, getCollectionPlanDetail, getDeliverySummary } from "../../services/collectionService";
import { completeDelivery } from "../../services/taskService";
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

// TOPLAMA backend'de hâlâ bu isimle duruyor (mevcut veritabanı kayıtlarını bozmamak
// için enum adı değiştirilmedi), ama şoföre artık "Alım Görevi" olarak gösteriliyor.
// TESLIMAT, Alım Görevi tamamlandığında aynı şoföre otomatik atanan yeni görev türüdür.
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
  assignedUserId'si kullanılır.

  Görev türüne göre iki tamamen ayrı bölüm gösterilir:
    - TOPLAMA ("Alım Görevi"): mevcut toplama formu (ürün başına miktar girişi),
      "Alımı Tamamla" butonuyla biter. Bu bölümün mantığı ÖNCEKİ sürümle aynıdır,
      sadece başlık/buton metinleri değişti.
    - TESLIMAT ("Teslimat Görevi"): salt okunur bir özet (plan, mağaza, az önce
      toplanan ürün/miktarlar) + tek bir "Teslimatı Tamamla" butonu.

  Daha önce burada bulunan TransportLog tabanlı "Hale Vardım" / "Mağazaya Teslim
  Ettim" / planlanan-gerçek varış saatleri / 45 dakikalık pencere gösterimi
  tamamen kaldırıldı (TransportTimeline bileşeni silindi, burada hiç
  kullanılmıyor).
*/
export default function SoforTaskDetail({ route, navigation }) {
  const task = route.params?.task || {};

  const isAlimTask = task.taskType === "TOPLAMA";
  const isTeslimatTask = task.taskType === "TESLIMAT";
  const alreadyCompleted = task.status === "COMPLETED";

  // ---- Alım Görevi (toplama formu) verisi ----
  const [planDetail, setPlanDetail] = useState(null);
  const [collectedValues, setCollectedValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ---- Teslimat Görevi verisi ----
  const [deliverySummary, setDeliverySummary] = useState(null);
  const [deliveryLoading, setDeliveryLoading] = useState(true);
  const [deliveryError, setDeliveryError] = useState("");
  const [completingDelivery, setCompletingDelivery] = useState(false);

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
          setErrorMessage(error.message || "Alım detayı alınamadı.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (task.planId && task.assignedUserId && isAlimTask && !alreadyCompleted) {
      loadPlanDetail();
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.planId, task.assignedUserId]);

  useEffect(() => {
    let isMounted = true;

    async function loadDeliverySummary() {
      try {
        setDeliveryLoading(true);
        setDeliveryError("");

        const summary = await getDeliverySummary(task.planId, task.assignedUserId);

        if (isMounted) {
          setDeliverySummary(summary);
        }
      } catch (error) {
        if (isMounted) {
          setDeliveryError(error.message || "Teslimat bilgisi alınamadı.");
        }
      } finally {
        if (isMounted) setDeliveryLoading(false);
      }
    }

    if (task.planId && task.assignedUserId && isTeslimatTask && !alreadyCompleted) {
      loadDeliverySummary();
    } else {
      setDeliveryLoading(false);
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
        "Lütfen tüm ürünler için alınan miktarı (sıfırdan büyük) girin."
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

      Alert.alert("Alım tamamlandı", "Alım kaydınız başarıyla kaydedildi.", [
        {
          text: "Tamam",
          /*
            Bu ekrana her zaman ActiveTasks (SoforTaskList) içinden geçiliyor
            (bkz. SoforTaskList.js -> navigation.navigate("SoforTaskDetail", { task })).
            goBack() hem bu ekranı yığından kaldırır hem de ActiveTasks'ın
            useFocusEffect'ini tetikleyerek görev listesini yeniler (artık burada
            aynı plan için yeni oluşan Teslimat Görevi görünecektir).
          */
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert("Kaydedilemedi", error.message || "Alım kaydı oluşturulamadı.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteDelivery = async () => {
    if (completingDelivery) return;

    setCompletingDelivery(true);

    try {
      await completeDelivery(task.id, task.assignedUserId);

      Alert.alert("Teslimat tamamlandı", "Teslimat kaydınız başarıyla tamamlandı.", [
        { text: "Tamam", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Kaydedilemedi", error.message || "Teslimat tamamlanamadı.");
    } finally {
      setCompletingDelivery(false);
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
        <View style={styles.infoCard}>
          <Text style={styles.sectionNote}>Bu görev tamamlandı.</Text>
        </View>
      ) : isAlimTask ? (
        <>
          {loading ? (
            <ActivityIndicator color={colors.green} style={styles.loadingSpacing} />
          ) : null}

          {!loading && errorMessage ? (
            <View style={styles.infoCard}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

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
                <Text style={styles.sectionTitle}>Alacağınız Ürünler</Text>

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

                      {item.managerNote ? (
                        <Text style={styles.managerNoteText}>
                          Müdür notu: {item.managerNote}
                        </Text>
                      ) : null}

                      <Text style={styles.label}>
                        Alınan Miktar ({getUnitLabel(item.fruitUnit)})
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
                      {submitting ? "Kaydediliyor..." : "Alımı Tamamla"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </>
          ) : null}
        </>
      ) : isTeslimatTask ? (
        <>
          {deliveryLoading ? (
            <ActivityIndicator color={colors.orange} style={styles.loadingSpacing} />
          ) : null}

          {!deliveryLoading && deliveryError ? (
            <View style={styles.infoCard}>
              <Text style={styles.errorText}>{deliveryError}</Text>
            </View>
          ) : null}

          {!deliveryLoading && !deliveryError && deliverySummary ? (
            <>
              <View style={styles.infoCard}>
                <Text style={styles.sectionTitle}>Teslimat Bilgileri</Text>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Mağaza</Text>
                  <Text style={styles.infoValue}>
                    {deliverySummary.storeName}
                    {deliverySummary.storeId ? ` (#${deliverySummary.storeId})` : ""}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Plan</Text>
                  <Text style={styles.infoValue}>#{deliverySummary.planId}</Text>
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
                <Text style={styles.sectionTitle}>Teslim Edilecek Ürünler</Text>
                <Text style={styles.sectionNote}>
                  Alım Görevi sırasında kaydettiğiniz miktarlar aşağıda özetlenmiştir.
                </Text>

                {(deliverySummary.items || []).length === 0 ? (
                  <Text style={styles.emptyText}>Bu plana ait ürün bulunamadı.</Text>
                ) : null}

                {(deliverySummary.items || []).map((item) => (
                  <View key={item.fruitId} style={styles.deliveryRow}>
                    <Text style={styles.productName}>{item.fruitName}</Text>
                    <Text style={styles.deliveryQuantity}>
                      {item.collectedQuantity} {getUnitLabel(item.fruitUnit)}
                    </Text>
                  </View>
                ))}

                <Pressable
                  style={[
                    styles.deliveryButton,
                    completingDelivery && styles.submitButtonDisabled,
                  ]}
                  onPress={handleCompleteDelivery}
                  disabled={completingDelivery}
                >
                  <Text style={styles.submitButtonText}>
                    {completingDelivery ? "Kaydediliyor..." : "Teslimatı Tamamla"}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </>
      ) : (
        <View style={styles.infoCard}>
          <Text style={styles.sectionNote}>
            Bu görev türü için bir detay ekranı bulunmuyor.
          </Text>
        </View>
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
  managerNoteText: {
    color: colors.orange,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
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
  deliveryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  deliveryQuantity: { color: colors.orange, fontWeight: "800", fontSize: 14 },
  deliveryButton: {
    backgroundColor: colors.orange,
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 6,
  },
});