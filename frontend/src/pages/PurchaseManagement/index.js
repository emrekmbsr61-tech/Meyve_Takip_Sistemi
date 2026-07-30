import { useCallback, useState } from "react";
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
import { getActiveSuppliers } from "../../services/supplierService";
import PurchaseItemRow from "./PurchaseItemRow";

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
  const [selectedStoreName, setSelectedStoreName] = useState(null);
  const [planItems, setPlanItems] = useState([]);
  const [itemValues, setItemValues] = useState({});

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
          supplierId: null,
          notes: "",
        };
      });

      setSelectedPlanId(planId);
      setSelectedStoreName(storeName);
      setPlanItems(remainingItems);
      setItemValues(initialValues);
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
    loadPendingPlans();
  };

  const updateItemValue = (fruitId, field, value) => {
    setItemValues((current) => ({
      ...current,
      [fruitId]: { ...current[fruitId], [field]: value },
    }));
  };

  // Kaydet butonunun aktif olması için bütün zorunlu alanların geçerli olması gerekir.
  const allItemsValid =
    planItems.length > 0 &&
    suppliers.length > 0 &&
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
        salesPrice >= 0 &&
        Boolean(values.supplierId)
      );
    });

  const confirmSave = () => {
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
          supplierId: values.supplierId,
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

  if (view === "detail") {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Pressable style={styles.backRow} onPress={backToList}>
          <Ionicons name="arrow-back" size={20} color={colors.green} />
          <Text style={styles.backText}>Plan listesine dön</Text>
        </Pressable>

        <Text style={styles.heading}>Plan #{selectedPlanId} Alımı</Text>
        <Text style={styles.subheading}>
          {selectedStoreName}
          {isReadOnly ? " · Salt okunur" : ""}
        </Text>

        {message ? <Text style={styles.error}>{message}</Text> : null}

        {!isReadOnly && suppliers.length === 0 ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              Aktif tedarikçi bulunamadı. Alım kaydedilemez.
            </Text>
          </View>
        ) : null}

        {loading ? <ActivityIndicator color={colors.green} /> : null}

        {planItems.map((item) => (
          <PurchaseItemRow
            key={item.fruitId}
            item={item}
            values={itemValues[item.fruitId] || {}}
            onChange={(field, value) => updateItemValue(item.fruitId, field, value)}
            suppliers={suppliers}
            readOnly={isReadOnly}
          />
        ))}

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
  content: { padding: 20, paddingBottom: 40 },
  heading: { color: colors.dark, fontSize: 24, fontWeight: "800" },
  subheading: { color: colors.muted, marginTop: 4, marginBottom: 16 },
  error: { color: colors.red, fontWeight: "600", marginBottom: 12 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 },
  backText: { color: colors.green, fontWeight: "700" },
  planCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  planStore: { color: colors.dark, fontSize: 18, fontWeight: "800" },
  planMeta: { color: colors.muted, marginTop: 3 },
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
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginTop: 6,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: colors.white, fontSize: 16, fontWeight: "800" },
});
