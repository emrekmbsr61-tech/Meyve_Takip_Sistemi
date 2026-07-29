import { useState } from "react";
import { View, Text, TextInput, Button, ActivityIndicator, Pressable } from "react-native";
import { register } from "../../services/authService";

const colors = {
  primary: "#2E7D32",
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

      await register({ fullName, username, email, password, passwordRepeat });

      // Girilen e-posta, doğrulama kodunu gireceği ekrana aktarılır.
      onRegisterSuccess(email);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 35, justifyContent: "center" }}>
      <Text style={{ fontSize: 28, fontWeight: "bold", marginBottom: 8 }}>
        Meyve Takip Sistemi
      </Text>

      <Text style={{ fontSize: 18, marginBottom: 30 }}>Kayıt Ol</Text>

      <Text>Ad Soyad</Text>
      <TextInput
        value={fullName}
        onChangeText={setFullName}
        placeholder="Adını ve soyadını gir"
        editable={!loading}
        style={inputStyle}
      />

      <Text>Kullanıcı Adı</Text>
      <TextInput
        value={username}
        onChangeText={setUsername}
        placeholder="Kullanıcı adı belirle"
        autoCapitalize="none"
        editable={!loading}
        style={inputStyle}
      />

      <Text>E-posta</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="E-posta adresini gir"
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!loading}
        style={inputStyle}
      />

      <Text>Şifre</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Şifreni belirle"
        secureTextEntry
        editable={!loading}
        style={inputStyle}
      />

      <Text>Şifre Tekrar</Text>
      <TextInput
        value={passwordRepeat}
        onChangeText={setPasswordRepeat}
        placeholder="Şifreni tekrar gir"
        secureTextEntry
        editable={!loading}
        style={inputStyle}
      />

      {passwordsMismatch ? (
        <Text style={{ color: "red", marginBottom: 14 }}>Şifreler eşleşmiyor.</Text>
      ) : null}

      {loading ? (
        <ActivityIndicator />
      ) : (
        <Button
          title="Kayıt Ol"
          color={colors.primary}
          onPress={handleRegister}
          disabled={passwordsMismatch}
        />
      )}

      <Pressable onPress={onGoToLogin} style={{ marginTop: 24 }} disabled={loading}>
        <Text style={{ color: colors.primary, textAlign: "center" }}>
          Zaten hesabın var mı? Giriş yap
        </Text>
      </Pressable>

      <Text style={{ marginTop: 16, color: "red" }}>{message}</Text>
    </View>
  );
}

const inputStyle = {
  borderWidth: 1,
  borderColor: "#999",
  padding: 10,
  marginBottom: 15,
  borderRadius: 6,
};
