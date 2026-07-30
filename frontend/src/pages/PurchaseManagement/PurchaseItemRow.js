import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { getUnitLabel, requiresWholeNumber } from "../../utils/unit";

const colors = {
  green: "#2E7D32",
  dark: "#17211B",
  white: "#FFFFFF",
  border: "#DDE7DF",
  background: "#F4F7F4",
  muted: "#6B7280",
};

// Ondalık fiyat alanları için: sadece rakam ve tek bir nokta kabul eder.
function cleanDecimal(value) {
  const normalized = String(value || "").replace(",", ".").replace(/[^0-9.]/g, "");
  const parts = normalized.split(".");

  return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : normalized;
}

// Alınan miktar alanı: ürünün birimine göre tam sayı veya ondalık kabul eder.
function cleanPurchasedQuantity(value, unit) {
  const normalized = String(value || "").replace(",", ".");

  if (requiresWholeNumber(unit)) {
    return normalized.replace(/[^0-9]/g, "");
  }

  return cleanDecimal(normalized);
}

/*
  Bekleyen bir planın tek bir ürünü için alım bilgisi giriş satırıdır.
  PurchaseManagement ekranı büyümesin diye ayrı bir dosyaya çıkarıldı.
*/
export default function PurchaseItemRow({ item, values, onChange, suppliers, readOnly }) {
  const unitLabel = getUnitLabel(item.fruitUnit);

  const quantity = Number(values.purchasedQuantity || 0);
  const unitPrice = Number(values.unitPrice || 0);
  const totalPreview = quantity > 0 && unitPrice > 0 ? (quantity * unitPrice).toFixed(2) : "0.00";

  return (
    <View style={styles.card}>
      <Text style={styles.fruitName}>{item.fruitName}</Text>
      <Text style={styles.needInfo}>
        İhtiyaç: {item.requiredQuantity} {unitLabel}
      </Text>

      <Text style={styles.label}>Alınan Miktar ({unitLabel})</Text>
      <TextInput
        value={values.purchasedQuantity}
        onChangeText={(value) =>
          onChange("purchasedQuantity", cleanPurchasedQuantity(value, item.fruitUnit))
        }
        placeholder={requiresWholeNumber(item.fruitUnit) ? "1" : "0.5"}
        keyboardType={requiresWholeNumber(item.fruitUnit) ? "number-pad" : "decimal-pad"}
        editable={!readOnly}
        style={styles.input}
      />

      <View style={styles.row}>
        <View style={styles.rowItem}>
          <Text style={styles.label}>Birim Alış Fiyatı</Text>
          <TextInput
            value={values.unitPrice}
            onChangeText={(value) => onChange("unitPrice", cleanDecimal(value))}
            placeholder="0.00"
            keyboardType="decimal-pad"
            editable={!readOnly}
            style={styles.input}
          />
        </View>

        <View style={styles.rowItem}>
          <Text style={styles.label}>Satış Fiyatı</Text>
          <TextInput
            value={values.salesPrice}
            onChangeText={(value) => onChange("salesPrice", cleanDecimal(value))}
            placeholder="0.00"
            keyboardType="decimal-pad"
            editable={!readOnly}
            style={styles.input}
          />
        </View>
      </View>

      {readOnly ? null : (
        <>
          <Text style={styles.label}>Tedarikçi</Text>

          {suppliers.length === 0 ? (
            <Text style={styles.noSupplierText}>Aktif tedarikçi bulunamadı.</Text>
          ) : (
            <View style={styles.supplierRow}>
              {suppliers.map((supplier) => {
                const selected = values.supplierId === supplier.id;

                return (
                  <Pressable
                    key={supplier.id}
                    style={[styles.supplierChip, selected && styles.supplierChipSelected]}
                    onPress={() => onChange("supplierId", supplier.id)}
                  >
                    <Text
                      style={[
                        styles.supplierChipText,
                        selected && styles.supplierChipTextSelected,
                      ]}
                    >
                      {supplier.supplierName}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Text style={styles.label}>Not</Text>
          <TextInput
            value={values.notes}
            onChangeText={(value) => onChange("notes", value)}
            placeholder="Opsiyonel not..."
            style={styles.input}
          />
        </>
      )}

      <View style={styles.totalBox}>
        <Text style={styles.totalLabel}>Toplam Tutar (ön izleme)</Text>
        <Text style={styles.totalValue}>{totalPreview}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  fruitName: { color: colors.dark, fontSize: 18, fontWeight: "800" },
  needInfo: { color: colors.muted, marginTop: 3, marginBottom: 10 },
  label: { color: colors.dark, fontWeight: "700", marginTop: 8, marginBottom: 6, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.dark,
  },
  row: { flexDirection: "row", gap: 10 },
  rowItem: { flex: 1 },
  supplierRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  supplierChip: {
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  supplierChipSelected: { backgroundColor: colors.green },
  supplierChipText: { color: colors.green, fontWeight: "700", fontSize: 13 },
  supplierChipTextSelected: { color: colors.white },
  noSupplierText: { color: "#DC2626", fontWeight: "600" },
  totalBox: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { color: colors.muted, fontWeight: "600" },
  totalValue: { color: colors.dark, fontWeight: "800", fontSize: 16 },
});
