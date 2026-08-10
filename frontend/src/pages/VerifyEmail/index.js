import { useState } from "react";
import { View, Text, TextInput, Button, ActivityIndicator, Pressable } from "react-native";
import { verifyEmail, resendVerification } from "../../services/authService";

const colors = {
  primary: "#2E7D32",
  gray: "#6B7280",
};

export default function VerifyEmail({ email, onVerified, onGoBack }) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (!code) {
      setMessage("Doğrulama kodunu giriniz.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const result = await verifyEmail(email, code);

      setMessage(typeof result === "string" ? result : "E-posta doğrulandı.");

      // Kullanıcının başarı mesajını görebilmesi için kısa bir süre sonra
      // Login ekranına dönülür.
      setTimeout(() => {
        onVerified();
      }, 1200);
    } catch (error) {
      setMessage(error.message);
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setResending(true);
      setMessage("");

      const result = await resendVerification(email);

      setMessage(typeof result === "string" ? result : "Kod tekrar gönderildi.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 35, justifyContent: "center" }}>
      <Text style={{ fontSize: 28, fontWeight: "bold", marginBottom: 8 }}>
        Meyve Takip Sistemi
      </Text>

      <Text style={{ fontSize: 18, marginBottom: 10 }}>E-posta Doğrulama</Text>

      <Text style={{ marginBottom: 25, color: "#444" }}>
        {email} adresine gönderilen 6 haneli kodu giriniz.
      </Text>

      <Text>Doğrulama Kodu</Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="6 haneli kod"
        keyboardType="number-pad"
        maxLength={6}
        editable={!loading}
        style={{
          borderWidth: 1,
          borderColor: "#999",
          padding: 10,
          marginBottom: 20,
          borderRadius: 6,
          fontSize: 20,
          letterSpacing: 6,
          textAlign: "center",
        }}
      />

      {loading ? (
        <ActivityIndicator />
      ) : (
        <Button title="Doğrula" color={colors.primary} onPress={handleVerify} />
      )}

      <View style={{ marginTop: 18 }}>
        {resending ? (
          <ActivityIndicator />
        ) : (
          <Button
            title="Kodu Tekrar Gönder"
            color={colors.gray}
            onPress={handleResend}
            disabled={loading}
          />
        )}
      </View>

      {onGoBack ? (
        <Pressable
          onPress={onGoBack}
          style={{ marginTop: 24 }}
          disabled={loading || resending}
        >
          <Text style={{ color: colors.gray, textAlign: "center" }}>
            ← Geri dön
          </Text>
        </Pressable>
      ) : null}

      <Text style={{ marginTop: 20, color: "red" }}>{message}</Text>
    </View>
  );
}
