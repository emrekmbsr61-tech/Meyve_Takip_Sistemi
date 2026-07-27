import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";

import {
  getNeedLists,
  deleteNeedList,
  updateNeedList,
} from "../../services/needListService";

const colors = {
  orange: "#F97316",
  dark: "#111827",
  white: "#FFFFFF",
  background: "#F3F4F6",
  border: "#E5E7EB",
  text: "#1F2937",
  gray: "#6B7280",
  green: "#16A34A",
  red: "#DC2626",
};

const stores = [
  { id: 1, name: "Merkez Şube", planId: 1 },
  { id: 2, name: "Kadıköy Şubesi", planId: 2 },
  { id: 3, name: "Beşiktaş Şubesi", planId: 3 },
  { id: 4, name: "Üsküdar Şubesi", planId: 4 },
  { id: 5, name: "Ataşehir Şubesi", planId: 5 },
  { id: 6, name: "Bakırköy Şubesi", planId: 6 },
  { id: 7, name: "Şişli Şubesi", planId: 7 },
  { id: 8, name: "Maltepe Şubesi", planId: 8 },
  { id: 9, name: "Kartal Şubesi", planId: 9 },
  { id: 10, name: "Beylikdüzü Şubesi", planId: 10 },
];

const ITEMS_PER_PAGE = 5;

function getStoreName(planId) {
  const store = stores.find((item) => item.planId === planId);
  return store ? store.name : "Bilinmeyen Mağaza";
}

