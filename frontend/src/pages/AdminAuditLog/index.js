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
  greenLight: "#EAF5EC",
  dark: "#17211B",
  background: "#F4F7F4",
  white: "#FFFFFF",
  border: "#DDE7DF",
  muted: "#6B7280",
  red: "#DC2626",
  redLight: "#FDECEC",
  orange: "#D97706",
  orangeLight: "#FFF1DC",
  blue: "#2563EB",
  blueLight: "#E8F0FE",
  purple: "#7C3AED",
  purpleLight: "#F0EAFE",
};

// Backend'deki AuditActionType.java ile aynı Türkçe metinler; yalnızca
// görüntüleme amaçlıdır, backend'e hiçbir istek göndermez.
const ACTION_TYPE_LABELS = {
  USER_LOGIN: "Giriş yaptı",
  USER_LOGIN_FAILED: "Giriş yapamadı",
  USER_LOGOUT: "Çıkış yaptı",
  NEED_LIST_CREATED: "İhtiyaç oluşturdu",
  NEED_LIST_UPDATED: "İhtiyaç güncelledi",
  NEED_LIST_DELETED: "İhtiyaç sildi",
  PURCHASE_CREATED: "Alım kaydetti",
  PURCHASE_FAILED: "Alım başarısız",
  COLLECTION_CREATED: "Toplama kaydetti",
  ACCEPTANCE_CREATED: "Mal kabul yaptı",
  TASK_COMPLETED: "Görev tamamladı",
  TASK_ASSIGNED: "Görev atandı",
  DELIVERY_PLAN_CREATED: "Plan oluşturdu",
  DELIVERY_PLAN_CANCELLED: "Plan iptal etti",
  CONSISTENCY_CHECK: "Tutarlılık kontrolü",
  SYSTEM_CHECK: "Sistem denetimi",
};

function getActionTypeLabel(actionType) {
  return ACTION_TYPE_LABELS[actionType] || actionType || "Bilinmeyen işlem";
}

const STATUS_STYLE = {
  CRITICAL: { color: colors.red, label: "Kritik" },
  ERROR: { color: colors.red, label: "Hata" },
  WARNING: { color: colors.orange, label: "Uyarı" },
  SUCCESS: { color: colors.green, label: "Normal" },
};

function getStatusStyle(status) {
  return STATUS_STYLE[status] || { color: colors.border, label: null };
}

/*
  ============================ EKRANIN YAPISI ============================
  İKİ SEVİYE + PLAN GRUPLAMASI:

    1) Kayıt türü seçimi : "Neye bakmak istiyorsun?" - kısa bir menü.
    2) Kayıtlar          : seçilen türün kayıtları, AYNI PLANA AİT OLANLAR
                           TEK BİR KART ALTINDA toplanmış hâlde.

  Neden plan gruplaması: Bir plan boyunca aynı planId ile onlarca kayıt
  oluşuyor (her ürün için ihtiyaç, görev atamaları, alım, toplama, her ürün
  için tutarlılık kontrolü...). Bunlar düz bir listede alt alta dağıldığında
  hangi kaydın hangi işe ait olduğu kaybolur. Artık bir planın bütün hikâyesi
  tek kartın içinde durur.
  ========================================================================
*/
const GROUPS = [
  {
    key: "PROBLEM",
    title: "Kritik ve Hatalar",
    description: "Kayıp şüphesi ve başarısız işlemler",
    icon: "alert-circle-outline",
    color: colors.red,
    background: colors.redLight,
    match: (log) => log.status === "CRITICAL" || log.status === "ERROR",
  },
  {
    key: "WARNING",
    title: "Uyarılar",
    description: "Miktar farkları ve süresi geçen görevler",
    icon: "warning-outline",
    color: colors.orange,
    background: colors.orangeLight,
    match: (log) => log.status === "WARNING",
  },
  {
    key: "FLOW",
    title: "Alım, Toplama ve Mal Kabul",
    description: "Sahada yapılan işlemler",
    icon: "swap-horizontal-outline",
    color: colors.green,
    background: colors.greenLight,
    match: (log) =>
      startsWithAny(log.actionType, ["PURCHASE_", "COLLECTION_", "ACCEPTANCE_"]),
  },
  {
    key: "NEED_PLAN",
    title: "İhtiyaç ve Planlar",
    description: "Oluşturulan, güncellenen ve iptal edilen planlar",
    icon: "clipboard-outline",
    color: colors.blue,
    background: colors.blueLight,
    match: (log) => startsWithAny(log.actionType, ["NEED_LIST_", "DELIVERY_PLAN_"]),
  },
  {
    key: "TASK",
    title: "Görevler",
    description: "Atanan ve tamamlanan görevler",
    icon: "time-outline",
    color: colors.purple,
    background: colors.purpleLight,
    match: (log) => startsWithAny(log.actionType, ["TASK_"]),
  },
  {
    key: "USER",
    title: "Kullanıcı İşlemleri",
    description: "Giriş denemeleri ve hesap hareketleri",
    icon: "person-outline",
    color: colors.dark,
    background: colors.background,
    match: (log) => startsWithAny(log.actionType, ["USER_"]),
  },
  {
    key: "SYSTEM",
    title: "Sistem Denetimleri",
    description: "Otomatik tutarlılık ve süre kontrolleri",
    icon: "shield-checkmark-outline",
    color: colors.muted,
    background: colors.background,
    match: (log) =>
      log.actionType === "CONSISTENCY_CHECK" || log.actionType === "SYSTEM_CHECK",
  },
  {
    key: "ALL",
    title: "Tüm Kayıtlar",
    description: "Sistemdeki bütün işlemler",
    icon: "list-outline",
    color: colors.green,
    background: colors.greenLight,
    match: () => true,
  },
];

