import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";

import { getFruits } from "./api";
import { API_SERVER_URL } from "../../config/api";

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

const FRUITS_PER_PAGE = 6;

// Android emulator bilgisayardaki backend'e bu adresle ulaşır.
const IMAGE_BASE_URL = API_SERVER_URL.replace(/\/api\/?$/, "");

function getImageUrl(imagePath) {
  if (!imagePath) {
    return null;
  }

  if (imagePath.startsWith("http")) {
    return imagePath;
  }

  return `${IMAGE_BASE_URL}${imagePath}`;
}

export default function Fruits() {
  const [fruits, setFruits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadFruits();
  }, []);

  const loadFruits = async () => {
    try {
      setLoading(true);
      setMessage("");

      const data = await getFruits();
      setFruits(data);
      setCurrentPage(1);
    } catch (error) {
      setMessage("Meyve listesi alınamadı.");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(fruits.length / FRUITS_PER_PAGE));

  const pagedFruits = fruits.slice(
    (currentPage - 1) * FRUITS_PER_PAGE,
    currentPage * FRUITS_PER_PAGE
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topCard}>
        <Text style={styles.pageTitle}>Meyve Listesi</Text>
        <Text style={styles.pageDesc}>
          Sistemde kayıtlı ürünleri ve görsellerini görüntüle.
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryNumber}>{fruits.length}</Text>
        <Text style={styles.summaryText}>Kayıtlı ürün</Text>
      </View>

      {message ? <Text style={styles.errorText}>{message}</Text> : null}

      {loading ? (
        <ActivityIndicator />
      ) : fruits.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Henüz ürün kaydı yok.</Text>
        </View>
      ) : (
        <>
          {pagedFruits.map((fruit) => {
            const imageUrl = getImageUrl(fruit.imagePath);

            return (
              <View key={fruit.id} style={styles.card}>
                <View style={styles.imageBox}>
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.noImageText}>Görsel yok</Text>
                  )}
                </View>

                <View style={styles.cardInfo}>
                  <Text style={styles.fruitName}>{fruit.name}</Text>
                  <Text style={styles.detailText}>Kod: {fruit.code}</Text>
                  <Text style={styles.detailText}>Birim: {fruit.unit}</Text>
                </View>

                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {fruit.isActive === false ? "PASİF" : "AKTİF"}
                  </Text>
                </View>
              </View>
            );
          })}

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
    borderRadius: 20,
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
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: colors.orange,
    padding: 18,
    borderRadius: 18,
    marginBottom: 16,
  },
  summaryNumber: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "bold",
  },
  summaryText: {
    color: colors.white,
    marginTop: 4,
    fontWeight: "600",
  },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  imageBox: {
    width: 76,
    height: 76,
    borderRadius: 18,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  noImageText: {
    color: colors.gray,
    fontSize: 10,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  cardInfo: {
    flex: 1,
  },
  fruitName: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
  },
  detailText: {
    color: colors.gray,
    marginTop: 3,
  },
  statusBadge: {
    backgroundColor: "#ECFDF5",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  statusText: {
    color: colors.green,
    fontWeight: "bold",
    fontSize: 11,
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
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
    color: colors.text,
    fontWeight: "bold",
  },
  emptyCard: {
    backgroundColor: colors.white,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    color: colors.gray,
  },
  errorText: {
    color: colors.red,
    fontWeight: "bold",
    marginBottom: 10,
  },
};
