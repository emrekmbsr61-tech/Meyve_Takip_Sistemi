import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, TextInput, View } from "react-native";
import { getUnitLabel, requiresWholeNumber } from "../../utils/unit";
import { API_SERVER_URL } from "../../config/api";
import { getRecentPrices } from "../../services/priceHistoryService";

const colors = {
  green: "#2E7D32",
  dark: "#17211B",
  white: "#FFFFFF",
  border: "#DDE7DF",
  background: "#F4F7F4",
  muted: "#6B7280",
  orange: "#C96800",
};

const DEFAULT_PROFIT_MARGIN = 20;

// Fruits/index.js ekranındaki görsel adresi çözme mantığıyla aynıdır.
function getImageUrl(imagePath) {
  if (!imagePath) {
    return null;
  }

  if (imagePath.startsWith("http")) {
    return imagePath;
  }

  return `${API_SERVER_URL}${imagePath}`;
}

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

function formatShortDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
}

/*
  Bekleyen bir planın tek bir ürünü için alım bilgisi giriş satırıdır.
  PurchaseManagement ekranı büyümesin diye ayrı bir dosyaya çıkarıldı.

  Tedarikçi seçimi burada YOK: bir planın bütün ürünleri artık aynı
  tedarikçiden alınıyor, tedarikçi seçimi PurchaseManagement/index.js'te
  plan seviyesinde tek bir yerde yapılıyor (bkz. selectedSupplierId).

  Satış fiyatı mantığı: alış fiyatı girildiğinde, satış fiyatı henüz elle
  değiştirilmemişse ürünün kar oranına göre otomatik hesaplanır
  (values.salesPriceEdited === false). Müdür satış fiyatını elle değiştirirse
  bu bayrak true olur ve bundan sonra alış fiyatı değişse bile satış fiyatına
  otomatik dokunulmaz — güncel iki fiyata göre efektif kar oranı her zaman
  canlı olarak gösterilir.
*/
export default function PurchaseItemRow({ item, values, onChange, readOnly }) {
  const unitLabel = getUnitLabel(item.fruitUnit);
  const imageUrl = getImageUrl(item.imagePath);
  const marginPercent = item.profitMarginPercent ?? DEFAULT_PROFIT_MARGIN;

  const [recentPrices, setRecentPrices] = useState([]);

  useEffect(() => {
    let isMounted = true;

    getRecentPrices(item.fruitId)
      .then((data) => {
        if (isMounted) setRecentPrices(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        // Fiyat geçmişi alınamazsa sessizce boş bırakılır; alım işlemini engellemez.
      });

    return () => {
      isMounted = false;
    };
  }, [item.fruitId]);

  const quantity = Number(values.purchasedQuantity || 0);
  const unitPrice = Number(values.unitPrice || 0);
  const salesPrice = Number(values.salesPrice || 0);
  const totalPreview = quantity > 0 && unitPrice > 0 ? (quantity * unitPrice).toFixed(2) : "0.00";

  const effectiveMarginText =
    unitPrice > 0 && salesPrice > 0
      ? `%${(((salesPrice - unitPrice) / unitPrice) * 100).toFixed(1)}`
      : `%${marginPercent} (varsayılan)`;

  const handleUnitPriceChange = (value) => {
    const cleaned = cleanDecimal(value);
    onChange("unitPrice", cleaned);

    if (!values.salesPriceEdited) {
      const price = Number(cleaned);
      if (price > 0) {
        onChange("salesPrice", (price * (1 + marginPercent / 100)).toFixed(2));
      } else {
        onChange("salesPrice", "");
      }
    }
  };

  const handleSalesPriceChange = (value) => {
    onChange("salesPrice", cleanDecimal(value));
    onChange("salesPriceEdited", true);
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.imageBox}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <Text style={styles.noImageText}>Görsel yok</Text>
          )}
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.fruitName}>{item.fruitName}</Text>
          <Text style={styles.needInfo}>
            İhtiyaç: {item.requiredQuantity} {unitLabel}
          </Text>
        </View>
      </View>

      {/* Mağaza personelinin bu ürün için yazdığı not (varsa). */}
      {item.staffNote ? (
        <Text style={styles.staffNoteText}>Personel notu: {item.staffNote}</Text>
      ) : null}

      {recentPrices.length > 0 ? (
        <Text style={styles.recentPricesText}>
          Son alımlar: {recentPrices.map((p) => `${p.price} TL (${formatShortDate(p.date)})`).join(" · ")}
        </Text>
      ) : null}

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
          <Text style={styles.label}>Alış Fiyatı</Text>
          <TextInput
            value={values.unitPrice}
            onChangeText={handleUnitPriceChange}
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
            onChangeText={handleSalesPriceChange}
            placeholder="0.00"
            keyboardType="decimal-pad"
            editable={!readOnly}
            style={styles.input}
          />
        </View>
      </View>

      <Text style={styles.marginText}>Kar oranı: {effectiveMarginText}</Text>

      {readOnly ? null : (
        <>
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
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  imageBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  productImage: { width: "100%", height: "100%" },
  noImageText: { color: colors.muted, fontSize: 9, textAlign: "center", paddingHorizontal: 4 },
  headerInfo: { flex: 1 },
  fruitName: { color: colors.dark, fontSize: 16, fontWeight: "800" },
  needInfo: { color: colors.muted, marginTop: 2, fontSize: 12 },
  recentPricesText: { color: colors.muted, fontSize: 11, marginBottom: 6 },
  staffNoteText: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  label: { color: colors.dark, fontWeight: "700", marginTop: 8, marginBottom: 5, fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: colors.dark,
  },
  row: { flexDirection: "row", gap: 10 },
  rowItem: { flex: 1 },
  marginText: { color: colors.orange, fontWeight: "700", fontSize: 12, marginTop: 6 },
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
