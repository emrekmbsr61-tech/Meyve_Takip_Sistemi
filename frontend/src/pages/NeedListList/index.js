import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { deleteNeedList, getNeedLists, updateNeedList } from "../../services/needListService";
import { getStoreName } from "../../config/stores";

const colors = { green: "#2E7D32", dark: "#102318", background: "#F6F8F6", white: "#FFFFFF", border: "#DFE7E0", muted: "#718077", blue: "#2364E8", blueLight: "#EAF1FF", red: "#E53A32" };
const ITEMS_PER_PAGE = 5;

function formatDate(value) { return value ? new Date(value).toLocaleString("tr-TR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Tarih yok"; }
function cleanQuantity(value) { const compact = value.replace(",", ".").replace(/[^0-9.]/g, ""); const parts = compact.split("."); return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : compact; }

export default function NeedListList({ currentUser }) {
  const [needLists, setNeedLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [editQuantity, setEditQuantity] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const loadNeedLists = useCallback(async () => {
    try { setLoading(true); setMessage(""); const data = await getNeedLists(); setNeedLists([...data].sort((a, b) => b.id - a.id)); setCurrentPage(1); } catch (error) { setMessage(error.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { loadNeedLists(); }, [loadNeedLists]);
  useFocusEffect(useCallback(() => { loadNeedLists(); }, [loadNeedLists]));

  const plans = useMemo(() => Object.values(needLists.reduce((all, item) => {
    if (!all[item.planId]) all[item.planId] = { planId: item.planId, createdDate: item.createdDate, createdByName: item.createdByName, status: item.status, notes: item.notes, items: [] };
    all[item.planId].items.push(item); return all;
  }, {})), [needLists]);
  const totalPages = Math.max(1, Math.ceil(plans.length / ITEMS_PER_PAGE));
  const visiblePlans = plans.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const startEdit = (item) => { setEditingItem(item); setEditQuantity(String(item.requiredQuantity)); setEditNotes(item.notes || ""); };
  const saveEdit = async () => {
    if (!editQuantity || Number(editQuantity) <= 0) { setMessage("Geçerli bir miktar girilmelidir."); return; }
    try { await updateNeedList(editingItem.id, { planId: editingItem.planId, fruitId: editingItem.fruitId, requiredQuantity: Number(editQuantity), createdBy: editingItem.createdBy || currentUser.id, notes: editNotes }); setEditingItem(null); setMessage("Ürün ihtiyacı güncellendi."); loadNeedLists(); } catch (error) { setMessage(error.message); }
  };
  const deletePlan = (plan) => Alert.alert("İhtiyaç planı silinsin mi?", "Bu plandaki tüm ürün kayıtları silinir.", [{ text: "Vazgeç", style: "cancel" }, { text: "Sil", style: "destructive", onPress: async () => { try { await Promise.all(plan.items.map((item) => deleteNeedList(item.id))); setMessage("İhtiyaç planı silindi."); loadNeedLists(); } catch (error) { setMessage(error.message); } } }]);

  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <View style={styles.headingRow}><View><Text style={styles.heading}>Mevcut İhtiyaçlar</Text><Text style={styles.subheading}>Oluşturulan planları ve ürünleri yönetin.</Text></View><View style={styles.count}><Text style={styles.countText}>{plans.length}</Text></View></View>
    {message ? <Text style={styles.message}>{message}</Text> : null}
    {loading ? <ActivityIndicator color={colors.green} /> : null}
    {!loading && plans.length === 0 ? <View style={styles.empty}><Ionicons name="clipboard-outline" size={42} color={colors.muted}/><Text style={styles.emptyTitle}>Henüz ihtiyaç planı yok</Text><Text style={styles.emptyText}>Ana menüden yeni ihtiyaç planı oluşturabilirsiniz.</Text></View> : null}
    {visiblePlans.map((plan) => <View key={plan.planId} style={styles.card}>
      <View style={styles.cardHeader}><View style={{ flex: 1 }}><Text style={styles.storeName}>{getStoreName(plan.planId)}</Text><Text style={styles.planMeta}>Plan #{plan.planId} · {formatDate(plan.createdDate)}</Text></View><View style={styles.statusBadge}><Text style={styles.statusText}>{plan.status === "CREATED" ? "Oluşturuldu" : plan.status}</Text></View></View>
      <View style={styles.personRow}><Ionicons name="person-outline" size={16} color={colors.muted}/><Text style={styles.personText}>{plan.createdByName}</Text><Ionicons name="cube-outline" size={16} color={colors.muted}/><Text style={styles.personText}>{plan.items.length} ürün</Text></View>
      <View style={styles.divider}/>
      {plan.items.map((item) => <View key={item.id}>{editingItem?.id === item.id ? <View style={styles.editBox}><Text style={styles.editTitle}>{item.fruitName}</Text><TextInput value={editQuantity} onChangeText={(value) => setEditQuantity(cleanQuantity(value))} keyboardType="decimal-pad" style={styles.input}/><TextInput value={editNotes} onChangeText={setEditNotes} placeholder="Not" style={styles.input}/><View style={styles.buttonRow}><Pressable style={styles.saveSmall} onPress={saveEdit}><Text style={styles.smallText}>Kaydet</Text></Pressable><Pressable style={styles.cancelSmall} onPress={() => setEditingItem(null)}><Text style={styles.smallText}>İptal</Text></Pressable></View></View> : <Pressable onPress={() => startEdit(item)} style={styles.itemRow}><View style={styles.dot}/><Text style={styles.itemName}>{item.fruitName}</Text><Text style={styles.itemQuantity}>{item.requiredQuantity} <Text style={styles.itemUnit}>BİRİM</Text></Text></Pressable>}</View>)}
      {plan.notes ? <View style={styles.note}><Ionicons name="document-text-outline" size={18} color={colors.muted}/><Text style={styles.noteText}>{plan.notes}</Text></View> : null}
      <View style={styles.buttonRow}><Pressable style={styles.editButton} onPress={() => startEdit(plan.items[0])}><Ionicons name="pencil-outline" size={19} color={colors.green}/><Text style={styles.editText}>Düzenle</Text></Pressable><Pressable style={styles.deleteButton} onPress={() => deletePlan(plan)}><Ionicons name="trash-outline" size={19} color={colors.red}/><Text style={styles.deleteText}>Sil</Text></Pressable></View>
    </View>)}
    {plans.length > ITEMS_PER_PAGE ? <View style={styles.pagination}><Pressable disabled={currentPage === 1} onPress={() => setCurrentPage(currentPage - 1)}><Text style={[styles.pageLink, currentPage === 1 && styles.disabled]}>Önceki</Text></Pressable><Text style={styles.pageLabel}>{currentPage} / {totalPages}</Text><Pressable disabled={currentPage === totalPages} onPress={() => setCurrentPage(currentPage + 1)}><Text style={[styles.pageLink, currentPage === totalPages && styles.disabled]}>Sonraki</Text></Pressable></View> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 38 }, headingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 19 }, heading: { color: colors.dark, fontSize: 24, fontWeight: "800" }, subheading: { color: colors.muted, marginTop: 4 }, count: { backgroundColor: "#EAF5EC", width: 35, height: 35, borderRadius: 18, alignItems: "center", justifyContent: "center" }, countText: { color: colors.green, fontWeight: "800" }, message: { color: colors.green, marginBottom: 10, fontWeight: "600" }, card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 19, marginBottom: 18, shadowColor: "#1A2A1D", shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 }, cardHeader: { flexDirection: "row", alignItems: "flex-start" }, storeName: { color: colors.dark, fontSize: 21, fontWeight: "800" }, planMeta: { color: "#61778D", marginTop: 4 }, statusBadge: { backgroundColor: colors.blueLight, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 17 }, statusText: { color: colors.blue, fontWeight: "800", fontSize: 12 }, personRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 13 }, personText: { color: colors.muted, marginRight: 6 }, divider: { height: 1, backgroundColor: "#ECF0ED", marginVertical: 14 }, itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 5 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#4DB75B", marginRight: 10 }, itemName: { flex: 1, color: colors.dark, fontSize: 16, fontWeight: "600" }, itemQuantity: { color: colors.dark, fontSize: 16, fontWeight: "800" }, itemUnit: { color: colors.muted, fontSize: 12 }, note: { flexDirection: "row", gap: 9, alignItems: "center", backgroundColor: colors.background, borderRadius: 14, padding: 12, marginTop: 13 }, noteText: { flex: 1, color: colors.muted }, buttonRow: { flexDirection: "row", gap: 10, marginTop: 17 }, editButton: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, borderWidth: 1, borderColor: colors.green, borderRadius: 14, paddingVertical: 13 }, editText: { color: colors.green, fontWeight: "800", fontSize: 16 }, deleteButton: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#F5B8B3", borderRadius: 14, paddingVertical: 13 }, deleteText: { color: colors.red, fontWeight: "800", fontSize: 16 }, editBox: { backgroundColor: "#F7FAF7", borderRadius: 14, padding: 12, marginBottom: 6 }, editTitle: { color: colors.dark, fontWeight: "800", marginBottom: 7 }, input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, borderRadius: 11, padding: 10, marginTop: 7 }, saveSmall: { flex: 1, backgroundColor: colors.green, borderRadius: 11, padding: 11, alignItems: "center" }, cancelSmall: { flex: 1, backgroundColor: colors.muted, borderRadius: 11, padding: 11, alignItems: "center" }, smallText: { color: colors.white, fontWeight: "800" }, empty: { alignItems: "center", backgroundColor: colors.white, borderRadius: 20, padding: 31, borderWidth: 1, borderColor: colors.border }, emptyTitle: { color: colors.dark, fontSize: 18, fontWeight: "800", marginTop: 10 }, emptyText: { color: colors.muted, textAlign: "center", marginTop: 5 }, pagination: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }, pageLink: { color: colors.green, fontWeight: "800", padding: 10 }, disabled: { color: "#B7C2B9" }, pageLabel: { color: colors.dark, fontWeight: "800" },
});
