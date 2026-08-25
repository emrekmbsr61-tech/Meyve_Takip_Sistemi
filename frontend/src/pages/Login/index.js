import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { login } from "../../services/authService";
import AuthLayout from "../../components/AuthLayout";
import AuthField from "../../components/AuthField";

const colors = {
  primary: "#2E7D32",
  white: "#FFFFFF",
  text: "#17211B",
  gray: "#6B7280",
  red: "#DC2626",
  redLight: "#FDECEC",
  redBorder: "#F5B8B3",
};

export default function Login({ onLoginSuccess, onGoToRegister }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      setMessage("Kullanıcı adı ve şifre boş bırakılamaz.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const user = await login(username, password); //authService.js ten gelir login

      onLoginSuccess(user);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      heading="Giriş yap"
      description="Devam etmek için kullanıcı bilgilerini gir."
      showProcess
    >
      <AuthField
        label="Kullanıcı Adı"
        icon="person-outline"
        value={username}
        onChangeText={setUsername}
        placeholder="Kullanıcı adını gir"
        autoCapitalize="none"
        editable={!loading}
      />

      <AuthField
        label="Şifre"
        icon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        placeholder="Şifreni gir"
        secureTextEntry //şifreyi gizli göster
        editable={!loading}
      />

      {/* Hata mesajı: düz kırmızı yazı yerine fark edilir bir uyarı kutusu. */}
      {message ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={19} color={colors.red} />
          <Text style={styles.errorText}>{message}</Text>
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          loading && styles.primaryButtonDisabled,
          pressed && styles.primaryButtonPressed,
        ]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.primaryButtonText}>Giriş Yap</Text>
        )}
      </Pressable>

      {onGoToRegister ? (
        <Pressable
          onPress={onGoToRegister}
          style={styles.footerLink}
          disabled={loading}
        >
          <Text style={styles.footerText}>
            Hesabın yok mu? <Text style={styles.footerAction}>Kayıt ol</Text>
          </Text>
        </Pressable>
      ) : null}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: colors.redLight,
    borderWidth: 1,
    borderColor: colors.redBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
  },

  errorText: {
    flex: 1,
    color: colors.red,
    fontSize: 13,
    fontWeight: "600",
  },

  primaryButton: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  primaryButtonDisabled: {
    opacity: 0.6,
  },

  primaryButtonPressed: {
    opacity: 0.85,
  },

  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
  },

  footerLink: {
    marginTop: 20,
    alignItems: "center",
  },

  footerText: {
    color: colors.gray,
    fontSize: 14,
  },

  footerAction: {
    color: colors.primary,
    fontWeight: "800",
  },
});