function startsWithAny(actionType, prefixes) {
  const type = actionType || "";
  return prefixes.some((prefix) => type.startsWith(prefix));
}

const DATE_FILTERS = [
  { key: "ALL", label: "Tüm zamanlar" },
  { key: "TODAY", label: "Bugün" },
  { key: "WEEK", label: "Son 7 gün" },
];

function getDateLimit(dateFilter) {
  if (dateFilter === "TODAY") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (dateFilter === "WEEK") {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  return null;
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

// Yalnızca saat (plan kartının içindeki satırlarda tarih zaten üstte yazıyor).
function formatTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/*
  Bir plandaki BİREBİR AYNI kayıtları tek satırda toplar.

  Neden: beş ürünlü bir plan oluşturulduğunda "İhtiyaç oluşturdu" beş kez
  yazılıyor ve beşi de aynı kişiye ait. Bunları alt alta beş satır olarak
  göstermek bilgi vermiyor, yalnızca listeyi uzatıyor. Artık tek satır
  görünür, yanında "×5" yazar.

  Sadece işlem türü VE açıklaması aynı olanlar birleştirilir; açıklamalar
  farklıysa (ör. her ürün için ayrı tutarlılık bulgusu) ayrı ayrı kalır.
*/
function collapseIdentical(items) {
  const result = [];
  const seen = new Map();

  for (const log of items) {
    const key = `${log.actionType}|${log.description || ""}`;
    const existing = seen.get(key);

    if (existing) {
      existing.count += 1;
      continue;
    }

    const entry = { log, count: 1 };
    seen.set(key, entry);
    result.push(entry);
  }

  return result;
}

// Tek seferde gösterilecek plan kartı sayısı.
const PAGE_SIZE = 10;

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // null iken tür seçim ekranı, dolu iken o türün kayıtları gösterilir.
  const [activeGroupKey, setActiveGroupKey] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [dateFilter, setDateFilter] = useState("ALL");

  // Aynı anda yalnızca bir plan kartı açık kalır.
  const [expandedPlanId, setExpandedPlanId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const data = await getAuditLogs();

      // En yeni işlem en üstte görünsün.
      setLogs([...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
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

  const groupCounts = useMemo(() => {
    const counts = {};

    for (const group of GROUPS) {
      counts[group.key] = logs.filter(group.match).length;
    }

    return counts;
  }, [logs]);

  const activeGroup = GROUPS.find((group) => group.key === activeGroupKey);

  // Seçilen türün, arama ve tarihe göre süzülmüş kayıtları.
  const groupLogs = useMemo(() => {
    if (!activeGroup) {
      return [];
    }

    const search = searchText.trim().toLowerCase();
    const dateLimit = getDateLimit(dateFilter);

    return logs.filter((log) => {
      if (!activeGroup.match(log)) return false;
      if (dateLimit && new Date(log.createdAt) < dateLimit) return false;

      if (search) {
        const haystack = [
          log.userFullName,
          log.description,
          getActionTypeLabel(log.actionType),
          log.planId != null ? String(log.planId) : "",
          log.entityId != null ? String(log.entityId) : "",
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(search)) return false;
      }

      return true;
    });
  }, [logs, activeGroup, searchText, dateFilter]);

  /*
    Kayıtları plan bazında toplar. Plana bağlı OLMAYAN kayıtlar (giriş
    denemeleri, müdürün elle atadığı serbest görevler) ayrı bir listede
    tutulur; onlar için sahte bir plan kartı üretmek yanıltıcı olurdu.
  */
  const { planGroups, planlessLogs } = useMemo(() => {
    const byPlan = new Map();
    const planless = [];

    for (const log of groupLogs) {
      if (log.planId == null) {
        planless.push(log);
        continue;
      }

      if (!byPlan.has(log.planId)) {
        byPlan.set(log.planId, []);
      }

      byPlan.get(log.planId).push(log);
    }

    const groups = Array.from(byPlan.entries())
      .map(([planId, items]) => ({
        planId,
        items,
        // groupLogs en yeniden eskiye sıralı olduğu için ilk kayıt en yenisidir.
        latestDate: items[0]?.createdAt,
        problemCount: items.filter(
          (log) => log.status === "CRITICAL" || log.status === "ERROR"
        ).length,
        warningCount: items.filter((log) => log.status === "WARNING").length,
      }))
      .sort((a, b) => b.planId - a.planId);

    return { planGroups: groups, planlessLogs: planless };
  }, [groupLogs]);

  const openGroup = (key) => {
    setActiveGroupKey(key);
    setSearchText("");
    setDateFilter("ALL");
    setExpandedPlanId(null);
    setVisibleCount(PAGE_SIZE);
  };

  /* ---------------- 1. SEVİYE: kayıt türü seçimi ---------------- */
  if (!activeGroup) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Bakmak istediğiniz kayıt türünü seçin. Toplam {logs.length} işlem kaydı var.
        </Text>

        {loading ? <ActivityIndicator color={colors.green} style={{ marginTop: 12 }} /> : null}

        {!loading && errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        {!loading && !errorMessage
          ? GROUPS.map((group) => {
              const count = groupCounts[group.key] || 0;

              return (
                <Pressable
                  key={group.key}
                  style={({ pressed }) => [styles.groupCard, pressed && styles.pressed]}
                  onPress={() => openGroup(group.key)}
                >
                  <View style={[styles.groupIconBox, { backgroundColor: group.background }]}>
                    <Ionicons name={group.icon} size={22} color={group.color} />
                  </View>

                  <View style={styles.groupTextArea}>
                    <Text style={styles.groupTitle}>{group.title}</Text>
                    <Text style={styles.groupDescription}>{group.description}</Text>
                  </View>

                  <View style={styles.groupRight}>
                    <Text style={[styles.groupCount, count > 0 && { color: group.color }]}>
                      {count}
                    </Text>
                    <Ionicons name="chevron-forward" size={19} color="#B8C3BA" />
                  </View>
                </Pressable>
              );
            })
          : null}
      </ScrollView>
    );
  }

  /* ---------------- 2. SEVİYE: plan bazında kayıtlar ---------------- */
  const visiblePlanGroups = planGroups.slice(0, visibleCount);

  // Bir plan kartının içindeki kayıt satırlarını çizer.
  const renderLogRows = (items) =>
    collapseIdentical(items).map((entry, index) => {
      const { log, count } = entry;
      const statusStyle = getStatusStyle(log.status);

      return (
        <View key={`${log.id}-${index}`} style={styles.logRow}>
          <View style={[styles.statusDot, { backgroundColor: statusStyle.color }]} />

          <View style={styles.logRowText}>
            <Text style={styles.logRowTitle}>
              {getActionTypeLabel(log.actionType)}
              {count > 1 ? <Text style={styles.repeatCount}> ×{count}</Text> : null}
            </Text>

            {log.description ? (
              <Text style={styles.logRowDescription}>{log.description}</Text>
            ) : null}

            <Text style={styles.logRowMeta}>
              {log.userFullName || "Sistem"} · {formatTime(log.createdAt)}
            </Text>
          </View>
        </View>
      );
    });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable style={styles.backRow} onPress={() => setActiveGroupKey(null)}>
        <Ionicons name="arrow-back" size={19} color={colors.green} />
        <Text style={styles.backText}>Kayıt türleri</Text>
      </Pressable>

      <Text style={styles.groupHeading}>{activeGroup.title}</Text>
      <Text style={styles.groupSubheading}>
        {planGroups.length} plan · {groupLogs.length} kayıt
      </Text>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={17} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Kullanıcı, işlem veya plan no ara..."
          placeholderTextColor={colors.muted}
          value={searchText}
          onChangeText={(value) => {
            setSearchText(value);
            setVisibleCount(PAGE_SIZE);
          }}
        />
      </View>

      <View style={styles.chipRow}>
        {DATE_FILTERS.map((filter) => {
          const active = dateFilter === filter.key;

          return (
            <Pressable
              key={filter.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => {
                setDateFilter(filter.key);
                setVisibleCount(PAGE_SIZE);
              }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? <ActivityIndicator color={colors.green} style={{ marginTop: 10 }} /> : null}

      {!loading && groupLogs.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={38} color={colors.muted} />
          <Text style={styles.emptyTitle}>Kayıt bulunamadı</Text>
          <Text style={styles.emptyText}>Arama veya tarih filtresini değiştirmeyi deneyin.</Text>
        </View>
      ) : null}

      {/* Plan kartları: bir planın bütün hikâyesi tek kartın içinde */}
      {!loading &&
        visiblePlanGroups.map((plan) => {
          const isOpen = expandedPlanId === plan.planId;

          return (
            <View key={plan.planId} style={styles.planCard}>
              <Pressable
                style={styles.planHeader}
                onPress={() => setExpandedPlanId(isOpen ? null : plan.planId)}
              >
                <View
                  style={[
                    styles.planIconBox,
                    {
                      backgroundColor:
                        plan.problemCount > 0
                          ? colors.redLight
                          : plan.warningCount > 0
                          ? colors.orangeLight
                          : colors.greenLight,
                    },
                  ]}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={19}
                    color={
                      plan.problemCount > 0
                        ? colors.red
                        : plan.warningCount > 0
                        ? colors.orange
                        : colors.green
                    }
                  />
                </View>

                <View style={styles.planTextArea}>
                  <Text style={styles.planTitle}>Plan #{plan.planId}</Text>
                  <Text style={styles.planMeta}>
                    {plan.items.length} işlem · {formatDate(plan.latestDate)}
                  </Text>
                </View>

                {plan.problemCount > 0 ? (
                  <View style={[styles.countBadge, { backgroundColor: colors.red }]}>
                    <Text style={styles.countBadgeText}>{plan.problemCount}</Text>
                  </View>
                ) : plan.warningCount > 0 ? (
                  <View style={[styles.countBadge, { backgroundColor: colors.orange }]}>
                    <Text style={styles.countBadgeText}>{plan.warningCount}</Text>
                  </View>
                ) : null}

                <Ionicons
                  name={isOpen ? "chevron-up" : "chevron-down"}
                  size={19}
                  color={colors.muted}
                />
              </Pressable>

              {isOpen ? <View style={styles.planBody}>{renderLogRows(plan.items)}</View> : null}
            </View>
          );
        })}

      {/* Plana bağlı olmayan kayıtlar (giriş denemeleri, serbest görevler) */}
      {!loading && planlessLogs.length > 0 ? (
        <View style={styles.planCard}>
          <Pressable
            style={styles.planHeader}
            onPress={() => setExpandedPlanId(isPlanlessOpen(expandedPlanId) ? null : "PLANSIZ")}
          >
            <View style={[styles.planIconBox, { backgroundColor: colors.background }]}>
              <Ionicons name="ellipsis-horizontal" size={19} color={colors.muted} />
            </View>

            <View style={styles.planTextArea}>
              <Text style={styles.planTitle}>Plana bağlı olmayan işlemler</Text>
              <Text style={styles.planMeta}>{planlessLogs.length} işlem</Text>
            </View>

            <Ionicons
              name={isPlanlessOpen(expandedPlanId) ? "chevron-up" : "chevron-down"}
              size={19}
              color={colors.muted}
            />
          </Pressable>

          {isPlanlessOpen(expandedPlanId) ? (
            <View style={styles.planBody}>{renderLogRows(planlessLogs)}</View>
          ) : null}
        </View>
      ) : null}

      {!loading && planGroups.length > visibleCount ? (
        <Pressable
          style={styles.moreButton}
          onPress={() => setVisibleCount((count) => count + PAGE_SIZE)}
        >
          <Text style={styles.moreText}>
            Daha fazla plan göster ({planGroups.length - visibleCount} plan)
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

// Plansız kayıtlar kartı, plan id'si yerine sabit bir anahtarla açılıp kapanır.
function isPlanlessOpen(expandedPlanId) {
  return expandedPlanId === "PLANSIZ";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  intro: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 14 },
  errorText: { color: colors.red, fontWeight: "600", marginTop: 10 },
  pressed: { opacity: 0.7 },

  // 1. seviye
  groupCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    padding: 13,
    marginBottom: 9,
  },
  groupIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  groupTextArea: { flex: 1, paddingRight: 8 },
  groupTitle: { color: colors.dark, fontSize: 15, fontWeight: "800" },
  groupDescription: { color: colors.muted, fontSize: 12, marginTop: 3, lineHeight: 16 },
  groupRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  groupCount: { color: colors.muted, fontSize: 15, fontWeight: "800" },

  // 2. seviye başlığı
  backRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  backText: { color: colors.green, fontWeight: "700", fontSize: 14 },
  groupHeading: { color: colors.dark, fontSize: 19, fontWeight: "800" },
  groupSubheading: { color: colors.muted, fontSize: 12, marginTop: 3, marginBottom: 12 },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    paddingHorizontal: 13,
    marginBottom: 10,
  },
  searchInput: { flex: 1, color: colors.dark, paddingVertical: 11, fontSize: 14 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 12 },
  chip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: colors.white },

  // Plan kartı
  planCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    marginBottom: 9,
    overflow: "hidden",
  },
  planHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 13 },
  planIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  planTextArea: { flex: 1 },
  planTitle: { color: colors.dark, fontSize: 15, fontWeight: "800" },
  planMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  countBadge: {
    minWidth: 24,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    alignItems: "center",
  },
  countBadgeText: { color: colors.white, fontSize: 11, fontWeight: "800" },

  planBody: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 13,
    paddingVertical: 4,
  },

  // Plan kartının içindeki tek kayıt satırı
  logRow: {
    flexDirection: "row",
    gap: 9,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F3F0",
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginTop: 6 },
  logRowText: { flex: 1 },
  logRowTitle: { color: colors.dark, fontSize: 13, fontWeight: "800" },
  repeatCount: { color: colors.muted, fontWeight: "700" },
  logRowDescription: { color: colors.dark, fontSize: 12, lineHeight: 17, marginTop: 3 },
  logRowMeta: { color: colors.muted, fontSize: 11, marginTop: 4 },

  moreButton: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    paddingVertical: 13,
    marginTop: 4,
  },
  moreText: { color: colors.green, fontWeight: "800", fontSize: 13 },

  empty: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 26,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 6,
  },
  emptyTitle: { color: colors.dark, fontWeight: "800", marginTop: 9, fontSize: 15 },
  emptyText: { color: colors.muted, fontSize: 12, marginTop: 4, textAlign: "center" },
});
