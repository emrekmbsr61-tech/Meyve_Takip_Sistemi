import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { getNeedLists } from "../../services/needListService";
import { createAcceptance, getAcceptanceChecklist } from "../../services/acceptanceService";
import { getTasks } from "../../services/taskService";
import { getUnitLabel } from "../../utils/unit";

const colors = { green: "#2E7D32", dark: "#112018", background: "#F6F8F6", white: "#FFFFFF", border: "#DFE7E0", muted: "#718077", light: "#F3F6F3", red: "#D92D20" };

function numberText(value) { return String(value ?? "").replace(",", ".").replace(/[^0-9.]/g, ""); }

// Mal kabulü tamamlanan ihtiyaçları ekranda tekrar göstermemek için kullanılır.
function isOpenNeed(item) {
  const status = String(item.status || "").toUpperCase();

  return status !== "APPROVED" && status !== "COMPLETED";
}

export default function Acceptance({ currentUser, route }) {
  // planTabs: kabul bekleyen planların sekme listesi ({planId, storeName}).
  const [planTabs, setPlanTabs] = useState([]);
  const [tabsLoading, setTabsLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState(route.params?.planId || null);

  /*
    checklistItems: SEÇİLİ planın ürünleri. İki ayrı miktar backend'den ayrı
    ayrı gelir (bkz. AcceptanceService.getAcceptanceChecklist):
      - expectedQuantity: mağazanın İSTEDİĞİ miktar (NeedList.requiredQuantity)
        — "BEKLENEN", kabul/red doğrulamasının gerçek üst sınırı.
      - deliveredQuantity: şoförün TESLİM ETTİĞİ miktar (Collection.collectedQuantity)
        — yalnızca bilgi/karşılaştırma amaçlı, sınır olarak kullanılmaz.
  */
  const [checklistItems, setChecklistItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [quantities, setQuantities] = useState({});
  const [damaged, setDamaged] = useState({});
  const [reasons, setReasons] = useState({});

  /*
    Kabul bekleyen planların sekme listesini yükler: yalnızca gerçekten bir
    KABUL (ACCEPTANCE) görevi kendisine atanmış planlar gösterilir — Teslimat
    tamamlanmadan hiçbir plan bu ekranda görünmemelidir.
  */
  const loadPlanTabs = useCallback(async () => {
    try {
      setTabsLoading(true);
      setMessage("");

      const [needLists, myTasks] = await Promise.all([
        getNeedLists(),
        getTasks(currentUser.id),
      ]);

      const kabulPlanIds = [
        ...new Set(
          (Array.isArray(myTasks) ? myTasks : [])
            .filter((task) => task.taskType === "ACCEPTANCE" && task.status !== "COMPLETED")
            .map((task) => task.planId)
        ),
      ];

      const storeNameByPlan = {};
      needLists.forEach((item) => {
        if (isOpenNeed(item) && !(item.planId in storeNameByPlan)) {
          storeNameByPlan[item.planId] = item.storeName;
        }
      });

      const tabs = kabulPlanIds
        .filter((planId) => planId in storeNameByPlan)
        .map((planId) => ({ planId, storeName: storeNameByPlan[planId] }));

      setPlanTabs(tabs);
      return tabs;
    } catch (error) {
      setMessage(error.message);
      return [];
    } finally {
      setTabsLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => { loadPlanTabs(); }, [loadPlanTabs]);
  useFocusEffect(useCallback(() => { loadPlanTabs(); }, [loadPlanTabs]));

  const activePlanId = selectedPlanId || planTabs[0]?.planId || null;

  /*
    Seçili planın ürün + "beklenen miktar" (mağazanın istediği miktar) listesini
    yükler. expectedQuantity, backend'in create() sırasında uygulayacağı üst
    sınırla AYNI kaynaktır (bkz. AcceptanceService.getAcceptanceChecklist) —
    ekranda görünen "BEKLENEN" değeri ile kaydetme anında reddedilen değer
    arasında fark olmaz.
  */
  const loadChecklist = useCallback(async (planId) => {
    if (!planId) {
      setChecklistItems([]);
      return;
    }
    try {
      setItemsLoading(true);
      setMessage("");
      const data = await getAcceptanceChecklist(planId, currentUser.id);
      setChecklistItems(Array.isArray(data) ? data : []);
    } catch (error) {
      setChecklistItems([]);
      setMessage(error.message);
    } finally {
      setItemsLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => { loadChecklist(activePlanId); }, [activePlanId, loadChecklist]);

  const setQuantity = (id, field, value) => setQuantities((current) => ({ ...current, [id]: { ...current[id], [field]: numberText(value) } }));

  const saveAcceptance = async () => {
    if (!activePlanId || !checklistItems.length) return;
    try {
      const acceptanceItems = checklistItems.map((item) => {
        const entry = quantities[item.needListId] || {};
        const acceptedQuantity = Number(entry.accepted || 0);
        const rejectedQuantity = Number(entry.rejected || 0);
        if (acceptedQuantity + rejectedQuantity > item.expectedQuantity) throw new Error(`${item.fruitName} için toplam miktar bekleneni geçemez.`);
        return { needListId: item.needListId, fruitId: item.fruitId, expectedQuantity: item.expectedQuantity, acceptedQuantity, rejectedQuantity, damaged: Boolean(damaged[item.needListId]), rejectionReason: reasons[item.needListId] || "" };
      });
      setSaving(true); setMessage("");

      await createAcceptance({
        planId: activePlanId,
        receivedBy: currentUser.id,
        items: acceptanceItems,
      });

      // Form alanlarını temizler.
      setQuantities({});
      setDamaged({});
      setReasons({});

      // Sekme listesi yeniden yüklenir; bu plan artık kabul görevi tamamlandığı için listeden kalkar.
      const remainingTabs = await loadPlanTabs();
      setSelectedPlanId(remainingTabs[0]?.planId || null);

      Alert.alert(
        "Kaydedildi",
        remainingTabs.length > 0
          ? "Mal kabul tamamlandı. Sıradaki plan açıldı."
          : "Mal kabul tamamlandı. Kabul bekleyen plan kalmadı."
      );
    } catch (error) { setMessage(error.message); } finally { setSaving(false); }
  };

  const loading = tabsLoading || itemsLoading;

  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <Text style={styles.intro}>Teslim edilen her ürünün kabul ve red miktarını girin.</Text>
    {message ? <Text style={styles.error}>{message}</Text> : null}
    {loading ? <ActivityIndicator color={colors.green} /> : null}
    {!tabsLoading && planTabs.length === 0 ? <View style={styles.empty}><Ionicons name="cube-outline" size={42} color={colors.muted} /><Text style={styles.emptyTitle}>Kabul edilecek plan yok</Text><Text style={styles.emptyText}>Teslimatı tamamlanan bir plan olduğunda burada görünür.</Text></View> : null}
    {planTabs.length > 1 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.planTabs}>{planTabs.map((tab) => <Pressable key={tab.planId} onPress={() => setSelectedPlanId(tab.planId)} style={[styles.planTab, activePlanId === tab.planId && styles.selectedPlanTab]}><Text style={[styles.planTabText, activePlanId === tab.planId && styles.selectedPlanTabText]}>{tab.storeName}</Text></Pressable>)}</ScrollView> : null}
    {checklistItems.map((item) => {
      const entry = quantities[item.needListId] || {};
      const unitLabel = getUnitLabel(item.fruitUnit);

      /*
        Mal Kabul ekranı yalnızca işlemi yapmak içindir, rapor ekranı değildir
        (kullanıcıyla netleştirildi). Bu yüzden burada yalnızca HAM sayılar
        gösterilir, "fazla geldi/eksik geldi" gibi yorum cümleleri kurulmaz:
        - BEKLENEN (sağ üstte, expectedValue): NeedList.requiredQuantity — mağazanın
          istediği miktar, kabul/red doğrulamasının GERÇEK üst sınırı.
        - Teslim edilen (ürün adının altında): Collection.collectedQuantity —
          şoförün getirdiği miktar, sade bilgi amaçlı, yorum eklenmez.
        Beklenen ile teslim edilen arasındaki farkın yorumu (fazla/eksik teslimat)
        artık Tamamlanan İşlemler > Sonucu Gör ekranında gösteriliyor.
      */
      const delivered = item.deliveredQuantity;

      return <View key={item.needListId} style={styles.card}>
      <View style={styles.productHeader}><View style={styles.imagePlaceholder}><Ionicons name="image-outline" size={27} color="#AAB7AE" /></View><View style={{ flex: 1 }}><Text style={styles.productName}>{item.fruitName}</Text>{delivered != null ? <Text style={styles.deliveredText}>Teslim edilen: {delivered} {unitLabel}</Text> : null}</View><View><Text style={styles.expectedLabel}>BEKLENEN (İHTİYAÇ)</Text><Text style={styles.expectedValue}>{item.expectedQuantity} {unitLabel}</Text></View></View>
      <View style={styles.quantityRow}><View style={styles.quantityArea}><Text style={styles.label}>Kabul edilen</Text><View style={styles.numberBox}><TextInput value={entry.accepted || ""} onChangeText={(value) => setQuantity(item.needListId, "accepted", value)} keyboardType="decimal-pad" placeholder="0" style={styles.numberInput}/><Text style={styles.unit}>{getUnitLabel(item.fruitUnit)}</Text></View></View><View style={styles.quantityArea}><Text style={styles.label}>Reddedilen</Text><View style={styles.numberBox}><TextInput value={entry.rejected || ""} onChangeText={(value) => setQuantity(item.needListId, "rejected", value)} keyboardType="decimal-pad" placeholder="0" style={styles.numberInput}/><Text style={styles.unit}>{getUnitLabel(item.fruitUnit)}</Text></View></View></View>
      <View style={styles.damageRow}><Text style={styles.damageText}>Hasarlı ürün</Text><Switch value={Boolean(damaged[item.needListId])} onValueChange={(value) => setDamaged((current) => ({ ...current, [item.needListId]: value }))} trackColor={{ false: "#D8DEDA", true: "#A9D6AC" }} thumbColor={damaged[item.needListId] ? colors.green : colors.white}/></View>
      <TextInput value={reasons[item.needListId] || ""} onChangeText={(value) => setReasons((current) => ({ ...current, [item.needListId]: value }))} placeholder="Açıklama / red nedeni (opsiyonel)" style={styles.reasonInput}/>
    </View>; })}
    {checklistItems.length ? <Pressable disabled={saving} onPress={saveAcceptance} style={[styles.saveButton, saving && styles.disabled]}><Text style={styles.saveText}>{saving ? "Kaydediliyor..." : "Mal Kabulü Kaydet"}</Text></Pressable> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { padding: 16, paddingBottom: 32 }, intro: { color: colors.muted, marginBottom: 10, fontSize: 13, lineHeight: 18 }, error: { color: colors.red, fontWeight: "600", marginBottom: 8 }, planTabs: { gap: 7, paddingBottom: 10 }, planTab: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18 }, selectedPlanTab: { backgroundColor: "#EAF5EC", borderColor: colors.green }, planTabText: { color: colors.muted, fontWeight: "700", fontSize: 13 }, selectedPlanTabText: { color: colors.green }, card: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 12 }, productHeader: { flexDirection: "row", alignItems: "center", gap: 10 }, imagePlaceholder: { width: 48, height: 48, borderRadius: 11, backgroundColor: colors.light, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }, productName: { color: colors.dark, fontWeight: "800", fontSize: 16 }, productCode: { color: colors.muted, marginTop: 2, fontSize: 13 }, expectedLabel: { color: "#97A39A", fontSize: 11, fontWeight: "800", textAlign: "right" }, expectedValue: { color: colors.dark, fontWeight: "800", fontSize: 16, marginTop: 1 }, quantityRow: { flexDirection: "row", gap: 10, marginTop: 13 }, quantityArea: { flex: 1 }, label: { color: "#586A5E", fontWeight: "700", fontSize: 14, marginBottom: 6 }, numberBox: { flexDirection: "row", alignItems: "center", backgroundColor: colors.light, borderColor: colors.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 }, numberInput: { flex: 1, paddingVertical: 11, fontWeight: "700", fontSize: 16, color: colors.dark }, unit: { color: "#7B8A80", fontWeight: "800", fontSize: 13 }, damageRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 13 }, damageText: { color: colors.dark, fontWeight: "800", fontSize: 15 }, reasonInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginTop: 9, color: colors.dark }, saveButton: { backgroundColor: colors.green, borderRadius: 14, alignItems: "center", paddingVertical: 14, marginTop: 4 }, disabled: { opacity: 0.6 }, saveText: { color: colors.white, fontWeight: "800", fontSize: 16 }, empty: { backgroundColor: colors.white, borderRadius: 18, padding: 26, alignItems: "center", borderWidth: 1, borderColor: colors.border }, emptyTitle: { color: colors.dark, fontSize: 16, fontWeight: "800", marginTop: 8 }, emptyText: { color: colors.muted, marginTop: 4, fontSize: 13 }, deliveredText: { color: colors.muted, fontSize: 12, marginTop: 3 },
});