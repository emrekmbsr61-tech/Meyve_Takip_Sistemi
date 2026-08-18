import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { addExtraItemsToPlan, cancelNeedListPlan, getNeedLists, updateNeedList } from "../../services/needListService";
import { getUnitLabel } from "../../utils/unit";
import { getNeedListStatusLabel } from "../../utils/status";
import { addNotificationListener } from "../../services/websocketService";
import AddExtraProductModal from "./AddExtraProductModal";

// Bu durumdaki bir plan iş akışı olarak tamamlanmıştır (mal kabulü bitmiştir).
// Bu ekran yalnızca AKTİF planları gösterir; tamamlanan planlar "Tamamlanan
// İşlemler" ekranında (CompletedAcceptances) "Sonucu Gör" ile görüntülenir.
const COMPLETED_STATUS = "APPROVED";

const colors = { green: "#2E7D32", dark: "#102318", background: "#F6F8F6", white: "#FFFFFF", border: "#DFE7E0", muted: "#718077", blue: "#2364E8", blueLight: "#EAF1FF", red: "#E53A32" };
const ITEMS_PER_PAGE = 5;

function formatDate(value) { return value ? new Date(value).toLocaleString("tr-TR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Tarih yok"; }
function cleanQuantity(value) { const compact = value.replace(",", ".").replace(/[^0-9.]/g, ""); const parts = compact.split("."); return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : compact; }

// createdDate değerini sıralama için milisaniyeye çevirir. Geçersiz/boşsa 0 döner, bu sayede ekran çökmez.
function getComparableTime(plan) { if (!plan.createdDate) return 0; const time = new Date(plan.createdDate).getTime(); return Number.isNaN(time) ? 0 : time; }
// En son oluşturulan plan en üstte gösterilir; createdDate boş/eşitse planId büyük olan önce gelir.
function comparePlans(a, b) { const timeDiff = getComparableTime(b) - getComparableTime(a); return timeDiff !== 0 ? timeDiff : (b.planId || 0) - (a.planId || 0); }

export default function NeedListList({ currentUser }) {
  const [needLists, setNeedLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  // Düzenleme artık tek bir ürün değil, o an açık olan PLANIN tüm ürünleri
  // için birlikte çalışır: editingPlanId hangi planın düzenlemede olduğunu,
  // editValues ise { [itemId]: { quantity, notes } } şeklinde her ürünün
  // güncel taslak değerlerini tutar. "Kaydet" tek seferde hepsini gönderir.
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  // Yalnızca MAGAZA_PERSONELI düzenleyip silebilir; ADMIN ve MAGAZA_MUDURU salt okunur görür.
  const canManage = currentUser.role === "MAGAZA_PERSONELI";

  // MAGAZA_MUDURU, var olan bir plana ekstra ürün ekleyebilir (yeni plan OLUŞTURMAZ).
  const isManager = currentUser.role === "MAGAZA_MUDURU";
  const [extraModalPlan, setExtraModalPlan] = useState(null);
  const [extraSaving, setExtraSaving] = useState(false);
  const [extraError, setExtraError] = useState("");

  const loadNeedLists = useCallback(async () => {
    try { setLoading(true); setMessage(""); const data = await getNeedLists(); setNeedLists([...data].sort((a, b) => b.id - a.id)); setCurrentPage(1); } catch (error) { setMessage(error.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { loadNeedLists(); }, [loadNeedLists]);
  useFocusEffect(useCallback(() => { loadNeedLists(); }, [loadNeedLists]));

  /*
    Ekran AÇIKKEN başka biri bu listedeki bir planı değiştirirse (personel
    miktar günceller/siler/iptal eder) liste kendiliğinden tazelenir.
    useFocusEffect tek başına yetmez: yalnızca ekrana GİRİLDİĞİNDE çalışır,
    kullanıcı zaten ekranda beklerken tetiklenmez. Müdür/admin bu ekranı
    salt okunur izlerken tam da bu durumdaydı - bildirim geliyordu ama
    ekran hiç yenilenmiyordu.

    Aktif bir düzenleme sürüyorsa (editingPlanId dolu) yenilenmez; kullanıcı
    o an elle yazdığı miktarları kaybetmesin diye.
  */
  useEffect(() => {
    const PLAN_DEGISIKLIK_TIPLERI = [
      "ALIM_GOREVI_ATANDI",
      "IHTIYAC_GUNCELLENDI",
      "IHTIYAC_IPTAL_EDILDI",
    ];

    const removeListener = addNotificationListener((notification) => {
      if (PLAN_DEGISIKLIK_TIPLERI.includes(notification?.type) && !editingPlanId) {
        loadNeedLists();
      }
    });

    return removeListener;
  }, [loadNeedLists, editingPlanId]);

  const plans = useMemo(() => {
    // MAGAZA_PERSONELI yalnızca kendi oluşturduğu planları görür; ADMIN/MAGAZA_MUDURU tümünü görür.
    const visibleNeedLists = canManage
      ? needLists.filter((item) => item.createdBy === currentUser.id)
      : needLists;

    const grouped = Object.values(visibleNeedLists.reduce((all, item) => {
      // planId eksikse kayıtları yanlışlıkla tek grupta birleştirmemek için her birine kendi anahtarı verilir.
      const groupKey = item.planId !== null && item.planId !== undefined ? item.planId : `missing-${item.id}`;
      // notes: planın GENEL notu (DeliveryPlan.generalNotes) — ürünlerin kendi
      // notlarından farklıdır ve aynı plandaki her satırda aynı değeri taşır.
      if (!all[groupKey]) all[groupKey] = { planId: item.planId, storeId: item.storeId, storeName: item.storeName, createdDate: item.createdDate, createdByName: item.createdByName, status: item.status, notes: item.planNotes, items: [] };
      all[groupKey].items.push(item);
      return all;
    }, {}));

    // Mal kabulü tamamlanmış (APPROVED) planlar bu ekranda gösterilmez; onlar
    // artık "Tamamlanan İşlemler" ekranındadır (bkz. dosya başındaki not).
    return grouped.filter((plan) => plan.status !== COMPLETED_STATUS).sort(comparePlans);
  }, [needLists, canManage, currentUser.id]);

  const totalPages = Math.max(1, Math.ceil(plans.length / ITEMS_PER_PAGE));
  const visiblePlans = plans.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Planın tüm ürünlerini aynı anda düzenleme moduna açar; her ürün kendi
  // mevcut miktar/not değeriyle başlar.
  const startEdit = (plan) => {
    if (!canManage) return;
    const values = {};
    plan.items.forEach((item) => { values[item.id] = { quantity: String(item.requiredQuantity), notes: item.notes || "" }; });
    setEditingPlanId(plan.planId);
    setEditValues(values);
  };
  const cancelEdit = () => { setEditingPlanId(null); setEditValues({}); };
  const setEditValue = (itemId, field, value) => setEditValues((current) => ({ ...current, [itemId]: { ...current[itemId], [field]: value } }));

  // Düzenlemedeki planın ürünlerini tek "Kaydet" ile gönderir, ama yalnızca
  // GERÇEKTEN değeri değişmiş olanlar için backend'e istek atar. Dokunulmamış
  // ürünler için istek atmazsak backend'de yeni bir "güncelleme" logu
  // oluşmaz, dolayısıyla o ürünün "Son güncelleyen" bilgisi değişmez.
  const saveEdit = async (plan) => {
    const invalidItem = plan.items.find((item) => {
      const quantity = Number(editValues[item.id]?.quantity);
      return !editValues[item.id]?.quantity || Number.isNaN(quantity) || quantity <= 0;
    });
    if (invalidItem) { setMessage(`${invalidItem.fruitName} için geçerli bir miktar girilmelidir.`); return; }

    const changedItems = plan.items.filter((item) => {
      const values = editValues[item.id];
      return Number(values.quantity) !== item.requiredQuantity || values.notes !== (item.notes || "");
    });

    if (changedItems.length === 0) { cancelEdit(); return; }

    try {
      await Promise.all(changedItems.map((item) => updateNeedList(item.id, {
        planId: item.planId,
        fruitId: item.fruitId,
        requiredQuantity: Number(editValues[item.id].quantity),
        createdBy: item.createdBy || currentUser.id,
        notes: editValues[item.id].notes,
      })));
      cancelEdit();
      setMessage(changedItems.length === 1 ? "Ürün ihtiyacı güncellendi." : "Ürün ihtiyaçları güncellendi.");
      loadNeedLists();
    } catch (error) { setMessage(error.message); }
  };

  // Plan silme artık tek bir istekle yapılır: backend aynı transaction içinde
  // yalnızca bu planId'ye ait NeedList kayıtlarını siler ve DeliveryPlan'ı iptal eder.
  const deletePlan = (plan) => Alert.alert("İhtiyaç planı silinsin mi?", "Bu plandaki tüm ürün kayıtları silinir.", [{ text: "Vazgeç", style: "cancel" }, { text: "Sil", style: "destructive", onPress: async () => { try { await cancelNeedListPlan(plan.planId, currentUser.id); cancelEdit(); setMessage("İhtiyaç planı silindi."); loadNeedLists(); } catch (error) { setMessage(error.message); } } }]);

  const closeExtraModal = () => { setExtraModalPlan(null); setExtraError(""); };

  // Müdürün seçtiği ekstra ürünleri, YENİ bir plan açmadan, aynı planId'ye ekler.
  const saveExtraItems = async (items) => {
    if (!extraModalPlan || items.length === 0) return;
    try {
      setExtraSaving(true);
      setExtraError("");
      await addExtraItemsToPlan(extraModalPlan.planId, { managerId: currentUser.id, items });
      closeExtraModal();
      setMessage("Ekstra ürünler plana eklendi.");
      loadNeedLists();
    } catch (error) {
      setExtraError(error.message);
    } finally {
      setExtraSaving(false);
    }
  };

  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <View style={styles.headingRow}><View><Text style={styles.heading}>Mevcut İhtiyaçlar</Text><Text style={styles.subheading}>{canManage ? "Devam eden planları yönetin." : "Devam eden planları görüntüleyin."}</Text></View><View style={styles.count}><Text style={styles.countText}>{plans.length}</Text></View></View>
    {message ? <Text style={styles.message}>{message}</Text> : null}
    {loading ? <ActivityIndicator color={colors.green} /> : null}
    {!loading && plans.length === 0 ? <View style={styles.empty}><Ionicons name="clipboard-outline" size={42} color={colors.muted}/><Text style={styles.emptyTitle}>Aktif ihtiyaç planı yok</Text><Text style={styles.emptyText}>Tamamlanan planları "Tamamlanan İşlemler" ekranından görebilirsiniz.</Text></View> : null}
    {visiblePlans.map((plan) => {
      return <View key={plan.planId} style={styles.card}>
      <View style={styles.cardHeader}><View style={{ flex: 1 }}><Text style={styles.storeName}>{plan.storeName}</Text><Text style={styles.planMeta}>Plan #{plan.planId} · {formatDate(plan.createdDate)}</Text></View><View style={styles.statusBadge}><Text style={styles.statusText}>{getNeedListStatusLabel(plan.status)}</Text></View></View>
      <View style={styles.personRow}><Ionicons name="person-outline" size={16} color={colors.muted}/><Text style={styles.personText}>{plan.createdByName}</Text><Ionicons name="cube-outline" size={16} color={colors.muted}/><Text style={styles.personText}>{plan.items.length} ürün</Text></View>

      <View style={styles.divider}/>
      {plan.items.map((item) => <View key={item.id}>{editingPlanId === plan.planId ? <View style={styles.editBox}><Text style={styles.editTitle}>{item.fruitName}</Text><TextInput value={editValues[item.id]?.quantity ?? ""} onChangeText={(value) => setEditValue(item.id, "quantity", cleanQuantity(value))} keyboardType="decimal-pad" style={styles.input}/><TextInput value={editValues[item.id]?.notes ?? ""} onChangeText={(value) => setEditValue(item.id, "notes", value)} placeholder="Not" style={styles.input}/></View> : <View style={styles.itemRow}><View style={styles.dot}/><Text style={styles.itemName}>{item.fruitName}</Text><Text style={styles.itemQuantity}>{item.requiredQuantity} <Text style={styles.itemUnit}>{getUnitLabel(item.fruitUnit)}</Text></Text></View>}{item.updatedByName ? <Text style={styles.updatedText}>Son güncelleyen: {item.updatedByName} · {formatDate(item.updatedDate)}</Text> : null}</View>)}
      {plan.notes ? <View style={styles.note}><Ionicons name="document-text-outline" size={18} color={colors.muted}/><Text style={styles.noteText}>{plan.notes}</Text></View> : null}
      {canManage ? (editingPlanId === plan.planId ? <View style={styles.buttonRow}><Pressable style={styles.saveSmall} onPress={() => saveEdit(plan)}><Text style={styles.smallText}>Kaydet</Text></Pressable><Pressable style={styles.cancelSmall} onPress={cancelEdit}><Text style={styles.smallText}>İptal</Text></Pressable></View> : <View style={styles.buttonRow}><Pressable style={styles.editButton} onPress={() => startEdit(plan)}><Ionicons name="pencil-outline" size={19} color={colors.green}/><Text style={styles.editText}>Düzenle</Text></Pressable><Pressable style={styles.deleteButton} onPress={() => deletePlan(plan)}><Ionicons name="trash-outline" size={19} color={colors.red}/><Text style={styles.deleteText}>Sil</Text></Pressable></View>) : null}
      {isManager ? <Pressable style={styles.extraButton} onPress={() => setExtraModalPlan(plan)}><Ionicons name="add-circle-outline" size={19} color={colors.green}/><Text style={styles.extraButtonText}>Ekstra Ürün Ekle</Text></Pressable> : null}
    </View>;
    })}
    {plans.length > ITEMS_PER_PAGE ? <View style={styles.pagination}><Pressable disabled={currentPage === 1} onPress={() => setCurrentPage(currentPage - 1)}><Text style={[styles.pageLink, currentPage === 1 && styles.disabled]}>Önceki</Text></Pressable><Text style={styles.pageLabel}>{currentPage} / {totalPages}</Text><Pressable disabled={currentPage === totalPages} onPress={() => setCurrentPage(currentPage + 1)}><Text style={[styles.pageLink, currentPage === totalPages && styles.disabled]}>Sonraki</Text></Pressable></View> : null}

    <AddExtraProductModal
      visible={Boolean(extraModalPlan)}
      existingFruitIds={extraModalPlan ? extraModalPlan.items.map((item) => item.fruitId) : []}
      saving={extraSaving}
      errorMessage={extraError}
      onSave={saveExtraItems}
      onClose={closeExtraModal}
    />
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { padding: 16, paddingBottom: 32 }, headingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }, heading: { color: colors.dark, fontSize: 22, fontWeight: "800" }, subheading: { color: colors.muted, marginTop: 3, fontSize: 13 }, count: { backgroundColor: "#EAF5EC", width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" }, countText: { color: colors.green, fontWeight: "800" }, message: { color: colors.green, marginBottom: 8, fontWeight: "600" }, card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 14, marginBottom: 12, shadowColor: "#1A2A1D", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }, cardHeader: { flexDirection: "row", alignItems: "flex-start" }, storeName: { color: colors.dark, fontSize: 18, fontWeight: "800" }, planMeta: { color: "#61778D", marginTop: 3, fontSize: 12 }, statusBadge: { backgroundColor: colors.blueLight, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 14 }, statusText: { color: colors.blue, fontWeight: "800", fontSize: 11 }, personRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }, personText: { color: colors.muted, marginRight: 6, fontSize: 13 }, divider: { height: 1, backgroundColor: "#ECF0ED", marginVertical: 10 },
  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 }, dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4DB75B", marginRight: 9 }, itemName: { flex: 1, color: colors.dark, fontSize: 16, fontWeight: "600" }, itemQuantity: { color: colors.dark, fontSize: 16, fontWeight: "800" }, itemUnit: { color: colors.muted, fontSize: 13 }, updatedText: { color: colors.muted, fontSize: 11, marginLeft: 15, marginTop: -2, marginBottom: 3 }, note: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: colors.background, borderRadius: 12, padding: 10, marginTop: 10 }, noteText: { flex: 1, color: colors.muted, fontSize: 13 }, buttonRow: { flexDirection: "row", gap: 8, marginTop: 12 }, editButton: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7, borderWidth: 1, borderColor: colors.green, borderRadius: 12, paddingVertical: 11 }, editText: { color: colors.green, fontWeight: "800", fontSize: 14 }, deleteButton: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7, borderWidth: 1, borderColor: "#F5B8B3", borderRadius: 12, paddingVertical: 11 }, deleteText: { color: colors.red, fontWeight: "800", fontSize: 14 }, editBox: { backgroundColor: "#F7FAF7", borderRadius: 12, padding: 10, marginBottom: 6 }, editTitle: { color: colors.dark, fontWeight: "800", marginBottom: 6, fontSize: 14 }, input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, borderRadius: 10, padding: 9, marginTop: 6 }, saveSmall: { flex: 1, backgroundColor: colors.green, borderRadius: 10, padding: 10, alignItems: "center" }, cancelSmall: { flex: 1, backgroundColor: colors.muted, borderRadius: 10, padding: 10, alignItems: "center" }, smallText: { color: colors.white, fontWeight: "800" }, empty: { alignItems: "center", backgroundColor: colors.white, borderRadius: 18, padding: 26, borderWidth: 1, borderColor: colors.border }, emptyTitle: { color: colors.dark, fontSize: 16, fontWeight: "800", marginTop: 8 }, emptyText: { color: colors.muted, textAlign: "center", marginTop: 4, fontSize: 13 }, pagination: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }, pageLink: { color: colors.green, fontWeight: "800", padding: 8 }, disabled: { color: "#B7C2B9" }, pageLabel: { color: colors.dark, fontWeight: "800" },
  extraButton: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7, borderWidth: 1, borderColor: colors.green, borderStyle: "dashed", borderRadius: 12, paddingVertical: 11, marginTop: 12 }, extraButtonText: { color: colors.green, fontWeight: "800", fontSize: 14 },
});
