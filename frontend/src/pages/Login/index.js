import { useState } from "react";
import { View, Text, TextInput, Button, ActivityIndicator } from "react-native";
import { login } from "../../services/authService";

export default function Login({ onLoginSuccess }) {
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

      setMessage("Giriş başarılı");
      console.log("Giriş yapan kullanıcı:", user);

      onLoginSuccess(user);
    } catch (error) {
      setMessage(error.message);
      console.log("Login hatası:", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 35, justifyContent: "center" }}>
      <Text style={{ fontSize: 28, fontWeight: "bold", marginBottom: 8 }}>
        Meyve Takip Sistemi
      </Text>

      <Text style={{ fontSize: 18, marginBottom: 30 }}>
        Kullanıcı Girişi
      </Text>

      <Text>Kullanıcı Adı</Text>
      <TextInput
        value={username}
        onChangeText={setUsername}
        placeholder="Kullanıcı adını gir"
        autoCapitalize="none"
        style={{
          borderWidth: 1,
          borderColor: "#999",
          padding: 10,
          marginBottom: 15,
          borderRadius: 6,
        }}
      />

      <Text>Şifre</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Şifreni gir"
        secureTextEntry //şifreyi gizli göster
        style={{
          borderWidth: 1,
          borderColor: "#999",
          padding: 10,
          marginBottom: 20,
          borderRadius: 6,
        }}
      />

      {loading ? (
        <ActivityIndicator />
      ) : (
        <Button title="Giriş Yap" onPress={handleLogin} />
      )}

      <Text style={{ marginTop: 20, color: "red" }}>{message}</Text>
    </View>
  );
}