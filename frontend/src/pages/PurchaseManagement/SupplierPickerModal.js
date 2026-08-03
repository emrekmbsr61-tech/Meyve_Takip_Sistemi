import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

const colors = {
  green: "#2E7D32",
  dark: "#17211B",
  white: "#FFFFFF",
  border: "#DDE7DF",
  background: "#F4F7F4",
  muted: "#6B7280",
};

// "Kod - Ad" biçiminde gösterim (kod yoksa sadece ad).
export function formatSupplierLabel(supplier) {
  return supplier.supplierCode
    ? `${supplier.supplierCode} - ${supplier.supplierName}`
    : supplier.supplierName;
}

// Türkçe karakter ve büyük/küçük harf duyarsız arama için metni normalize eder.
function normalizeForSearch(text) {
  return String(text || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u");
}

/*
  Alım ekranındaki ürün kartlarında tedarikçi seçimi için kullanılan modal.
  71 tedarikçiyi kart içine sığdırmak yerine, aranabilir/kaydırılabilir tek
  bir liste olarak ayrı bir katmanda gösterir. Liste her zaman backend'den
  gelen (yalnızca aktif) tedarikçilerdir; supplierCode'a göre sayısal sıralama
  zaten SupplierService.getActiveSuppliers() içinde yapılıyor, burada tekrar
  sıralanmaz.
*/
export default function SupplierPickerModal({
  visible,
  suppliers,
  selectedSupplierId,
  onSelect,
  onClose,
}) {
  const [query, setQuery] = useState("");

  const filteredSuppliers = useMemo(() => {
    const normalizedQuery = normalizeForSearch(query.trim());

    if (!normalizedQuery) {
      return suppliers;
    }

    return suppliers.filter((supplier) => {
      const codeMatch = normalizeForSearch(supplier.supplierCode).includes(normalizedQuery);
      const nameMatch = normalizeForSearch(supplier.supplierName).includes(normalizedQuery);
      return codeMatch || nameMatch;
    });
  }, [suppliers, query]);

  const handleSelect = (supplier) => {
    onSelect(supplier.id);
    setQuery("");
    onClose();
  };

  const handleClose = () => {
    setQuery("");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Tedarikçi Seç</Text>

            <Pressable onPress={handleClose} style={styles.closeButton} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.dark} />
            </Pressable>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Kod veya isim ile ara..."
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            autoCapitalize="none"
          />

          <FlatList
            data={filteredSuppliers}
            keyExtractor={(supplier) => String(supplier.id)}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={styles.emptyText}>Eşleşen tedarikçi bulunamadı.</Text>
            }
            renderItem={({ item: supplier }) => {
              const selected = supplier.id === selectedSupplierId;

              return (
                <Pressable
                  style={[styles.row, selected && styles.rowSelected]}
                  onPress={() => handleSelect(supplier)}
                >
                  <Text style={[styles.rowText, selected && styles.rowTextSelected]}>
                    {formatSupplierLabel(supplier)}
                  </Text>

                  {selected ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                  ) : null}
                </Pressable>
              );
            }}
          />

          <Pressable style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>İptal / Kapat</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: { color: colors.dark, fontSize: 18, fontWeight: "800" },
  closeButton: { padding: 4 },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.dark,
    marginBottom: 12,
  },
  list: { flexGrow: 0 },
  emptyText: { color: colors.muted, textAlign: "center", paddingVertical: 20 },
  row: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowSelected: { backgroundColor: colors.green, borderColor: colors.green },
  rowText: { color: colors.dark, fontWeight: "600", fontSize: 15 },
  rowTextSelected: { color: colors.white, fontWeight: "800" },
  cancelButton: {
    marginTop: 6,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: { color: colors.dark, fontWeight: "700" },
});
