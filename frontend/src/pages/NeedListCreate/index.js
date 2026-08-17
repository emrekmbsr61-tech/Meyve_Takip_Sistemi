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
import { createNeedListPlan } from "../../services/needListService";
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

export default function NeedListCreate({ currentUser, navigation }) {
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

  /*
    Meyveye ilk kez dokunulduğunda seçer ve uygun bir başlangıç miktarı verir:
    tam sayı gereken birimlerde (ADET/KASA/PAKET/DEMET) 1, ondalıklı
    birimlerde (KG) 0,5. requiresWholeNumber zaten unit.js'de tanımlı.
  */
  function selectFruit(fruit) {
    const step = requiresWholeNumber(fruit.unit) ? 1 : 0.5;

    setSelectedFruitIds((current) => [...current, fruit.id]);

    setQuantities((current) => ({
      ...current,
      [fruit.id]: String(step),
    }));
  }

  /*
    Meyve seçim penceresindeki eksi/artı butonlarıyla miktarı değiştirir.
    Adım büyüklüğü de selectFruit ile aynı kurala uyar (tam sayı birimlerde 1,
    ondalıklı birimlerde 0,5). Miktar sıfırın altına inerse ürün seçili
    listeden tamamen kaldırılır.
  */
  function stepQuantity(fruit, direction) {
    const step = requiresWholeNumber(fruit.unit) ? 1 : 0.5;
    const current = parseFloat(quantities[fruit.id]) || 0;
    const next = current + direction * step;

    if (next <= 0) {
      removeSelectedFruit(fruit.id);
      return;
    }

    setQuantities((prevState) => ({
      ...prevState,
      [fruit.id]: String(next),
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

  /*
    İhtiyaç planını backend'e kaydeder.
    Tek bir istekle (POST /need-lists/plan) hem yeni bir DeliveryPlan hem de bu
    plana ait tüm NeedList satırları backend'de, tek transaction içinde oluşturulur.
    planId burada ASLA üretilmez/gönderilmez — backend üretir. Böylece her yeni plan
    gerçekten benzersiz bir planId alır (eski "mağaza = sabit planId" hatası düzeldi).
  */
  async function handleCreatePlan() {
    try {
      setMessage("");

      if (!selectedStore) {
        throw new Error("Mağaza seçilmelidir.");
      }

      if (selectedFruitIds.length === 0) {
        throw new Error("En az bir ürün seçilmelidir.");
      }

      // Seçilen her meyvenin miktarı kontrol edilir; her meyve tek bir ürün satırıdır.
      const items = selectedFruitIds.map((fruitId) => {
        const fruit = fruits.find((item) => item.id === fruitId);

        const quantityText = quantities[fruitId];
        const quantity = Number(quantityText);

        if (!fruit) {
          throw new Error("Seçilen ürün bulunamadı.");
        }

        if (!quantityText || !Number.isFinite(quantity) || quantity <= 0) {
          throw new Error(
            `${fruit.name} için geçerli miktar girilmelidir.`
          );
        }

        if (requiresWholeNumber(fruit.unit) && !Number.isInteger(quantity)) {
          throw new Error(
            `${fruit.name} için yalnızca tam sayı girilebilir.`
          );
        }

        return {
          fruitId: Number(fruit.id),
          requiredQuantity: quantity,
        };
      });

      setSaving(true);

      await createNeedListPlan({
        storeId: String(selectedStore.id),
        createdBy: currentUser.id,
        generalNotes: notes.trim() || null,
        items,
      });

      setMessage("İhtiyaç planı oluşturuldu.");

      // Başarılı işlemden sonra form (seçili ürünler, miktarlar, not) temizlenir.
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

          {/* İkincil geçiş: daha önce oluşturulmuş planları görüntüleme ekranı */}
          <Pressable
            style={styles.secondaryLink}
            onPress={() => navigation?.navigate("NeedListList")}
          >
            <Text style={styles.secondaryLinkText}>
              Mevcut İhtiyaçları Gör →
            </Text>
          </Pressable>

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

          {/*
            Ürün başlığı. Hiç ürün seçilmediyse aşağıdaki büyük "Henüz ürün
            seçilmedi" kartı zaten seçim penceresini açar; ürün seçiliyken de
            küçük bir metin bağlantısıyla aynı pencere tekrar açılabilir.
          */}
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>Ürünler</Text>

            {selectedFruits.length > 0 ? (
              <Pressable onPress={openFruitModal} hitSlop={8}>
                <Text style={styles.editProductsText}>
                  Ürün Ekle / Düzenle
                </Text>
              </Pressable>
            ) : null}
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
                          selected &&
                            styles.selectedModalItem,
                        ]}
                        // Seçiliyken kart bir kez daha dokununca hiçbir şey
                        // yapmaz; miktar artık yalnızca eksi/artı butonlarıyla
                        // değişir, sıfıra inince ürün otomatik kaldırılır.
                        onPress={
                          selected
                            ? undefined
                            : () => selectFruit(fruit)
                        }
                      >
                        <View style={styles.modalFruitItem}>
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
                        </View>

                        {/* Seçiliyken aynı kartın içinde miktar kontrolü */}
                        {selected ? (
                          <View style={styles.modalQuantityRow}>
                            <Pressable
                              style={styles.stepButton}
                              onPress={() =>
                                stepQuantity(fruit, -1)
                              }
                              hitSlop={8}
                            >
                              <Text style={styles.stepButtonText}>
                                -
                              </Text>
                            </Pressable>

                            {/*
                              Çok yüksek miktarlarda (ör. büyük bir kasa siparişi)
                              yalnızca +/- ile artırmak zahmetli olduğu için miktar
                              burada doğrudan yazılabilir; +/- butonları da aynı
                              anda çalışmaya devam eder.
                            */}
                            <View style={styles.modalQuantityInputBox}>
                              <TextInput
                                value={String(
                                  quantities[fruit.id] ?? ""
                                ).replace(".", ",")}
                                onChangeText={(value) =>
                                  handleQuantityChange(fruit, value)
                                }
                                keyboardType={
                                  requiresWholeNumber(fruit.unit)
                                    ? "number-pad"
                                    : "decimal-pad"
                                }
                                style={styles.modalQuantityInput}
                              />

                              <Text style={styles.modalQuantityUnit}>
                                {getUnitLabel(fruit.unit)}
                              </Text>
                            </View>

                            <Pressable
                              style={styles.stepButton}
                              onPress={() =>
                                stepQuantity(fruit, 1)
                              }
                              hitSlop={8}
                            >
                              <Text style={styles.stepButtonText}>
                                +
                              </Text>
                            </Pressable>
                          </View>
                        ) : null}
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

  editProductsText: {
    color: colors.green,
    fontWeight: "bold",
    fontSize: 13,
  },

  secondaryLink: {
    alignSelf: "flex-start",
    marginBottom: 14,
  },

  secondaryLinkText: {
    color: colors.green,
    fontWeight: "700",
    fontSize: 13,
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

  modalQuantityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 12,
  },

  stepButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  stepButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
  },

  modalQuantityInputBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 90,
  },

  modalQuantityInput: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 15,
    minWidth: 40,
    textAlign: "center",
    padding: 0,
  },

  modalQuantityUnit: {
    color: colors.gray,
    fontWeight: "700",
    fontSize: 12,
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