function formatDate(dateValue) {
  if (!dateValue) return "Tarih yok";

  const date = new Date(dateValue);

  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function cleanQuantity(value) {
  const normalizedValue = value.replace(",", ".");
  const onlyNumber = normalizedValue.replace(/[^0-9.]/g, "");
  const parts = onlyNumber.split(".");

  return parts.length > 2
    ? `${parts[0]}.${parts.slice(1).join("")}`
    : onlyNumber;
}

export default function NeedListList({ currentUser }) {
  const [needLists, setNeedLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editQuantity, setEditQuantity] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadNeedLists();
  }, []);

  const loadNeedLists = async () => {
    try {
      setLoading(true);
      const data = await getNeedLists();

      const sortedData = [...data].sort((a, b) => b.id - a.id);

      setNeedLists(sortedData);
      setCurrentPage(1);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(needLists.length / ITEMS_PER_PAGE));

  const pagedNeedLists = needLists.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleDelete = async (id) => {
    try {
      await deleteNeedList(id);
      setMessage("İhtiyaç kaydı silindi.");
      loadNeedLists();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditQuantity(String(item.requiredQuantity));
    setEditNotes(item.notes || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditQuantity("");
    setEditNotes("");
  };

  const handleEditQuantityChange = (value) => {
    setEditQuantity(cleanQuantity(value));
  };

  const saveEdit = async (item) => {
    if (!editQuantity || Number(editQuantity) <= 0) {
      setMessage("Güncelleme için geçerli bir miktar girilmelidir.");
      return;
    }

    try {
      await updateNeedList(item.id, {
        planId: item.planId,
        fruitId: item.fruitId,
        requiredQuantity: Number(editQuantity),
        createdBy: item.createdBy || currentUser.id,
        notes: editNotes,
      });

      setMessage("İhtiyaç kaydı güncellendi.");
      cancelEdit();
      loadNeedLists();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topCard}>
        <Text style={styles.pageTitle}>Mevcut İhtiyaçlar</Text>
        <Text style={styles.pageDesc}>
          En son girilen ihtiyaçlar üstte listelenir.
        </Text>
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {loading ? (
        <ActivityIndicator />
      ) : needLists.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Henüz ihtiyaç kaydı yok.</Text>
        </View>
      ) : (
        <>
          {pagedNeedLists.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.storeName}>
                    {getStoreName(item.planId)}
                  </Text>
                  <Text style={styles.dateText}>
                    Plan #{item.planId} • {formatDate(item.createdDate)}
                  </Text>
                </View>

                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.fruitName}>{item.fruitName}</Text>
              <Text style={styles.detailText}>Meyve ID: {item.fruitId}</Text>
              <Text style={styles.detailText}>
                Oluşturan: {item.createdByName}
              </Text>

              {editingId === item.id ? (
                <View style={styles.editBox}>
                  <Text style={styles.label}>Yeni Miktar</Text>

                  <View style={styles.quantityEditRow}>
                    <TextInput
                      value={editQuantity}
                      onChangeText={handleEditQuantityChange}
                      keyboardType="decimal-pad"
                      placeholder="0.5"
                      style={styles.input}
                    />
                    <Text style={styles.unitText}>KG</Text>
                  </View>

                  <Text style={styles.label}>Not</Text>
                  <TextInput
                    value={editNotes}
                    onChangeText={setEditNotes}
                    style={styles.input}
                    placeholder="Not gir"
                  />

                  <View style={styles.row}>
                    <Pressable
                      style={[styles.smallButton, styles.saveButton]}
                      onPress={() => saveEdit(item)}
                    >
                      <Text style={styles.smallButtonText}>Kaydet</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.smallButton, styles.cancelButton]}
                      onPress={cancelEdit}
                    >
                      <Text style={styles.smallButtonText}>İptal</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={styles.quantityText}>
                    Miktar: {item.requiredQuantity}
                  </Text>

                  <Text style={styles.noteText}>
                    Not: {item.notes ? item.notes : "Not girilmedi"}
                  </Text>

                  <View style={styles.row}>
                    <Pressable
                      style={[styles.smallButton, styles.editButton]}
                      onPress={() => startEdit(item)}
                    >
                      <Text style={styles.smallButtonText}>Güncelle</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.smallButton, styles.deleteButton]}
                      onPress={() => handleDelete(item.id)}
                    >
                      <Text style={styles.smallButtonText}>Sil</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          ))}

          <View style={styles.paginationRow}>
            <Pressable
              style={[
                styles.pageButton,
                currentPage === 1 && styles.disabledButton,
              ]}
              disabled={currentPage === 1}
              onPress={() => setCurrentPage(currentPage - 1)}
            >
              <Text style={styles.pageButtonText}>Önceki</Text>
            </Pressable>

            <Text style={styles.pageText}>
              {currentPage} / {totalPages}
            </Text>

            <Pressable
              style={[
                styles.pageButton,
                currentPage === totalPages && styles.disabledButton,
              ]}
              disabled={currentPage === totalPages}
              onPress={() => setCurrentPage(currentPage + 1)}
            >
              <Text style={styles.pageButtonText}>Sonraki</Text>
            </Pressable>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  topCard: {
    backgroundColor: colors.dark,
    padding: 20,
    borderRadius: 18,
    marginBottom: 16,
  },
  pageTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "bold",
  },
  pageDesc: {
    color: "#D1D5DB",
    marginTop: 8,
  },
  message: {
    color: colors.green,
    fontWeight: "bold",
    marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    color: colors.gray,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  storeName: {
    fontSize: 17,
    fontWeight: "bold",
    color: colors.text,
  },
  dateText: {
    marginTop: 4,
    color: colors.gray,
  },
  statusBadge: {
    backgroundColor: "#FFF7ED",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  statusText: {
    color: colors.orange,
    fontWeight: "bold",
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  fruitName: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.dark,
    marginBottom: 4,
  },
  detailText: {
    color: colors.gray,
    marginTop: 2,
  },
  quantityText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
  },
  noteText: {
    color: colors.gray,
    marginTop: 8,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  smallButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  editButton: {
    backgroundColor: colors.dark,
  },
  deleteButton: {
    backgroundColor: colors.red,
  },
  saveButton: {
    backgroundColor: colors.orange,
  },
  cancelButton: {
    backgroundColor: colors.gray,
  },
  smallButtonText: {
    color: colors.white,
    fontWeight: "bold",
  },
  editBox: {
    marginTop: 12,
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 14,
  },
  label: {
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 10,
  },
  quantityEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  unitText: {
    color: colors.gray,
    fontWeight: "bold",
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 10,
  },
  pageButton: {
    backgroundColor: colors.orange,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  disabledButton: {
    opacity: 0.4,
  },
  pageButtonText: {
    color: colors.white,
    fontWeight: "bold",
  },
  pageText: {
    fontWeight: "bold",
    color: colors.text,
  },
};