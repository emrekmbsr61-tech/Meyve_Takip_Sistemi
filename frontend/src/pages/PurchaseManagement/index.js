import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import {
  createPurchasesForPlan,
  getPendingPurchasePlans,
  getPurchasePlanDetail,
} from "../../services/purchaseService";
import { addExtraItemsToPlan } from "../../services/needListService";
import { getActiveSuppliers } from "../../services/supplierService";
import { addNotificationListener } from "../../services/websocketService";
import PurchaseItemRow from "./PurchaseItemRow";
import SupplierPickerModal, { formatSupplierLabel } from "./SupplierPickerModal";
import AddExtraProductModal from "./AddExtraProductModal";

const colors = {
  green: "#2E7D32",
  dark: "#17211B",
  background: "#F4F7F4",
  white: "#FFFFFF",
  border: "#DDE7DF",
  muted: "#6B7280",
  red: "#DC2626",
};

// createdDate değerini sıralama için milisaniyeye çevirir. Geçersiz/boşsa 0 döner.
function getComparableTime(plan) {
  if (!plan.createdDate) return 0;
  const time = new Date(plan.createdDate).getTime();
  return Number.isNaN(time) ? 0 : time;
}

// En yeni plan en üstte gösterilir; tarih yoksa/eşitse planId büyük olan önce gelir
// (NeedListList ekranındaki sıralama mantığıyla aynı).
function comparePlans(a, b) {
  const timeDiff = getComparableTime(b) - getComparableTime(a);
  return timeDiff !== 0 ? timeDiff : b.planId - a.planId;
}

