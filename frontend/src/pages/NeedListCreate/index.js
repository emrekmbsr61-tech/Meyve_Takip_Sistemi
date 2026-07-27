import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";

import { getFruits } from "../Fruits/api";
import { createNeedList } from "../../services/needListService";

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

const FRUITS_PER_PAGE = 8;

function cleanQuantity(value) {
  const normalizedValue = value.replace(",", ".");
  const onlyNumber = normalizedValue.replace(/[^0-9.]/g, "");
  const parts = onlyNumber.split(".");

  return parts.length > 2
    ? `${parts[0]}.${parts.slice(1).join("")}`
    : onlyNumber;
}

export default function NeedListCreate({ currentUser }) {
  const [fruits, setFruits] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState(1);
  const [selectedFruitIds, setSelectedFruitIds] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [storeModalVisible, setStoreModalVisible] = useState(false);
  const [fruitModalVisible, setFruitModalVisible] = useState(false);
  const [fruitPage, setFruitPage] = useState(1);

  useEffect(() => {
    loadFruits();
  }, []);

  const selectedStore =
    stores.find((store) => store.id === selectedStoreId) || stores[0];

  const selectedFruits = fruits.filter((fruit) =>
    selectedFruitIds.includes(fruit.id)
  );

  const totalFruitPages = Math.max(
    1,
    Math.ceil(fruits.length / FRUITS_PER_PAGE)
  );

  const pagedFruits = fruits.slice(
    (fruitPage - 1) * FRUITS_PER_PAGE,
    fruitPage * FRUITS_PER_PAGE
  );

  const loadFruits = async () => {
    try {
      setLoading(true);
      const data = await getFruits();
      setFruits(data);
    } catch (error) {
      setMessage("Meyve listesi alınamadı.");
    } finally {
      setLoading(false);
    }
  };

  const selectStore = (storeId) => {
    setSelectedStoreId(storeId);
    setStoreModalVisible(false);
  };

  const openFruitModal = () => {
    setFruitPage(1);
    setFruitModalVisible(true);
  };

  const toggleFruit = (fruit) => {
    const alreadySelected = selectedFruitIds.includes(fruit.id);

    if (alreadySelected) {
      setSelectedFruitIds(selectedFruitIds.filter((id) => id !== fruit.id));

      const newQuantities = { ...quantities };
      delete newQuantities[fruit.id];
      setQuantities(newQuantities);
    } else {
      setSelectedFruitIds([...selectedFruitIds, fruit.id]);
      setQuantities({
        ...quantities,
        [fruit.id]: "",
      });
    }
  };

  const handleQuantityChange = (fruitId, value) => {
    setQuantities({
      ...quantities,
      [fruitId]: cleanQuantity(value),
    });
  };

  const removeSelectedFruit = (fruitId) => {
    setSelectedFruitIds(selectedFruitIds.filter((id) => id !== fruitId));

    const newQuantities = { ...quantities };
    delete newQuantities[fruitId];
    setQuantities(newQuantities);
  };

  const handleCreatePlan = async () => {
    const selectedItems = selectedFruitIds
      .map((fruitId) => ({
        fruitId,
        quantity: quantities[fruitId],
      }))
      .filter((item) => Number(item.quantity) > 0);

    if (!selectedStore) {
      setMessage("Mağaza seçilmelidir.");
      return;
    }

    if (selectedItems.length === 0) {
      setMessage("En az bir meyve seçilip miktar girilmelidir.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      await Promise.all(
        selectedItems.map((item) =>
          createNeedList({
            planId: selectedStore.planId,
            fruitId: Number(item.fruitId),
            requiredQuantity: Number(item.quantity),
            createdBy: currentUser.id,
            notes: notes
              ? `${selectedStore.name} - ${notes}`
              : `${selectedStore.name} için oluşturuldu`,
          })
        )
      );

      setMessage("İhtiyaç planı oluşturuldu.");
      setSelectedFruitIds([]);
      setQuantities({});
      setNotes("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topCard}>
        <Text style={styles.pageTitle}>İhtiyaç Oluştur</Text>
        <Text style={styles.pageDesc}>
          Mağaza seç, meyveleri belirle ve tek plan altında ihtiyaç oluştur.
        </Text>
      </View>

      <Text style={styles.label}>Mağaza</Text>

      <Pressable
        style={styles.selectorCard}
        onPress={() => setStoreModalVisible(true)}
      >
        <View>
          <Text style={styles.selectorTitle}>{selectedStore.name}</Text>
          <Text style={styles.selectorDesc}>Plan ID: {selectedStore.planId}</Text>
        </View>

        <Text style={styles.selectorArrow}>Değiştir</Text>
      </Pressable>

      <Text style={styles.label}>Meyveler</Text>

      <Pressable style={styles.selectorCard} onPress={openFruitModal}>
        <View>
          <Text style={styles.selectorTitle}>Meyve Seç</Text>
          <Text style={styles.selectorDesc}>
            {selectedFruitIds.length === 0
              ? "Henüz meyve seçilmedi"
              : `${selectedFruitIds.length} meyve seçildi`}
          </Text>
        </View>

        <Text style={styles.selectorArrow}>Seç</Text>
      </Pressable>

      {selectedFruits.length > 0 && (
        <View style={styles.selectedBox}>
          <Text style={styles.sectionTitle}>Seçilen Meyveler</Text>

          {selectedFruits.map((fruit) => (
            <View key={fruit.id} style={styles.selectedFruitCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fruitName}>{fruit.name}</Text>
                <Text style={styles.fruitCode}>
                  {fruit.code} / {fruit.unit}
                </Text>
              </View>

              <View style={styles.quantityBox}>
                <TextInput
                  value={quantities[fruit.id] || ""}
                  onChangeText={(value) => handleQuantityChange(fruit.id, value)}
                  placeholder="0.5"
                  keyboardType="decimal-pad"
                  style={styles.quantityInput}
                />

                <Text style={styles.unitText}>{fruit.unit}</Text>
              </View>

              <Pressable
                style={styles.removeButton}
                onPress={() => removeSelectedFruit(fruit.id)}
              >
                <Text style={styles.removeButtonText}>X</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.label}>Genel Not</Text>

      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Örn: Bugün acil teslim edilsin"
        style={styles.noteInput}
        multiline
      />

      <Pressable
        style={[styles.createButton, saving && styles.disabledButton]}
        onPress={handleCreatePlan}
        disabled={saving}
      >
        <Text style={styles.createButtonText}>
          {saving ? "Kaydediliyor..." : "İhtiyaç Planını Oluştur"}
        </Text>
      </Pressable>

      {message ? (
        <Text
          style={[
            styles.message,
            message.includes("oluşturuldu") ? styles.success : styles.error,
          ]}
        >
          {message}
        </Text>
      ) : null}

      <Modal visible={storeModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Mağaza Seç</Text>

            <ScrollView>
              {stores.map((store) => (
                <Pressable
                  key={store.id}
                  style={[
                    styles.modalItem,
                    selectedStoreId === store.id && styles.modalSelectedItem,
                  ]}
                  onPress={() => selectStore(store.id)}
                >
                  <Text
                    style={[
                      styles.modalItemTitle,
                      selectedStoreId === store.id && styles.modalSelectedText,
                    ]}
                  >
                    {store.name}
                  </Text>

                  <Text
                    style={[
                      styles.modalItemDesc,
                      selectedStoreId === store.id && styles.modalSelectedText,
                    ]}
                  >
                    Plan ID: {store.planId}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              style={styles.closeButton}
              onPress={() => setStoreModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Kapat</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={fruitModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Meyve Seç</Text>
            <Text style={styles.modalSubTitle}>
              Sayfa {fruitPage} / {totalFruitPages}
            </Text>

            {loading ? (
              <ActivityIndicator />
            ) : fruits.length === 0 ? (
              <Text style={styles.emptyText}>Meyve bulunamadı.</Text>
            ) : (
              <ScrollView>
                {pagedFruits.map((fruit) => {
                  const selected = selectedFruitIds.includes(fruit.id);

                  return (
                    <Pressable
                      key={fruit.id}
                      style={[
                        styles.modalItem,
                        selected && styles.modalSelectedItem,
                      ]}
                      onPress={() => toggleFruit(fruit)}
                    >
                      <Text
                        style={[
                          styles.modalItemTitle,
                          selected && styles.modalSelectedText,
                        ]}
                      >
                        {selected ? "✓ " : ""}
                        {fruit.name}
                      </Text>

                      <Text
                        style={[
                          styles.modalItemDesc,
                          selected && styles.modalSelectedText,
                        ]}
                      >
                        {fruit.code} / {fruit.unit}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.paginationRow}>
              <Pressable
                style={[
                  styles.pageButton,
                  fruitPage === 1 && styles.disabledPageButton,
                ]}
                disabled={fruitPage === 1}
                onPress={() => setFruitPage(fruitPage - 1)}
              >
                <Text style={styles.pageButtonText}>Önceki</Text>
              </Pressable>

              <Text style={styles.pageText}>
                {fruitPage} / {totalFruitPages}
              </Text>

              <Pressable
                style={[
                  styles.pageButton,
                  fruitPage === totalFruitPages && styles.disabledPageButton,
                ]}
                disabled={fruitPage === totalFruitPages}
                onPress={() => setFruitPage(fruitPage + 1)}
              >
                <Text style={styles.pageButtonText}>Sonraki</Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.closeButton}
              onPress={() => setFruitModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Tamam</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    borderRadius: 20,
    marginBottom: 20,
  },
  pageTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "bold",
  },
  pageDesc: {
    color: "#D1D5DB",
    marginTop: 8,
    lineHeight: 20,
  },
  label: {
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 8,
    marginTop: 10,
  },
  selectorCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectorTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: colors.text,
  },
  selectorDesc: {
    color: colors.gray,
    marginTop: 4,
  },
  selectorArrow: {
    color: colors.orange,
    fontWeight: "bold",
  },
  selectedBox: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 10,
  },
  selectedFruitCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fruitName: {
    fontWeight: "bold",
    fontSize: 16,
    color: colors.text,
  },
  fruitCode: {
    color: colors.gray,
    marginTop: 4,
  },
  quantityBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  quantityInput: {
    width: 76,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    textAlign: "center",
    backgroundColor: "#F9FAFB",
  },
  unitText: {
    color: colors.gray,
    fontWeight: "bold",
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  removeButtonText: {
    color: colors.white,
    fontWeight: "bold",
  },
  noteInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    textAlignVertical: "top",
  },
  createButton: {
    backgroundColor: colors.orange,
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 18,
  },
  disabledButton: {
    opacity: 0.6,
  },
  createButtonText: {
    color: colors.white,
    fontWeight: "bold",
    fontSize: 16,
  },
  message: {
    marginTop: 14,
    fontWeight: "bold",
  },
  success: {
    color: colors.green,
  },
  error: {
    color: colors.red,
  },
  emptyText: {
    color: colors.gray,
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: colors.white,
    padding: 18,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "75%",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.dark,
    marginBottom: 4,
  },
  modalSubTitle: {
    color: colors.gray,
    marginBottom: 14,
  },
  modalItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    backgroundColor: colors.white,
  },
  modalSelectedItem: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
  },
  modalItemDesc: {
    color: colors.gray,
    marginTop: 4,
  },
  modalSelectedText: {
    color: colors.white,
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 8,
  },
  pageButton: {
    backgroundColor: colors.orange,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  disabledPageButton: {
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
  closeButton: {
    backgroundColor: colors.dark,
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  closeButtonText: {
    color: colors.white,
    fontWeight: "bold",
  },
};