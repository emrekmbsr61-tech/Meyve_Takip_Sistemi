import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { getFruits } from "../pages/Fruits/api";
import { cleanQuantity, getUnitLabel, requiresWholeNumber } from "../utils/unit";

const colors = {
  green: "#2E7D32",
  greenLight: "#EAF5EC",
  dark: "#132118",
  white: "#FFFFFF",
  border: "#DFE7E0",
  muted: "#708075",
  background: "#F6F8F6",
  red: "#C62828",
};

/*
  Müdürün var olan bir plana ekstra ürün seçip miktar girdiği modaldır.
  NeedListCreate ekranındaki ürün seçme mantığıyla aynı fikri kullanır
  (ilk dokununca birim tam sayıysa 1, ondalıklıysa 0.5 ile başlar) ama
  bağımsız, küçük bir bileşen olarak tutulur — NeedListCreate'e dokunulmaz.

  Konum notu: Bu bileşen önceden "Mevcut İhtiyaçlar" (NeedListList) ekranındaydı.
  Müdürün menüsünden o ekran kaldırılınca buraya, alımın gerçekten yapıldığı
  "Alım İşlemleri" ekranına taşındı; müdür artık planı açıp alımı girmeden önce
  eksik kalan bir ürünü aynı ekrandan ekleyebiliyor.
*/
export default function AddExtraProductModal({ visible, existingFruitIds, saving, errorMessage, onSave, onClose }) {
  const [fruits, setFruits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState({}); // fruitId -> quantity (string)

  useEffect(() => {
    if (!visible) return;

    setSelected({});

    (async () => {
      try {
        setLoading(true);
        setLoadError("");
        const data = await getFruits();
        setFruits(Array.isArray(data) ? data.filter((f) => f.isActive !== false) : []);
      } catch (error) {
        setLoadError(error.message || "Meyve listesi alınamadı.");
      } finally {
        setLoading(false);
      }
    })();
  }, [visible]);

  const availableFruits = fruits.filter((fruit) => !existingFruitIds.includes(fruit.id));

  const toggleFruit = (fruit) => {
    setSelected((current) => {
      if (current[fruit.id] !== undefined) {
        const next = { ...current };
        delete next[fruit.id];
        return next;
      }
      const initial = requiresWholeNumber(fruit.unit) ? "1" : "0.5";
      return { ...current, [fruit.id]: initial };
    });
  };

  const changeQuantity = (fruit, value) => {
    setSelected((current) => ({ ...current, [fruit.id]: cleanQuantity(value, fruit.unit) }));
  };

  const selectedCount = Object.keys(selected).length;

  const handleSave = () => {
    const items = Object.entries(selected)
      .map(([fruitId, quantity]) => ({ fruitId: Number(fruitId), requiredQuantity: Number(quantity) }))
      .filter((item) => Number.isFinite(item.requiredQuantity) && item.requiredQuantity > 0);

    onSave(items);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Ekstra Ürün Ekle</Text>
            <Pressable onPress={onClose} style={styles.closeIconButton} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.dark} />
            </Pressable>
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {loading ? <ActivityIndicator color={colors.green} style={{ marginTop: 12 }} /> : null}
            {!loading && loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

            {!loading && !loadError && availableFruits.length === 0 ? (
              <Text style={styles.infoText}>Eklenebilecek yeni ürün yok.</Text>
            ) : null}

            {!loading &&
              !loadError &&
              availableFruits.map((fruit) => {
                const isSelected = selected[fruit.id] !== undefined;

                return (
                  <View key={fruit.id} style={styles.row}>
                    <Pressable style={styles.rowMain} onPress={() => toggleFruit(fruit)}>
                      <Ionicons
                        name={isSelected ? "checkbox" : "square-outline"}
                        size={22}
                        color={isSelected ? colors.green : colors.muted}
                      />
                      <Text style={styles.fruitName}>{fruit.name}</Text>
                      <Text style={styles.fruitUnit}>{getUnitLabel(fruit.unit)}</Text>
                    </Pressable>

                    {isSelected ? (
                      <TextInput
                        value={selected[fruit.id]}
                        onChangeText={(value) => changeQuantity(fruit, value)}
                        keyboardType="decimal-pad"
                        style={styles.quantityInput}
                      />
                    ) : null}
                  </View>
                );
              })}
          </ScrollView>

          <Pressable
            style={[styles.saveButton, (saving || selectedCount === 0) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving || selectedCount === 0}
          >
            <Text style={styles.saveButtonText}>
              {saving ? "Kaydediliyor..." : `Kaydet (${selectedCount} ürün)`}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    height: "80%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { color: colors.dark, fontSize: 17, fontWeight: "800" },
  closeIconButton: { padding: 4 },
  list: { flex: 1, marginTop: 6 },
  infoText: { color: colors.muted, textAlign: "center", paddingVertical: 20 },
  errorText: { color: colors.red, fontWeight: "600", marginTop: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 10,
    gap: 8,
  },
  rowMain: { flexDirection: "row", alignItems: "center", gap: 9, flex: 1 },
  fruitName: { color: colors.dark, fontWeight: "700", fontSize: 14, flexShrink: 1 },
  fruitUnit: { color: colors.muted, fontSize: 12 },
  quantityInput: {
    width: 64,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 8,
    textAlign: "center",
    color: colors.dark,
    fontWeight: "700",
  },
  saveButton: {
    backgroundColor: colors.green,
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 10,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: colors.white, fontWeight: "800", fontSize: 15 },
});
