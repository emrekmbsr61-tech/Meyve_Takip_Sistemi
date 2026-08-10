import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { getUnitLabel } from "../../utils/unit";

const colors = {
  green: "#2E7D32",
  greenLight: "#EAF5EC",
  orange: "#C96800",
  orangeLight: "#FFF4E2",
  dark: "#132118",
  white: "#FFFFFF",
  border: "#DFE7E0",
  muted: "#708075",
  red: "#C62828",
  background: "#F6F8F6",
};

// Bir aşama miktarı girilmemişse "Girilmedi" gösterilir; sıfır gibi yanlış bir izlenim verilmez.
function formatQuantity(value, unit) {
  if (value === null || value === undefined) return "Girilmedi";
  return `${value} ${getUnitLabel(unit)}`;
}

/*
  NeedListList (Mevcut İhtiyaçlar) ekranındaki "Sonucu Gör" butonuna basınca
  açılan, bir planın İhtiyaç/Alım/Toplama/Kabul miktar karşılaştırmasını
  gösteren modal. SupplierPickerModal ile aynı sheet/backdrop deseni kullanılır.
*/
export default function PlanSummaryModal({ visible, plan, summary, loading, errorMessage, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Plan #{plan?.planId} Sonuç Özeti</Text>

            <Pressable onPress={onClose} style={styles.closeIconButton} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.dark} />
            </Pressable>
          </View>

          {/*
            Genel özet (rozet + summaryMessage) kasıtlı olarak ScrollView'ın
            DIŞINDA: kullanıcı listeyi aşağı kaydırsa bile bu bilgi her zaman
            görünür kalır, başlığın altında kaybolmaz.
          */}
          {!loading && !errorMessage && summary ? (
            <View style={styles.summaryBox}>
              <View
                style={[
                  styles.badge,
                  summary.consistencyStatus === "CONSISTENT" ? styles.badgeGreen : styles.badgeOrange,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    summary.consistencyStatus === "CONSISTENT"
                      ? styles.badgeTextGreen
                      : styles.badgeTextOrange,
                  ]}
                >
                  {summary.consistencyStatus === "CONSISTENT" ? "Tutarlı" : "Uyarı Var"}
                </Text>
              </View>

              <Text style={styles.summaryMessage}>{summary.summaryMessage}</Text>
            </View>
          ) : null}

          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {loading ? <Text style={styles.infoText}>Yükleniyor...</Text> : null}

            {!loading && errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            {!loading && !errorMessage && summary ? (
              <>
                {(summary.items || []).map((item) => (
                  <View
                    key={item.fruitId}
                    style={[styles.itemCard, !item.consistent && styles.itemCardWarning]}
                  >
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemName}>{item.fruitName}</Text>

                      <View style={[styles.badge, item.consistent ? styles.badgeGreen : styles.badgeOrange]}>
                        <Text
                          style={[
                            styles.badgeText,
                            item.consistent ? styles.badgeTextGreen : styles.badgeTextOrange,
                          ]}
                        >
                          {item.consistent ? "Tutarlı" : "Tutarsız"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.stageRow}>
                      <View style={styles.stageBox}>
                        <Text style={styles.stageLabel}>İhtiyaç</Text>
                        <Text style={styles.stageValue}>
                          {formatQuantity(item.requiredQuantity, item.unit)}
                        </Text>
                      </View>

                      <View style={styles.stageBox}>
                        <Text style={styles.stageLabel}>Alım</Text>
                        <Text style={styles.stageValue}>
                          {formatQuantity(item.purchasedQuantity, item.unit)}
                        </Text>
                      </View>

                      <View style={styles.stageBox}>
                        <Text style={styles.stageLabel}>Toplama</Text>
                        <Text style={styles.stageValue}>
                          {formatQuantity(item.collectedQuantity, item.unit)}
                        </Text>
                      </View>

                      <View style={styles.stageBox}>
                        <Text style={styles.stageLabel}>Kabul</Text>
                        <Text style={styles.stageValue}>
                          {formatQuantity(item.acceptedQuantity, item.unit)}
                        </Text>
                      </View>

                      <View style={styles.stageBox}>
                        <Text style={styles.stageLabel}>Red</Text>
                        <Text style={[styles.stageValue, item.rejectedQuantity ? styles.stageValueWarning : null]}>
                          {formatQuantity(item.rejectedQuantity, item.unit)}
                        </Text>
                      </View>
                    </View>

                    {item.unitPrice != null || item.salesPrice != null ? (
                      <View style={styles.priceRow}>
                        {item.unitPrice != null ? (
                          <Text style={styles.priceText}>Alış: {item.unitPrice} TL</Text>
                        ) : null}
                        {item.salesPrice != null ? (
                          <Text style={styles.priceText}>Satış: {item.salesPrice} TL</Text>
                        ) : null}
                      </View>
                    ) : null}

                    {(item.issues || []).length > 0 ? (
                      <View style={styles.issueBox}>
                        {item.issues.map((issue, index) => (
                          <Text key={index} style={styles.issueText}>
                            • {issue}
                          </Text>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.okText}>Bu ürün için miktar farkı bulunamadı.</Text>
                    )}
                  </View>
                ))}
              </>
            ) : null}
          </ScrollView>

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Kapat</Text>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    height: "85%",
  },
  // Başlık sabit kalır (ScrollView dışında); içerik her zaman bunun altından başlar.
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { color: colors.dark, fontSize: 18, fontWeight: "800", flexShrink: 1 },
  closeIconButton: { padding: 4 },
  // flex: 1 sayesinde ScrollView, sabit header + summaryBox + kapat butonu arasında
  // kalan alanı doldurur ve yalnızca ürün listesi kaydırılır.
  list: { flex: 1, marginTop: 6 },
  infoText: { color: colors.muted, textAlign: "center", paddingVertical: 20 },
  errorText: { color: colors.red, fontWeight: "600", textAlign: "center", paddingVertical: 20 },
  summaryBox: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
  },
  summaryMessage: { color: colors.dark, marginTop: 8, lineHeight: 20, fontWeight: "600" },
  badge: { alignSelf: "flex-start", paddingHorizontal: 11, paddingVertical: 6, borderRadius: 16 },
  badgeGreen: { backgroundColor: colors.greenLight },
  badgeOrange: { backgroundColor: colors.orangeLight },
  badgeText: { fontWeight: "800", fontSize: 12 },
  badgeTextGreen: { color: colors.green },
  badgeTextOrange: { color: colors.orange },
  itemCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  itemCardWarning: { borderColor: "#F0C68A", backgroundColor: "#FFFBF3" },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  itemName: { color: colors.dark, fontWeight: "800", fontSize: 16, flexShrink: 1 },
  stageRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  stageBox: {
    flexGrow: 1,
    minWidth: "22%",
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 8,
  },
  stageLabel: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  stageValue: { color: colors.dark, fontWeight: "800", marginTop: 2, fontSize: 13 },
  stageValueWarning: { color: colors.red },
  priceRow: { flexDirection: "row", gap: 14, marginTop: 2, marginBottom: 8 },
  priceText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  issueBox: { marginTop: 4 },
  issueText: { color: colors.orange, fontSize: 12, lineHeight: 18, marginBottom: 2 },
  okText: { color: colors.green, fontSize: 12, marginTop: 2 },
  closeButton: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeButtonText: { color: colors.dark, fontWeight: "700" },
});