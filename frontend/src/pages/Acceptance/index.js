import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { getNeedLists } from "../../services/needListService";
import { createAcceptance } from "../../services/acceptanceService";
import { getUnitLabel } from "../../utils/unit";

const colors = { green: "#2E7D32", dark: "#112018", background: "#F6F8F6", white: "#FFFFFF", border: "#DFE7E0", muted: "#718077", light: "#F3F6F3", red: "#D92D20" };

function numberText(value) { return String(value ?? "").replace(",", ".").replace(/[^0-9.]/g, ""); }

// Mal kabulü tamamlanan ihtiyaçları ekranda tekrar göstermemek için kullanılır.
function isOpenNeed(item) {
  const status = String(item.status || "").toUpperCase();

  return status !== "APPROVED" && status !== "COMPLETED";
}

export default function Acceptance({ currentUser, route }) {
  const [needLists, setNeedLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState(route.params?.planId || null);
  const [quantities, setQuantities] = useState({});
  const [damaged, setDamaged] = useState({});
  const [reasons, setReasons] = useState({});

  // Backend'den ihtiyaçları alır.
// Mal kabulü tamamlanan APPROVED kayıtları listeden çıkarır.
const loadNeeds = useCallback(async () => {
  try {
    setLoading(true);
    setMessage("");

    const data = await getNeedLists();

    // Yalnızca henüz kabul edilmemiş ihtiyaçlar kalır.
    const openNeeds = data.filter(isOpenNeed);

    setNeedLists(openNeeds);

    // Kaydetme işleminden sonra kalan planları bulabilmek için geri döndürüyoruz.
    return openNeeds;
  } catch (error) {
    setMessage(error.message);
    return [];
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => { loadNeeds(); }, [loadNeeds]);
  useFocusEffect(useCallback(() => { loadNeeds(); }, [loadNeeds]));

  const planIds = useMemo(() => [...new Set(needLists.map((item) => item.planId))], [needLists]);
  const activePlanId = selectedPlanId || planIds[0];
  const items = useMemo(() => needLists.filter((item) => item.planId === activePlanId), [needLists, activePlanId]);

  // planId -> storeName eşlemesi (her plan tek mağazaya aittir; ad backend'den gelir).
  const storeNameByPlan = useMemo(() => {
    const map = {};
    needLists.forEach((item) => {
      if (!(item.planId in map)) map[item.planId] = item.storeName;
    });
    return map;
  }, [needLists]);

  const setQuantity = (id, field, value) => setQuantities((current) => ({ ...current, [id]: { ...current[id], [field]: numberText(value) } }));

  const saveAcceptance = async () => {
    if (!activePlanId || !items.length) return;
    try {
      const acceptanceItems = items.map((item) => {
        const entry = quantities[item.id] || {};
        const acceptedQuantity = Number(entry.accepted || 0);
        const rejectedQuantity = Number(entry.rejected || 0);
        if (acceptedQuantity + rejectedQuantity > item.requiredQuantity) throw new Error(`${item.fruitName} için toplam miktar bekleneni geçemez.`);
        return { needListId: item.id, fruitId: item.fruitId, expectedQuantity: item.requiredQuantity, acceptedQuantity, rejectedQuantity, damaged: Boolean(damaged[item.id]), rejectionReason: reasons[item.id] || "" };
      });
      setSaving(true); setMessage("");

      // Hangi planın kaydedildiğini geçici olarak tutuyoruz.
const completedPlanId = activePlanId;

await createAcceptance({
  planId: completedPlanId,
  receivedBy: currentUser.id,
  items: acceptanceItems,
});

// Form alanlarını temizler.
setQuantities({});
setDamaged({});
setReasons({});

// Backend'den veriler yeniden alınır.
// APPROVED olan plan artık openNeeds içinde bulunmaz.
const remainingNeeds = await loadNeeds();

// Kalan plan numaralarını çıkarır.
const remainingPlanIds = [
  ...new Set(remainingNeeds.map((item) => item.planId)),
];

// Başka plan varsa onu açar, yoksa seçim boş kalır.
setSelectedPlanId(remainingPlanIds[0] || null);

Alert.alert(
  "Kaydedildi",
  remainingPlanIds.length > 0
    ? "Mal kabul tamamlandı. Sıradaki plan açıldı."
    : "Mal kabul tamamlandı. Kabul bekleyen plan kalmadı."
);

    } catch (error) { setMessage(error.message); } finally { setSaving(false); }
  };

  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <Text style={styles.intro}>Teslim edilen her ürünün kabul ve red miktarını girin.</Text>
    {message ? <Text style={styles.error}>{message}</Text> : null}
    {loading ? <ActivityIndicator color={colors.green} /> : null}
    {!loading && planIds.length === 0 ? <View style={styles.empty}><Ionicons name="cube-outline" size={42} color={colors.muted} /><Text style={styles.emptyTitle}>Kabul edilecek plan yok</Text><Text style={styles.emptyText}>Önce bir ihtiyaç planı oluşturun.</Text></View> : null}
    {planIds.length > 1 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.planTabs}>{planIds.map((planId) => <Pressable key={planId} onPress={() => setSelectedPlanId(planId)} style={[styles.planTab, activePlanId === planId && styles.selectedPlanTab]}><Text style={[styles.planTabText, activePlanId === planId && styles.selectedPlanTabText]}>{storeNameByPlan[planId]}</Text></Pressable>)}</ScrollView> : null}
    {items.map((item) => { const entry = quantities[item.id] || {}; return <View key={item.id} style={styles.card}>
      <View style={styles.productHeader}><View style={styles.imagePlaceholder}><Ionicons name="image-outline" size={27} color="#AAB7AE" /></View><View style={{ flex: 1 }}><Text style={styles.productName}>{item.fruitName}</Text><Text style={styles.productCode}>Ürün kodu: {item.fruitId}</Text></View><View><Text style={styles.expectedLabel}>BEKLENEN</Text><Text style={styles.expectedValue}>{item.requiredQuantity} {getUnitLabel(item.fruitUnit)}</Text></View></View>
      <View style={styles.quantityRow}><View style={styles.quantityArea}><Text style={styles.label}>Kabul edilen</Text><View style={styles.numberBox}><TextInput value={entry.accepted || ""} onChangeText={(value) => setQuantity(item.id, "accepted", value)} keyboardType="decimal-pad" placeholder="0" style={styles.numberInput}/><Text style={styles.unit}>{getUnitLabel(item.fruitUnit)}</Text></View></View><View style={styles.quantityArea}><Text style={styles.label}>Reddedilen</Text><View style={styles.numberBox}><TextInput value={entry.rejected || ""} onChangeText={(value) => setQuantity(item.id, "rejected", value)} keyboardType="decimal-pad" placeholder="0" style={styles.numberInput}/><Text style={styles.unit}>{getUnitLabel(item.fruitUnit)}</Text></View></View></View>
      <View style={styles.damageRow}><Text style={styles.damageText}>Hasarlı ürün</Text><Switch value={Boolean(damaged[item.id])} onValueChange={(value) => setDamaged((current) => ({ ...current, [item.id]: value }))} trackColor={{ false: "#D8DEDA", true: "#A9D6AC" }} thumbColor={damaged[item.id] ? colors.green : colors.white}/></View>
      <TextInput value={reasons[item.id] || ""} onChangeText={(value) => setReasons((current) => ({ ...current, [item.id]: value }))} placeholder="Açıklama / red nedeni (opsiyonel)" style={styles.reasonInput}/>
    </View>; })}
    {items.length ? <Pressable disabled={saving} onPress={saveAcceptance} style={[styles.saveButton, saving && styles.disabled]}><Text style={styles.saveText}>{saving ? "Kaydediliyor..." : "Mal Kabulü Kaydet"}</Text></Pressable> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 40 }, intro: { color: colors.muted, marginBottom: 14, lineHeight: 21 }, error: { color: colors.red, fontWeight: "600", marginBottom: 10 }, planTabs: { gap: 8, paddingBottom: 14 }, planTab: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 20 }, selectedPlanTab: { backgroundColor: "#EAF5EC", borderColor: colors.green }, planTabText: { color: colors.muted, fontWeight: "700" }, selectedPlanTabText: { color: colors.green }, card: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1, borderRadius: 21, padding: 14, marginBottom: 16 }, productHeader: { flexDirection: "row", alignItems: "center", gap: 12 }, imagePlaceholder: { width: 57, height: 57, borderRadius: 13, backgroundColor: colors.light, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }, productName: { color: colors.dark, fontWeight: "800", fontSize: 19 }, productCode: { color: colors.muted, marginTop: 3 }, expectedLabel: { color: "#97A39A", fontSize: 12, fontWeight: "800", textAlign: "right" }, expectedValue: { color: colors.dark, fontWeight: "800", fontSize: 19, marginTop: 2 }, quantityRow: { flexDirection: "row", gap: 12, marginTop: 17 }, quantityArea: { flex: 1 }, label: { color: "#586A5E", fontWeight: "700", fontSize: 14, marginBottom: 7 }, numberBox: { flexDirection: "row", alignItems: "center", backgroundColor: colors.light, borderColor: colors.border, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12 }, numberInput: { flex: 1, paddingVertical: 13, fontWeight: "700", fontSize: 17, color: colors.dark }, unit: { color: "#7B8A80", fontWeight: "800" }, damageRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16 }, damageText: { color: colors.dark, fontWeight: "800", fontSize: 16 }, reasonInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 13, padding: 13, marginTop: 10, color: colors.dark }, saveButton: { backgroundColor: colors.green, borderRadius: 16, alignItems: "center", paddingVertical: 16, marginTop: 4 }, disabled: { opacity: 0.6 }, saveText: { color: colors.white, fontWeight: "800", fontSize: 17 }, empty: { backgroundColor: colors.white, borderRadius: 20, padding: 30, alignItems: "center", borderWidth: 1, borderColor: colors.border }, emptyTitle: { color: colors.dark, fontSize: 18, fontWeight: "800", marginTop: 10 }, emptyText: { color: colors.muted, marginTop: 5 },
});
