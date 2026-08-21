import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { register } from "../../services/authService";
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

export default function Register({ onRegisterSuccess, onGoToLogin }) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Her iki şifre alanı da doluyken birbirini tutmuyorsa kayıt butonu pasif olur.
  const passwordsMismatch =
    password.length > 0 && passwordRepeat.length > 0 && password !== passwordRepeat;

  const handleRegister = async () => {
    if (!fullName || !username || !email || !password || !passwordRepeat) {
      setMessage("Tüm alanlar zorunludur.");
      return;
    }

    if (password !== passwordRepeat) {
      setMessage("Şifreler eşleşmiyor.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const created = await register({ fullName, username, email, password, passwordRepeat });

      /*
        Doğrulama ekranına, kullanıcının yazdığı ham metin değil, backend'in
        KAYDETTİĞİ tam adres aktarılır. Kullanıcı "emre" yazdıysa backend bunu
        "emre@gmail.com" olarak tamamlar; kodun gerçekte hangi adrese gittiğini
        görmesi gerekir. (created.email gelmezse yazdığı metne düşülür.)
      */
      onRegisterSuccess(created?.email || email);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      heading="Hesap oluştur"
      description="Kaydın tamamlandıktan sonra e-postana bir doğrulama kodu gönderilir."
    >
      <AuthField
        label="Ad Soyad"
        icon="person-outline"
        value={fullName}
        onChangeText={setFullName}
        placeholder="Adını ve soyadını gir"
        editable={!loading}
      />

      <AuthField
        label="Kullanıcı Adı"
        icon="at-outline"
        value={username}
        onChangeText={setUsername}
        placeholder="Kullanıcı adı belirle"
        autoCapitalize="none"
        editable={!loading}
      />

      <AuthField
        label="E-posta"
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        placeholder="E-posta adresini gir"
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!loading}
      />

      <AuthField
        label="Şifre"
        icon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        placeholder="Şifreni belirle"
        secureTextEntry
        editable={!loading}
      />

      <AuthField
        label="Şifre Tekrar"
        icon="lock-closed-outline"
        value={passwordRepeat}
        onChangeText={setPasswordRepeat}
        placeholder="Şifreni tekrar gir"
        secureTextEntry
        editable={!loading}
      />

      {/* Anlık uyarı: iki şifre alanı da doluyken eşleşmiyorsa hemen görünür. */}
      {passwordsMismatch ? (
        <View style={styles.warningRow}>
          <Ionicons name="alert-circle-outline" size={17} color={colors.red} />
          <Text style={styles.warningText}>Şifreler eşleşmiyor.</Text>
        </View>
      ) : null}

      {/* Backend'den dönen hata mesajı. */}
      {message ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={19} color={colors.red} />
          <Text style={styles.errorText}>{message}</Text>
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          (loading || passwordsMismatch) && styles.primaryButtonDisabled,
          pressed && styles.primaryButtonPressed,
        ]}
        onPress={handleRegister}
        disabled={loading || passwordsMismatch}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.primaryButtonText}>Kayıt Ol</Text>
        )}
      </Pressable>

      <Pressable
        onPress={onGoToLogin}
        style={styles.footerLink}
        disabled={loading}
      >
        <Text style={styles.footerText}>
          Zaten hesabın var mı? <Text style={styles.footerAction}>Giriş yap</Text>
        </Text>
      </Pressable>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  warningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 10,
  },

  warningText: {
    color: colors.red,
    fontSize: 13,
    fontWeight: "600",
  },

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
