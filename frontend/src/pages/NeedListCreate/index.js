import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { getFruits } from "../Fruits/api";
import { createNeedList } from "../../services/needListService";
import { stores } from "../../config/stores";
import { API_BASE_URL } from "../../config/api";
import { getUnitLabel, requiresWholeNumber, cleanQuantity } from "../../utils/unit";
import { normalizeSearchText } from "../../utils/search";

const colors = {
  green: "#2E7D32",
  darkGreen: "#1B5E20",
  lightGreen: "#EAF5EC",
  white: "#FFFFFF",
  background: "#F4F7F4",
  border: "#DDE7DF",
  text: "#17211B",
  gray: "#6B7280",
  red: "#DC2626",
};

const FRUITS_PER_PAGE = 8;

/*
  API_BASE_URL:
  http://10.0.2.2:8080/api

  Görsellerin adresi:
  http://10.0.2.2:8080/fruits/ananas.jpeg

  Bu nedenle sondaki /api kısmını kaldırıyoruz.
*/
const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

// Backend'den gelen imagePath değerini tam görsel adresine çevirir.
function getImageUrl(imagePath) {
  if (!imagePath) {
    return null;
  }

  if (imagePath.startsWith("http")) {
    return imagePath;
  }

  return `${IMAGE_BASE_URL}${imagePath}`;
}

