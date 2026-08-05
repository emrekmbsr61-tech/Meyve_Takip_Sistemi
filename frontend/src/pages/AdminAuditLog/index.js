import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { getAuditLogs } from "../../services/auditLogService";

const colors = {
  green: "#2E7D32",
  darkGreen: "#1B5E20",
  dark: "#17211B",
  background: "#F4F7F4",
  white: "#FFFFFF",
  border: "#DDE7DF",
  muted: "#6B7280",
  greenLight: "#EAF5EC",
};

// Backend'deki AuditActionType.java ile aynı Türkçe metinler; yalnızca
// görüntüleme amaçlıdır, backend'e hiçbir istek göndermez.
const ACTION_TYPE_LABELS = {
  USER_LOGIN: "Kullanıcı giriş yaptı",
  USER_LOGIN_FAILED: "Kullanıcı giriş yapamadı",
  NEED_LIST_CREATED: "İhtiyaç listesi oluşturuldu",
  NEED_LIST_UPDATED: "İhtiyaç listesi güncellendi",
  NEED_LIST_DELETED: "İhtiyaç listesi silindi",
  PURCHASE_CREATED: "Alım kaydı oluşturuldu",
  PURCHASE_FAILED: "Alım kaydı başarısız oldu",
  COLLECTION_CREATED: "Toplama kaydı oluşturuldu",
  ACCEPTANCE_CREATED: "Mal kabul kaydı oluşturuldu",
  TASK_COMPLETED: "Görev tamamlandı",
  TASK_ASSIGNED: "Görev atandı",
  DELIVERY_PLAN_CREATED: "Teslimat planı oluşturuldu",
  DELIVERY_PLAN_CANCELLED: "Teslimat planı iptal edildi",
};

function getActionTypeLabel(actionType) {
  return ACTION_TYPE_LABELS[actionType] || actionType || "Bilinmeyen işlem";
}

/*
  İşlem türü önekine göre kaydın hangi kategoriye ait olduğunu belirler.
  Sıra önemlidir: bir kayıt yalnızca ilk eşleşen kategoriye girer, hiçbir
  kategoriye girmeyenler "Diğer İşlemler" altında toplanır.
*/
const CATEGORIES = [
  {
    key: "USER",
    title: "Kullanıcı İşlemleri",
    match: (type) => type.startsWith("USER_"),
  },
  {
    key: "NEED_PLAN",
    title: "İhtiyaç ve Plan İşlemleri",
    match: (type) => type.startsWith("NEED_LIST_") || type.startsWith("DELIVERY_PLAN_"),
  },
  {
    key: "PURCHASE_FLOW",
    title: "Alım, Toplama ve Mal Kabul",
    match: (type) =>
      type.startsWith("PURCHASE_") || type.startsWith("COLLECTION_") || type.startsWith("ACCEPTANCE_"),
  },
  {
    key: "TASK",
    title: "Görev İşlemleri",
    match: (type) => type.startsWith("TASK_"),
  },
  {
    key: "OTHER",
    title: "Diğer İşlemler",
    match: () => true,
  },
];

function getCategoryKey(actionType) {
  const type = actionType || "";
  const category = CATEGORIES.find((item) => item.match(type));
  return category ? category.key : "OTHER";
}

