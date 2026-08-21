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

import { getAssignableUsers } from "../../services/taskService";

const colors = {
  green: "#2E7D32",
  greenLight: "#EAF5EC",
  dark: "#132118",
  white: "#FFFFFF",
  border: "#DFE7E0",
  muted: "#708075",
  background: "#F6F8F6",
  red: "#C62828",
  redLight: "#FDECEC",
};

// Müdürün seçebileceği hazır süreler. Serbest metin yerine hazır seçenek
// kullanılır: yanlış/absürt süre girilmesi (0, 9999 saat) baştan engellenir.
const DURATION_OPTIONS = [1, 2, 4, 8, 24];

/*
  Müdürün bir personele elle görev atadığı penceredir.

  Üç bilgi ZORUNLUDUR ve üçü de boş bırakılamaz:
    1) kim  -> listeden seçilir (serbest metin değil; olmayan kişi yazılamaz)
    2) ne   -> görev açıklaması
    3) süre -> hazır seçeneklerden biri

  Kaydet butonu, üçü de dolmadan aktif olmaz. Aynı kurallar backend'de de
  ayrıca kontrol edilir (bkz. CreateTaskRequest) - buradaki kontrol yalnızca
  kullanıcı deneyimi içindir.
*/
export default function AssignTaskModal({ visible, managerId, saving, errorMessage, onSave, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [title, setTitle] = useState("");
  const [durationHours, setDurationHours] = useState(4);

  // Pencere her açıldığında personel listesi tazelenir ve form sıfırlanır.
  useEffect(() => {
    if (!visible) return;

    setSelectedUserId(null);
    setTitle("");
    setDurationHours(4);

    (async () => {
      try {
        setLoading(true);
        setLoadError("");

        const data = await getAssignableUsers(managerId);
        setUsers(Array.isArray(data) ? data : []);
      } catch (error) {
        setLoadError(error.message || "Personel listesi alınamadı.");
      } finally {
        setLoading(false);
      }
    })();
  }, [visible, managerId]);

  const canSave = Boolean(selectedUserId) && title.trim().length > 0 && !saving;

  const handleSave = () => {
    if (!canSave) return;

    onSave({
      assignedUserId: selectedUserId,
      title: title.trim(),
      durationHours,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Görev Ata</Text>

            <Pressable onPress={onClose} style={styles.closeIconButton} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.dark} />
            </Pressable>
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.red} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* 1) Kime */}
            <Text style={styles.label}>Kime</Text>

            {loading ? <ActivityIndicator color={colors.green} style={{ marginVertical: 12 }} /> : null}

            {!loading && loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

            {!loading && !loadError && users.length === 0 ? (
              <Text style={styles.infoText}>Görev atanabilecek personel bulunamadı.</Text>
            ) : null}

            {!loading &&
              !loadError &&
              users.map((user) => {
                const selected = selectedUserId === user.id;

                return (
                  <Pressable
                    key={user.id}
                    style={[styles.userRow, selected && styles.userRowSelected]}
                    onPress={() => setSelectedUserId(user.id)}
                  >
                    <Ionicons
                      name={selected ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={selected ? colors.green : colors.muted}
                    />

                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName}>{user.fullName}</Text>
                      <Text style={styles.userRole}>{user.roleLabel}</Text>
                    </View>
                  </Pressable>
                );
              })}

            {/* 2) Ne yapılacak */}
            <Text style={[styles.label, { marginTop: 16 }]}>Görev</Text>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Örn: Depo temizliği"
              placeholderTextColor="#9CA3AF"
              maxLength={200}
              style={styles.input}
            />

            {/* 3) Süre */}
            <Text style={[styles.label, { marginTop: 16 }]}>Süre</Text>

            <View style={styles.durationRow}>
              {DURATION_OPTIONS.map((hours) => {
                const selected = durationHours === hours;

                return (
                  <Pressable
                    key={hours}
                    style={[styles.durationChip, selected && styles.durationChipSelected]}
                    onPress={() => setDurationHours(hours)}
                  >
                    <Text style={[styles.durationText, selected && styles.durationTextSelected]}>
                      {hours} saat
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Pressable
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
          >
            <Text style={styles.saveButtonText}>
              {saving ? "Atanıyor..." : "Görevi Ata"}
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
    height: "82%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { color: colors.dark, fontSize: 18, fontWeight: "800" },
  closeIconButton: { padding: 4 },
  body: { flex: 1, marginTop: 12 },
  label: { color: colors.dark, fontSize: 13, fontWeight: "800", marginBottom: 8 },
  infoText: { color: colors.muted, paddingVertical: 12 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.redLight,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  errorText: { flex: 1, color: colors.red, fontSize: 13, fontWeight: "600" },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  userRowSelected: { borderColor: colors.green, backgroundColor: colors.greenLight },
  userName: { color: colors.dark, fontWeight: "700", fontSize: 14 },
  userRole: { color: colors.muted, fontSize: 12, marginTop: 2 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: colors.dark,
    fontSize: 15,
  },
  durationRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  durationChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  durationChipSelected: { borderColor: colors.green, backgroundColor: colors.greenLight },
  durationText: { color: colors.muted, fontWeight: "700", fontSize: 13 },
  durationTextSelected: { color: colors.green },
  saveButton: {
    backgroundColor: colors.green,
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 15,
    marginTop: 12,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: colors.white, fontWeight: "800", fontSize: 15 },
});