export default function NeedListCreate({ currentUser }) {
  // Backend'den alınan bütün meyveler.
  const [fruits, setFruits] = useState([]);

  // Seçilen mağazanın frontend id değeri.
  const [selectedStoreId, setSelectedStoreId] = useState(1);

  // Seçilen meyvelerin id listesi.
  const [selectedFruitIds, setSelectedFruitIds] = useState([]);

  // Her meyve için girilen miktarı tutar.
  const [quantities, setQuantities] = useState({});

  // Plan için girilen genel not.
  const [notes, setNotes] = useState("");

  // Başarı veya hata mesajı.
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [storeModalVisible, setStoreModalVisible] =
    useState(false);

  const [fruitModalVisible, setFruitModalVisible] =
    useState(false);

  const [fruitPage, setFruitPage] = useState(1);

  // Meyve seçim penceresindeki arama metni.
  const [fruitSearch, setFruitSearch] = useState("");

  // Ekran ilk açıldığında meyveleri backend'den getirir.
  useEffect(() => {
    loadFruits();
  }, []);

  // Seçilen mağazanın bütün bilgisini bulur.
  const selectedStore =
    stores.find((store) => store.id === selectedStoreId) ||
    stores[0] ||
    null;

  // Seçilen meyvelerin bütün bilgilerini bulur.
  const selectedFruits = fruits.filter((fruit) =>
    selectedFruitIds.includes(fruit.id)
  );

  /*
    Arama kutusuna yazılan metne göre filtrelenmiş meyve listesi.
    Ürün adı veya kodu içinde arama, büyük/küçük harfe ve Türkçe
    karakterlere duyarsız şekilde karşılaştırılır.
  */
  const filteredFruits = useMemo(() => {
    const query = normalizeSearchText(fruitSearch);

    if (!query) {
      return fruits;
    }

    return fruits.filter((fruit) => {
      const name = normalizeSearchText(fruit.name);
      const code = normalizeSearchText(fruit.code);

      return name.includes(query) || code.includes(query);
    });
  }, [fruits, fruitSearch]);

  // Meyve seçim penceresindeki toplam sayfa sayısı (filtrelenmiş listeye göre).
  const totalFruitPages = Math.max(
    1,
    Math.ceil(filteredFruits.length / FRUITS_PER_PAGE)
  );

  // O an açık olan sayfadaki meyveler.
  const pagedFruits = filteredFruits.slice(
    (fruitPage - 1) * FRUITS_PER_PAGE,
    fruitPage * FRUITS_PER_PAGE
  );

  // Meyveleri backend'den getirir.
  async function loadFruits() {
    try {
      setLoading(true);
      setMessage("");

      const data = await getFruits();

      setFruits(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage(
        error.message || "Meyve listesi alınamadı."
      );
    } finally {
      setLoading(false);
    }
  }

  // Mağazayı seçer ve mağaza penceresini kapatır.
  function selectStore(storeId) {
    setSelectedStoreId(storeId);
    setStoreModalVisible(false);
  }

  // Meyve seçim penceresini açar.
  function openFruitModal() {
    setFruitPage(1);
    setFruitSearch("");
    setFruitModalVisible(true);
  }

  // Meyve seçim penceresini kapatır ve arama metnini temizler.
  function closeFruitModal() {
    setFruitModalVisible(false);
    setFruitSearch("");
  }

  // Arama metni değiştikçe listeyi ilk sayfadan göstermeye başlar.
  function handleFruitSearchChange(value) {
    setFruitSearch(value);
    setFruitPage(1);
  }

  // Meyveyi seçer veya seçimi kaldırır.
  function toggleFruit(fruit) {
    const alreadySelected = selectedFruitIds.includes(
      fruit.id
    );

    if (alreadySelected) {
      setSelectedFruitIds((current) =>
        current.filter((id) => id !== fruit.id)
      );

      setQuantities((current) => {
        const nextQuantities = { ...current };

        delete nextQuantities[fruit.id];

        return nextQuantities;
      });

      return;
    }

    setSelectedFruitIds((current) => [
      ...current,
      fruit.id,
    ]);

    setQuantities((current) => ({
      ...current,
      [fruit.id]: "",
    }));
  }

  // İlgili meyvenin miktar bilgisini günceller.
  function handleQuantityChange(fruit, value) {
    setQuantities((current) => ({
      ...current,
      [fruit.id]: cleanQuantity(value, fruit.unit),
    }));
  }

  // Seçilen meyveyi formdan kaldırır.
  function removeSelectedFruit(fruitId) {
    setSelectedFruitIds((current) =>
      current.filter((id) => id !== fruitId)
    );

    setQuantities((current) => {
      const nextQuantities = { ...current };

      delete nextQuantities[fruitId];

      return nextQuantities;
    });
  }

  // İhtiyaç planını backend'e kaydeder.
  async function handleCreatePlan() {
    try {
      setMessage("");

      if (!selectedStore) {
        throw new Error("Mağaza seçilmelidir.");
      }

      if (selectedFruitIds.length === 0) {
        throw new Error("En az bir ürün seçilmelidir.");
      }

      /*
        Seçilen her meyvenin miktarı kontrol edilir.

        Backend'de her meyve ayrı NeedList kaydıdır.
        Hepsinde aynı planId kullanıldığı için aynı plan altında görünür.
      */
      const selectedItems = selectedFruitIds.map(
        (fruitId) => {
          const fruit = fruits.find(
            (item) => item.id === fruitId
          );

          const quantityText = quantities[fruitId];
          const quantity = Number(quantityText);

          if (!fruit) {
            throw new Error("Seçilen ürün bulunamadı.");
          }

          if (
            !quantityText ||
            !Number.isFinite(quantity) ||
            quantity <= 0
          ) {
            throw new Error(
              `${fruit.name} için geçerli miktar girilmelidir.`
            );
          }

          if (
            requiresWholeNumber(fruit.unit) &&
            !Number.isInteger(quantity)
          ) {
            throw new Error(
              `${fruit.name} için yalnızca tam sayı girilebilir.`
            );
          }

          return {
            fruitId: fruit.id,
            quantity,
          };
        }
      );

      setSaving(true);

      await Promise.all(
        selectedItems.map((item) =>
          createNeedList({
            planId: selectedStore.planId,
            fruitId: Number(item.fruitId),
            requiredQuantity: item.quantity,
            createdBy: currentUser.id,
            notes: notes.trim()
              ? `${selectedStore.name} - ${notes.trim()}`
              : `${selectedStore.name} için oluşturuldu`,
          })
        )
      );

      setMessage("İhtiyaç planı oluşturuldu.");

      // Başarılı işlemden sonra form temizlenir.
      setSelectedFruitIds([]);
      setQuantities({});
      setNotes("");

      Keyboard.dismiss();
    } catch (error) {
      setMessage(
        error.message || "İhtiyaç planı oluşturulamadı."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <TouchableWithoutFeedback
      onPress={Keyboard.dismiss}
      accessible={false}
    >
      <View style={styles.screen}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Üst başlık kartı */}
          <View style={styles.topCard}>
            <Text style={styles.pageTitle}>
              Yeni İhtiyaç Planı
            </Text>

            <Text style={styles.pageDescription}>
              Mağaza seç, ürünleri belirle ve tek plan
              altında ihtiyaç oluştur.
            </Text>
          </View>

          {/* Mağaza seçimi */}
          <Text style={styles.label}>Mağaza</Text>

          <Pressable
            style={styles.selectorCard}
            onPress={() => setStoreModalVisible(true)}
          >
            <View style={styles.selectorTextArea}>
              <Text style={styles.selectorTitle}>
                {selectedStore?.name || "Mağaza seç"}
              </Text>

              <Text style={styles.selectorDescription}>
                Mağazayı değiştirmek için dokunun
              </Text>
            </View>

            <Text style={styles.selectorAction}>
              Değiştir
            </Text>
          </Pressable>

          {/* Ürün başlığı ve ürün ekleme butonu */}
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>Ürünler</Text>

            <Pressable
              style={styles.addProductButton}
              onPress={openFruitModal}
            >
              <Text style={styles.addProductText}>
                + Ürün Ekle
              </Text>
            </Pressable>
          </View>

          {/* Hiç ürün seçilmediyse */}
          {selectedFruits.length === 0 ? (
            <Pressable
              style={styles.emptyProductCard}
              onPress={openFruitModal}
            >
              <Text style={styles.emptyProductTitle}>
                Henüz ürün seçilmedi
              </Text>

              <Text style={styles.emptyProductDescription}>
                Ürün eklemek için buraya dokunun.
              </Text>
            </Pressable>
          ) : null}

          {/* Seçilen ürünler */}
          {selectedFruits.map((fruit) => {
            const imageUrl = getImageUrl(
              fruit.imagePath
            );

            const unitLabel = getUnitLabel(
              fruit.unit
            );

            return (
              <View
                key={fruit.id}
                style={styles.selectedFruitCard}
              >
                <View style={styles.selectedFruitHeader}>
                  {/* Ürün görseli */}
                  <View style={styles.fruitImageBox}>
                    {imageUrl ? (
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.fruitImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.noImageText}>
                        Görsel yok
                      </Text>
                    )}
                  </View>

                  {/* Ürün adı ve kodu */}
                  <View style={styles.fruitTextArea}>
                    <Text style={styles.fruitName}>
                      {fruit.name}
                    </Text>

                    <Text style={styles.fruitCode}>
                      {fruit.code} · {unitLabel}
                    </Text>
                  </View>

                  {/* Ürünü kaldırma butonu */}
                  <Pressable
                    style={styles.removeButton}
                    onPress={() =>
                      removeSelectedFruit(fruit.id)
                    }
                  >
                    <Text style={styles.removeButtonText}>
                      Sil
                    </Text>
                  </Pressable>
                </View>

                {/* Miktar alanı */}
                <Text style={styles.quantityLabel}>
                  Miktar
                </Text>

                <View style={styles.quantityBox}>
                  <TextInput
                    value={quantities[fruit.id] || ""}
                    onChangeText={(value) =>
                      handleQuantityChange(fruit, value)
                    }
                    placeholder={
                      requiresWholeNumber(fruit.unit)
                        ? "1"
                        : "0,5"
                    }
                    keyboardType={
                      requiresWholeNumber(fruit.unit)
                        ? "number-pad"
                        : "decimal-pad"
                    }
                    style={styles.quantityInput}
                  />

                  <Text style={styles.unitText}>
                    {unitLabel}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Plan notu */}
          <Text style={styles.label}>Plan Notu</Text>

          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Teslimat veya ürünlerle ilgili not ekleyin..."
            style={styles.noteInput}
            multiline
          />

          {/* Planı oluşturma butonu */}
          <Pressable
            style={[
              styles.createButton,
              saving && styles.disabledButton,
            ]}
            onPress={handleCreatePlan}
            disabled={saving}
          >
            <Text style={styles.createButtonText}>
              {saving
                ? "Kaydediliyor..."
                : "İhtiyaç Planını Oluştur"}
            </Text>
          </Pressable>

          {/* Başarı veya hata mesajı */}
          {message ? (
            <Text
              style={[
                styles.message,
                message.includes("oluşturuldu")
                  ? styles.successMessage
                  : styles.errorMessage,
              ]}
            >
              {message}
            </Text>
          ) : null}
        </ScrollView>

        {/* Mağaza seçim penceresi */}
        <Modal
          visible={storeModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() =>
            setStoreModalVisible(false)
          }
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() =>
              setStoreModalVisible(false)
            }
          >
            <Pressable
              style={styles.modalBox}
              onPress={(event) =>
                event.stopPropagation()
              }
            >
              <Text style={styles.modalTitle}>
                Mağaza Seç
              </Text>

              <ScrollView
                showsVerticalScrollIndicator={false}
              >
                {stores.map((store) => {
                  const selected =
                    selectedStoreId === store.id;

                  return (
                    <Pressable
                      key={store.id}
                      style={[
                        styles.modalItem,
                        selected &&
                          styles.selectedModalItem,
                      ]}
                      onPress={() =>
                        selectStore(store.id)
                      }
                    >
                      <Text
                        style={[
                          styles.modalItemTitle,
                          selected &&
                            styles.selectedModalText,
                        ]}
                      >
                        {store.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Pressable
                style={styles.closeButton}
                onPress={() =>
                  setStoreModalVisible(false)
                }
              >
                <Text style={styles.closeButtonText}>
                  Kapat
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Meyve seçim penceresi */}
        <Modal
          visible={fruitModalVisible}
          transparent
          animationType="slide"
          onRequestClose={closeFruitModal}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={closeFruitModal}
          >
            <Pressable
              style={styles.modalBox}
              onPress={(event) =>
                event.stopPropagation()
              }
            >
              <Text style={styles.modalTitle}>
                Meyve Seç
              </Text>

              <TextInput
                value={fruitSearch}
                onChangeText={handleFruitSearchChange}
                placeholder="Ürün adı veya kodu ara..."
                autoCapitalize="none"
                style={styles.searchInput}
              />

              <Text style={styles.modalSubtitle}>
                Sayfa {fruitPage} / {totalFruitPages}
              </Text>

              {loading ? (
                <ActivityIndicator
                  size="large"
                  color={colors.green}
                />
              ) : fruits.length === 0 ? (
                <Text style={styles.emptyText}>
                  Meyve bulunamadı.
                </Text>
              ) : filteredFruits.length === 0 ? (
                <Text style={styles.emptyText}>
                  Ürün bulunamadı
                </Text>
              ) : (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                >
                  {pagedFruits.map((fruit) => {
                    const selected =
                      selectedFruitIds.includes(
                        fruit.id
                      );

                    const imageUrl = getImageUrl(
                      fruit.imagePath
                    );

                    return (
                      <Pressable
                        key={fruit.id}
                        style={[
                          styles.modalItem,
                          styles.modalFruitItem,
                          selected &&
                            styles.selectedModalItem,
                        ]}
                        onPress={() =>
                          toggleFruit(fruit)
                        }
                      >
                        {/* Meyve görseli */}
                        <View
                          style={
                            styles.modalFruitImageBox
                          }
                        >
                          {imageUrl ? (
                            <Image
                              source={{ uri: imageUrl }}
                              style={styles.fruitImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <Text
                              style={styles.noImageText}
                            >
                              Görsel yok
                            </Text>
                          )}
                        </View>

                        {/* Meyve bilgileri */}
                        <View style={styles.fruitTextArea}>
                          <Text
                            style={[
                              styles.modalItemTitle,
                              selected &&
                                styles.selectedModalText,
                            ]}
                          >
                            {selected ? "✓ " : ""}
                            {fruit.name}
                          </Text>

                          <Text
                            style={[
                              styles.modalItemDescription,
                              selected &&
                                styles.selectedModalText,
                            ]}
                          >
                            {fruit.code} ·{" "}
                            {getUnitLabel(fruit.unit)}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              {/* Sayfalama */}
              <View style={styles.paginationRow}>
                <Pressable
                  style={[
                    styles.pageButton,
                    fruitPage === 1 &&
                      styles.disabledPageButton,
                  ]}
                  disabled={fruitPage === 1}
                  onPress={() =>
                    setFruitPage(
                      (current) => current - 1
                    )
                  }
                >
                  <Text style={styles.pageButtonText}>
                    Önceki
                  </Text>
                </Pressable>

                <Text style={styles.pageText}>
                  {fruitPage} / {totalFruitPages}
                </Text>

                <Pressable
                  style={[
                    styles.pageButton,
                    fruitPage === totalFruitPages &&
                      styles.disabledPageButton,
                  ]}
                  disabled={
                    fruitPage === totalFruitPages
                  }
                  onPress={() =>
                    setFruitPage(
                      (current) => current + 1
                    )
                  }
                >
                  <Text style={styles.pageButtonText}>
                    Sonraki
                  </Text>
                </Pressable>
              </View>

              <Pressable
                style={styles.closeButton}
                onPress={closeFruitModal}
              >
                <Text style={styles.closeButtonText}>
                  Tamam
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: 16,
    paddingBottom: 35,
  },

  topCard: {
    backgroundColor: colors.darkGreen,
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
  },

  pageTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "bold",
  },

  pageDescription: {
    color: "#D8EAD9",
    marginTop: 8,
    lineHeight: 20,
  },

  label: {
    color: colors.text,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 8,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectorCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectorTextArea: {
    flex: 1,
    paddingRight: 12,
  },

  selectorTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "bold",
  },

  selectorDescription: {
    color: colors.gray,
    marginTop: 4,
  },

  selectorAction: {
    color: colors.green,
    fontWeight: "bold",
  },

  addProductButton: {
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  addProductText: {
    color: colors.green,
    fontWeight: "bold",
  },

  emptyProductCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    alignItems: "center",
  },

  emptyProductTitle: {
    color: colors.text,
    fontWeight: "bold",
  },

  emptyProductDescription: {
    color: colors.gray,
    marginTop: 5,
  },

  selectedFruitCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 13,
    marginBottom: 12,
  },

  selectedFruitHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  fruitImageBox: {
    width: 58,
    height: 58,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  modalFruitImageBox: {
    width: 52,
    height: 52,
    borderRadius: 13,
    overflow: "hidden",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  fruitImage: {
    width: "100%",
    height: "100%",
  },

  noImageText: {
    color: colors.gray,
    fontSize: 9,
    textAlign: "center",
  },

  fruitTextArea: {
    flex: 1,
  },

  fruitName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "bold",
  },

  fruitCode: {
    color: colors.gray,
    marginTop: 4,
  },

  removeButton: {
    borderWidth: 1,
    borderColor: "#F3B9B9",
    borderRadius: 11,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },

  removeButtonText: {
    color: colors.red,
    fontWeight: "bold",
  },

  quantityLabel: {
    color: colors.text,
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 7,
  },

  quantityBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    paddingHorizontal: 12,
  },

  quantityInput: {
    flex: 1,
    color: colors.text,
    fontWeight: "700",
    fontSize: 16,
    paddingVertical: 12,
  },

  unitText: {
    color: colors.gray,
    fontWeight: "bold",
    fontSize: 12,
  },

  noteInput: {
    minHeight: 95,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 13,
    textAlignVertical: "top",
  },

  createButton: {
    backgroundColor: colors.green,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginTop: 18,
  },

  disabledButton: {
    opacity: 0.6,
  },

  createButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "bold",
  },

  message: {
    marginTop: 14,
    fontWeight: "bold",
  },

  successMessage: {
    color: colors.green,
  },

  errorMessage: {
    color: colors.red,
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
    maxHeight: "78%",
  },

  modalTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },

  modalSubtitle: {
    color: colors.gray,
    marginBottom: 14,
  },

  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    color: colors.text,
  },

  modalItem: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },

  modalFruitItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  selectedModalItem: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },

  modalItemTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "bold",
  },

  modalItemDescription: {
    color: colors.gray,
    marginTop: 4,
  },

  selectedModalText: {
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
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },

  disabledPageButton: {
    opacity: 0.4,
  },

  pageButtonText: {
    color: colors.white,
    fontWeight: "bold",
  },

  pageText: {
    color: colors.text,
    fontWeight: "bold",
  },

  closeButton: {
    backgroundColor: colors.darkGreen,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },

  closeButtonText: {
    color: colors.white,
    fontWeight: "bold",
  },

  emptyText: {
    color: colors.gray,
    marginBottom: 10,
  },
});