// "2026-08-05T16:09:03" -> "05.08.2026 16:09"
function formatDate(value) {
  if (!value) return "Tarih yok";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const pad = (n) => String(n).padStart(2, "0");

  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchText, setSearchText] = useState("");
  const [entityIdText, setEntityIdText] = useState("");

  // Aynı anda yalnızca bir kategori açık kalır; null ise hiçbiri açık değildir.
  const [expandedCategory, setExpandedCategory] = useState(null);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const data = await getAuditLogs();

      // En yeni işlem en üstte görünsün.
      const sorted = [...data].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      setLogs(sorted);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [loadLogs])
  );

  const filteredLogs = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    const entityIdSearch = entityIdText.trim();

    return logs.filter((log) => {
      if (entityIdSearch && String(log.entityId ?? "") !== entityIdSearch) {
        return false;
      }

      if (search) {
        const haystack = `${log.userFullName || ""} ${log.description || ""}`.toLowerCase();
        if (!haystack.includes(search)) {
          return false;
        }
      }

      return true;
    });
  }, [logs, searchText, entityIdText]);

  /*
    filteredLogs zaten en yeniden en eskiye sıralı olduğu için (bkz. loadLogs),
    kategorilere ayırırken bu sıra korunur; her kategori kendi içinde de
    otomatik olarak en yeniden en eskiye sıralı kalır.
  */
  const categorizedLogs = useMemo(() => {
    return CATEGORIES.map((category) => ({
      key: category.key,
      title: category.title,
      logs: filteredLogs.filter((log) => getCategoryKey(log.actionType) === category.key),
    }));
  }, [filteredLogs]);

  function toggleCategory(key) {
    setExpandedCategory((current) => (current === key ? null : key));
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>İşlem Kayıtları</Text>

      <Text style={styles.subheading}>
        Sistemde yapılan tüm işlemlerin kaydını buradan izleyebilirsiniz.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Kullanıcı veya açıklamada ara..."
        placeholderTextColor={colors.muted}
        value={searchText}
        onChangeText={setSearchText}
      />

      <TextInput
        style={styles.input}
        placeholder="Plan / kayıt id ile ara..."
        placeholderTextColor={colors.muted}
        value={entityIdText}
        onChangeText={setEntityIdText}
        keyboardType="numeric"
      />

      {loading ? <ActivityIndicator color={colors.green} style={{ marginTop: 10 }} /> : null}

      {!loading && errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      {!loading && !errorMessage && filteredLogs.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={42} color={colors.muted} />
          <Text style={styles.emptyTitle}>Kayıt bulunamadı</Text>
        </View>
      ) : null}

      {!loading && !errorMessage && filteredLogs.length > 0
        ? categorizedLogs.map((category) => {
            const isExpanded = expandedCategory === category.key;

            return (
              <View key={category.key} style={styles.categoryCard}>
                <Pressable
                  style={styles.categoryHeader}
                  onPress={() => toggleCategory(category.key)}
                >
                  <Text style={styles.categoryTitle}>{category.title}</Text>

                  <View style={styles.categoryHeaderRight}>
                    <Text style={styles.categoryCount}>{category.logs.length} kayıt</Text>

                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={colors.darkGreen}
                    />
                  </View>
                </Pressable>

                {isExpanded ? (
                  <View style={styles.categoryBody}>
                    {category.logs.length === 0 ? (
                      <Text style={styles.categoryEmptyText}>Bu kategoride kayıt yok.</Text>
                    ) : (
                      category.logs.map((log) => (
                        <View key={log.id} style={styles.card}>
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>{getActionTypeLabel(log.actionType)}</Text>
                          </View>

                          <Text style={styles.userName}>{log.userFullName || "Sistem"}</Text>

                          {log.description ? (
                            <Text style={styles.description}>{log.description}</Text>
                          ) : null}

                          <View style={styles.metaRow}>
                            {log.entityId != null ? (
                              <Text style={styles.metaText}>
                                {log.entityType ? `${log.entityType} #${log.entityId}` : `#${log.entityId}`}
                              </Text>
                            ) : null}

                            <Text style={styles.metaText}>{formatDate(log.createdAt)}</Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                ) : null}
              </View>
            );
          })
        : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  heading: { color: colors.dark, fontSize: 24, fontWeight: "800" },
  subheading: { color: colors.muted, marginTop: 4, marginBottom: 16, lineHeight: 20 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    color: colors.dark,
  },
  errorText: { color: "#C62828", fontWeight: "600", marginTop: 10 },
  categoryCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    marginTop: 10,
    overflow: "hidden",
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  categoryTitle: { color: colors.dark, fontWeight: "800", fontSize: 15, flexShrink: 1 },
  categoryHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  categoryCount: { color: colors.muted, fontWeight: "600", fontSize: 12 },
  categoryBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  categoryEmptyText: {
    color: colors.muted,
    fontSize: 13,
    paddingVertical: 14,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.greenLight,
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 5,
    marginBottom: 8,
  },
  badgeText: { color: colors.green, fontWeight: "800", fontSize: 12 },
  userName: { color: colors.dark, fontSize: 16, fontWeight: "800" },
  description: { color: colors.dark, marginTop: 6, lineHeight: 20 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  metaText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  empty: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 10,
  },
  emptyTitle: { color: colors.dark, fontWeight: "700", marginTop: 10 },
});