function formatDate(value) {
  return value
    ? new Date(value).toLocaleString("tr-TR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Tarih yok";
}

export default function PurchaseManagement({ currentUser }) {
  const [view, setView] = useState("list"); // "list" | "detail"
  const [pendingPlans, setPendingPlans] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [selectedPlanId, setSelectedPlanId] = useState(null);
  // Personelin plan geneline yazdığı not; alım ekranının üstünde gösterilir.
  const [planNotes, setPlanNotes] = useState("");

  /*
    Müdür alım formunu doldururken personel planı değiştirirse burada uyarı
    tutulur. Form otomatik yenilenmez (girilen veriler kaybolmasın), müdür
    uyarıyı görüp kendisi listeye dönmeye karar verir.
  */
  const [planChangedWarning, setPlanChangedWarning] = useState("");
  const [selectedStoreName, setSelectedStoreName] = useState(null);
  const [planItems, setPlanItems] = useState([]);
  const [itemValues, setItemValues] = useState({});

  /*
    bir planın bütün ürünleri artık AYNI tedarikçiden alınıyor.
    Bu yüzden supplierId artık ürün bazında değil, plan bazında tek bir state.
  */
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [supplierPickerVisible, setSupplierPickerVisible] = useState(false);

  /*
    Ekstra ürün ekleme penceresi. Müdür, alımı girmeden önce planda eksik kalan
    bir ürünü buradan ekleyebilir; yeni bir plan AÇILMAZ, aynı planId'ye yeni
    ürün satırları eklenir (bkz. NeedListService.addExtraItemsToPlan).
  */
  const [extraModalVisible, setExtraModalVisible] = useState(false);
  const [extraSaving, setExtraSaving] = useState(false);
  const [extraError, setExtraError] = useState("");

  // ADMIN tüm bekleyen planları salt okunur izler; alım kaydedemez.
  const isReadOnly = currentUser.role === "ADMIN";

  const loadPendingPlans = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");

      const [plans, activeSuppliers] = await Promise.all([
        getPendingPurchasePlans(currentUser.id),
        getActiveSuppliers(),
      ]);

      setPendingPlans([...plans].sort(comparePlans));
      setSuppliers(Array.isArray(activeSuppliers) ? activeSuppliers : []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  useFocusEffect(
    useCallback(() => {
      setView("list");
      loadPendingPlans();
    }, [loadPendingPlans])
  );

  /*
    Ekran AÇIKKEN plan tarafında bir değişiklik olursa müdür anında haberdar
    olur. useFocusEffect tek başına yetmez: o yalnızca ekrana GİRİLDİĞİNDE
    çalışır, kullanıcı zaten ekrandayken tetiklenmez.

    İki ayrı davranış vardır:
      - Liste görünümündeyse: liste sessizce tazelenir.
      - Bir planın alım formunu DOLDURUYORSA: liste tazelenmez (girdiği
        veriler kaybolmasın), bunun yerine ekranda uyarı gösterilir. Müdürün
        eski miktar üzerinden alım yapmasını önlemek için önemlidir.
  */
  useEffect(() => {
    const PLAN_DEGISIKLIK_TIPLERI = [
      "ALIM_GOREVI_ATANDI",
      "IHTIYAC_GUNCELLENDI",
      "IHTIYAC_IPTAL_EDILDI",
    ];

    const removeListener = addNotificationListener((notification) => {
      if (!PLAN_DEGISIKLIK_TIPLERI.includes(notification?.type)) {
        return;
      }

      if (view === "list") {
        loadPendingPlans();
      } else {
        setPlanChangedWarning(
          notification.message || "Bu planda değişiklik yapıldı. Listeye dönüp yenileyin."
        );
      }
    });

    return removeListener;
  }, [loadPendingPlans, view]);

  // Bir plan seçildiğinde ürünlerini getirir; yalnızca alımı yapılmamış ürünler için giriş alanı açılır.
  const openPlan = async (planId, storeName) => {
    try {
      setLoading(true);
      setMessage("");

      const detail = await getPurchasePlanDetail(currentUser.id, planId);
      const remainingItems = detail.items.filter((item) => !item.alreadyPurchased);

      const initialValues = {};
      remainingItems.forEach((item) => {
        initialValues[item.fruitId] = {
          purchasedQuantity: "",
          unitPrice: "",
          salesPrice: "",
          // Satış fiyatı henüz elle değiştirilmedi; PurchaseItemRow alış fiyatına göre
          // otomatik hesaplayabilir (bkz. PurchaseItemRow.handleUnitPriceChange).
          salesPriceEdited: false,
          notes: "",
        };
      });

      setSelectedPlanId(planId);
      setSelectedStoreName(storeName);
      // Personelin plan geneline yazdığı not (varsa) müdüre gösterilir.
      setPlanNotes(detail.planNotes || "");
      // Yeni plan açılıyor; önceki plandan kalan değişiklik uyarısı temizlenir.
      setPlanChangedWarning("");
      setPlanItems(remainingItems);
      setItemValues(initialValues);
      // Farklı bir plana geçildiğinde önceki planın tedarikçi seçimi taşınmasın.
      setSelectedSupplierId(null);
      setView("detail");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const backToList = () => {
    setView("list");
    setSelectedPlanId(null);
    setSelectedStoreName(null);
    setPlanItems([]);
    setItemValues({});
    setSelectedSupplierId(null);
    setPlanNotes("");
    setPlanChangedWarning("");
    loadPendingPlans();
  };

  const updateItemValue = (fruitId, field, value) => {
    setItemValues((current) => ({
      ...current,
      [fruitId]: { ...current[fruitId], [field]: value },
    }));
  };

  // Kaydet butonunun aktif olması için ürün alanlarının geçerli olması gerekir.
  // Tedarikçi seçimi artık plan bazında olduğu için burada kontrol edilmez,
  // confirmSave içinde ayrı ve açık bir uyarıyla kontrol edilir (bkz. madde 8).
  const allItemsValid =
    planItems.length > 0 &&
    planItems.every((item) => {
      const values = itemValues[item.fruitId];
      if (!values) return false;

      const quantity = Number(values.purchasedQuantity);
      const unitPrice = Number(values.unitPrice);
      const salesPrice = Number(values.salesPrice);

      return (
        values.purchasedQuantity !== "" &&
        Number.isFinite(quantity) &&
        quantity > 0 &&
        values.unitPrice !== "" &&
        Number.isFinite(unitPrice) &&
        unitPrice >= 0 &&
        values.salesPrice !== "" &&
        Number.isFinite(salesPrice) &&
        salesPrice >= 0
      );
    });

  const confirmSave = () => {
    if (!selectedSupplierId) {
      Alert.alert("Tedarikçi seçilmedi", "Lütfen plan için bir tedarikçi seçin.");
      return;
    }

    Alert.alert(
      "Alım kaydedilsin mi?",
      `Plan #${selectedPlanId} için ${planItems.length} ürünlük alım kaydedilecek. Bu işlem geri alınamaz.`,
      [
        { text: "Vazgeç", style: "cancel" },
        { text: "Kaydet", onPress: handleSave },
      ]
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage("");

      const items = planItems.map((item) => {
        const values = itemValues[item.fruitId];

        return {
          fruitId: item.fruitId,
          purchasedQuantity: Number(values.purchasedQuantity),
          unitPrice: Number(values.unitPrice),
          salesPrice: Number(values.salesPrice),
          // Plan için seçilen tek tedarikçi, her ürün satırına aynen yazılır.
          supplierId: selectedSupplierId,
          notes: values.notes,
        };
      });

      const result = await createPurchasesForPlan(selectedPlanId, currentUser.id, items);

      Alert.alert("Kaydedildi", result.message || "Alım kaydı tamamlandı.");

      backToList();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  /*
    Seçili plana ekstra ürün ekler ve planı yeniden açar.
    Yeniden açmak şart: yeni ürün de alım formunda görünmeli, aksi halde
    "planın tüm ürünleri birlikte gönderilmelidir" kuralına takılırdı.
  */
  const saveExtraItems = async (items) => {
    if (items.length === 0) return;

    try {
      setExtraSaving(true);
      setExtraError("");

      await addExtraItemsToPlan(selectedPlanId, { managerId: currentUser.id, items });

      setExtraModalVisible(false);
      await openPlan(selectedPlanId, selectedStoreName);
    } catch (error) {
      setExtraError(error.message);
    } finally {
      setExtraSaving(false);
    }
  };

  const selectedSupplier = suppliers.find((supplier) => supplier.id === selectedSupplierId);

  if (view === "detail") {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Pressable style={styles.backRow} onPress={backToList}>
          <Ionicons name="arrow-back" size={20} color={colors.green} />
          <Text style={styles.backText}>Plan listesine dön</Text>
        </Pressable>

        <View style={styles.headerRow}>
          <Text style={styles.heading}>Plan #{selectedPlanId} Alımı</Text>

          {isReadOnly ? null : (
            <Pressable
              style={styles.supplierPickerButton}
              onPress={() => setSupplierPickerVisible(true)}
            >
              <Text
                style={[
                  styles.supplierPickerText,
                  !selectedSupplier && styles.supplierPickerPlaceholder,
                ]}
                numberOfLines={1}
              >
                {selectedSupplier ? formatSupplierLabel(selectedSupplier) : "Tedarikçi Seç"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.green} />
            </Pressable>
          )}
        </View>

        <Text style={styles.subheading}>
          {selectedStoreName} · {planItems.length} ürün birlikte kaydedilecek
          {isReadOnly ? " · Salt okunur" : ""}
        </Text>

        {/* Personelin plan geneline yazdığı not (varsa). */}
        {planNotes ? (
          <View style={styles.planNoteBox}>
            <Ionicons name="document-text-outline" size={16} color={colors.green} />
            <Text style={styles.planNoteText}>{planNotes}</Text>
          </View>
        ) : null}

        {/*
          Müdür bu formu doldururken personel planı değiştirdiyse uyarı çıkar.
          Alım eski miktar üzerinden yapılmasın diye listeye dönüp yenilemesi
          gerektiği açıkça söylenir.
        */}
        {planChangedWarning ? (
          <Pressable style={styles.planChangedBox} onPress={backToList}>
            <Ionicons name="refresh-circle" size={20} color={colors.red} />
            <View style={{ flex: 1 }}>
              <Text style={styles.planChangedText}>{planChangedWarning}</Text>
              <Text style={styles.planChangedHint}>
                Güncel miktarlar için dokunun ve planı yeniden açın.
              </Text>
            </View>
          </Pressable>
        ) : null}

        {message ? <Text style={styles.error}>{message}</Text> : null}

        {!isReadOnly && suppliers.length === 0 ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              Aktif tedarikçi bulunamadı. Alım kaydedilemez.
            </Text>
          </View>
        ) : null}

        {loading ? <ActivityIndicator color={colors.green} /> : null}

        {/*
          Ekstra ürün ekleme: ürün listesinin ÜSTÜNDE durur, çünkü müdürün
          önce "eksik bir şey var mı" diye bakıp eklemesi, sonra miktar/fiyat
          doldurması doğal sıradır. Salt okunur izleyen ADMIN'e gösterilmez.
        */}
        {isReadOnly ? null : (
          <Pressable style={styles.extraButton} onPress={() => setExtraModalVisible(true)}>
            <Ionicons name="add-circle-outline" size={19} color={colors.green} />
            <Text style={styles.extraButtonText}>Plana Ekstra Ürün Ekle</Text>
          </Pressable>
        )}

        {planItems.map((item) => (
          <PurchaseItemRow
            key={item.fruitId}
            item={item}
            values={itemValues[item.fruitId] || {}}
            onChange={(field, value) => updateItemValue(item.fruitId, field, value)}
            readOnly={isReadOnly}
          />
        ))}

        <SupplierPickerModal
          visible={supplierPickerVisible}
          suppliers={suppliers}
          selectedSupplierId={selectedSupplierId}
          onSelect={(supplierId) => setSelectedSupplierId(supplierId)}
          onClose={() => setSupplierPickerVisible(false)}
        />

        <AddExtraProductModal
          visible={extraModalVisible}
          existingFruitIds={planItems.map((item) => item.fruitId)}
          saving={extraSaving}
          errorMessage={extraError}
          onSave={saveExtraItems}
          onClose={() => setExtraModalVisible(false)}
        />

        {isReadOnly ? null : (
          <Pressable
            style={[styles.saveButton, (!allItemsValid || saving) && styles.saveButtonDisabled]}
            disabled={!allItemsValid || saving}
            onPress={confirmSave}
          >
            <Text style={styles.saveButtonText}>
              {saving ? "Kaydediliyor..." : "Alımı Kaydet"}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Alım İşlemleri</Text>
      <Text style={styles.subheading}>
        Alımı henüz tamamlanmamış ihtiyaç planları burada listelenir.
      </Text>

      {message ? <Text style={styles.error}>{message}</Text> : null}

      {loading ? <ActivityIndicator color={colors.green} /> : null}

      {!loading && pendingPlans.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="checkmark-done-outline" size={42} color={colors.muted} />
          <Text style={styles.emptyTitle}>Alım bekleyen plan yok</Text>
        </View>
      ) : null}

      {pendingPlans.map((plan) => (
        <Pressable
          key={plan.planId}
          style={styles.planCard}
          onPress={() => openPlan(plan.planId, plan.storeName)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.planStore}>{plan.storeName}</Text>
            <Text style={styles.planMeta}>
              Plan #{plan.planId} · {formatDate(plan.createdDate)}
            </Text>
            <Text style={styles.planMeta}>{plan.itemCount} ürün</Text>
          </View>

          <Ionicons name="chevron-forward" size={22} color={colors.muted} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  // Ekran dar olduğunda başlık ve tedarikçi butonu alt alta düşebilsin diye
  // flexWrap kullanılır; her ikisine de üstten boşluk (gap) bırakılır.
  headerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  heading: { color: colors.dark, fontSize: 21, fontWeight: "800", flexShrink: 1 },
  subheading: { color: colors.muted, marginTop: 3, marginBottom: 12, fontSize: 13 },
  planNoteBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EAF5EC",
    borderRadius: 12,
    padding: 11,
    marginBottom: 12,
  },
  planNoteText: { flex: 1, color: colors.green, fontSize: 13, fontWeight: "600" },
  planChangedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#FDECEC",
    borderWidth: 1,
    borderColor: "#F5B8B3",
    borderRadius: 12,
    padding: 11,
    marginBottom: 12,
  },
  planChangedText: { color: colors.red, fontSize: 13, fontWeight: "700" },
  planChangedHint: { color: colors.red, fontSize: 11, marginTop: 2 },
  supplierPickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    maxWidth: "100%",
  },
  supplierPickerText: { color: colors.green, fontWeight: "700", fontSize: 14, flexShrink: 1 },
  supplierPickerPlaceholder: { color: colors.muted, fontWeight: "600" },
  error: { color: colors.red, fontWeight: "600", marginBottom: 12 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 },
  backText: { color: colors.green, fontWeight: "700" },
  planCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 13,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
  },
  planStore: { color: colors.dark, fontSize: 16, fontWeight: "800" },
  planMeta: { color: colors.muted, marginTop: 2, fontSize: 12 },
  empty: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { color: colors.dark, fontWeight: "700", marginTop: 10 },
  warningCard: {
    backgroundColor: "#FDECEC",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  warningText: { color: colors.red, fontWeight: "700" },
  saveButton: {
    backgroundColor: colors.green,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    marginTop: 6,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: colors.white, fontSize: 16, fontWeight: "800" },
  extraButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.green,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  extraButtonText: { color: colors.green, fontWeight: "800", fontSize: 14 },
});
