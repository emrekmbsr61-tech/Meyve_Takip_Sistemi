import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { assignUserRole, getPendingUsers } from "../../services/userService";

const colors = {
  green: "#2E7D32",
  dark: "#17211B",
  background: "#F4F7F4",
  white: "#FFFFFF",
  border: "#DDE7DF",
  muted: "#6B7280",
};

// ADMIN'in bir kullanıcıya atayabileceği gerçek (PENDING olmayan) roller.
const ASSIGNABLE_ROLES = [
  { value: "MAGAZA_PERSONELI", label: "Mağaza Personeli" },
  { value: "MAGAZA_MUDURU", label: "Mağaza Müdürü" },
  { value: "SOFOR", label: "Şoför" },
  { value: "ADMIN", label: "Yönetici" },
];

export default function AdminUserApproval({ currentUser }) {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [assigningUserId, setAssigningUserId] = useState(null);

  const loadPendingUsers = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");

      const data = await getPendingUsers(currentUser.id);

      setPendingUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  // Ekrana her girildiğinde onay bekleyen kullanıcılar yeniden alınır.
  useFocusEffect(
    useCallback(() => {
      loadPendingUsers();
    }, [loadPendingUsers])
  );

  const handleAssignRole = async (user, role) => {
    try {
      setAssigningUserId(user.id);
      setMessage("");

      await assignUserRole(currentUser.id, user.id, role.value);

      setMessage(`${user.fullName} kullanıcısına "${role.label}" rolü atandı.`);

      // Rol verilen kullanıcı artık onay bekleyenler listesinde görünmemeli.
      setPendingUsers((current) =>
        current.filter((item) => item.id !== user.id)
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setAssigningUserId(null);
    }
  };

  const confirmAssignRole = (user, role) => {
    Alert.alert(
      "Rol atansın mı?",
      `${user.fullName} kullanıcısına "${role.label}" rolü atanacak.`,
      [
        { text: "Vazgeç", style: "cancel" },
        { text: "Ata", onPress: () => handleAssignRole(user, role) },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Kullanıcı Onayları</Text>

      <Text style={styles.subheading}>
        Yeni kayıt olan kullanıcılar, giriş yapabilmek için buradan rol
        almalıdır.
      </Text>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {loading ? <ActivityIndicator color={colors.green} /> : null}

      {!loading && pendingUsers.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons
            name="checkmark-done-outline"
            size={42}
            color={colors.muted}
          />
          <Text style={styles.emptyTitle}>Onay bekleyen kullanıcı yok</Text>
        </View>
      ) : null}

      {pendingUsers.map((user) => (
        <View key={user.id} style={styles.card}>
          <Text style={styles.userName}>{user.fullName}</Text>
          <Text style={styles.userDetail}>Kullanıcı adı: {user.username}</Text>
          <Text style={styles.userDetail}>E-posta: {user.email}</Text>

          <Text style={styles.roleLabel}>Rol Ata</Text>

          <View style={styles.roleRow}>
            {ASSIGNABLE_ROLES.map((role) => (
              <Pressable
                key={role.value}
                style={styles.roleChip}
                disabled={assigningUserId === user.id}
                onPress={() => confirmAssignRole(user, role)}
              >
                <Text style={styles.roleChipText}>{role.label}</Text>
              </Pressable>
            ))}
          </View>

          {assigningUserId === user.id ? (
            <ActivityIndicator color={colors.green} style={{ marginTop: 10 }} />
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  heading: { color: colors.dark, fontSize: 24, fontWeight: "800" },
  subheading: { color: colors.muted, marginTop: 4, marginBottom: 16, lineHeight: 20 },
  message: { color: colors.green, fontWeight: "600", marginBottom: 12 },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  userName: { color: colors.dark, fontSize: 18, fontWeight: "800" },
  userDetail: { color: colors.muted, marginTop: 3 },
  roleLabel: { color: colors.dark, fontWeight: "700", marginTop: 12, marginBottom: 8 },
  roleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  roleChip: {
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  roleChipText: { color: colors.green, fontWeight: "700", fontSize: 13 },
  empty: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { color: colors.dark, fontWeight: "700", marginTop: 10 },
});
