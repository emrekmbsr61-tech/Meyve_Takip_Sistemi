import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

/*
  Giriş ve Kayıt ekranlarının ORTAK çerçevesi.

  Neden ayrı dosya: iki ekran da aynı görünümü kullanıyor (üstte koyu yeşil
  tanıtım bandı, altta beyaz form yaprağı). Aynı kodu iki yere kopyalamak
  yerine burada tek yerde tutulur; ileride tasarım değişirse tek dosya
  güncellenir.

  Tasarım dili bilerek Home ekranındaki karşılama kartıyla aynıdır (koyu yeşil
  zemin + saydam dekoratif daireler), böylece kullanıcı uygulamaya girdiğinde
  görsel bir kopukluk yaşamaz.

  Kullanımı: <AuthLayout heading="Giriş yap" description="..."> ...form... </AuthLayout>
*/

const colors = {
  primaryDark: "#1B5E20",
  white: "#FFFFFF",
  text: "#17211B",
  gray: "#6B7280",
  bannerText: "#D8EAD9",
};

/*
  Üst boşluk (durum çubuğu / çentik) react-native-safe-area-context tarafından
  hesaplanır. Bu bileşenin çalışabilmesi için App.js'in en dışında bir
  SafeAreaProvider bulunur.

  edges={["top"]}: yalnızca üst güvenli alan uygulanır; alt kenara boşluk
  verilmez, çünkü beyaz form yaprağının ekranın altına kadar uzanması istenir.
*/
export default function AuthLayout({ heading, description, children }) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Üst tanıtım bandı */}
        <View style={styles.banner}>
          <View style={styles.decorativeCircleOne} />
          <View style={styles.decorativeCircleTwo} />

          <View style={styles.logoBox}>
            <Ionicons name="leaf" size={26} color={colors.white} />
          </View>

          <Text style={styles.appName}>Meyve Takip Sistemi</Text>
          <Text style={styles.appTagline}>Alım ve teslimat denetim platformu</Text>
        </View>

        {/* Beyaz form yaprağı */}
        <View style={styles.sheet}>
          <ScrollView
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.heading}>{heading}</Text>

            {description ? (
              <Text style={styles.description}>{description}</Text>
            ) : null}

            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },

  flex: {
    flex: 1,
  },

  banner: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 30,
    overflow: "hidden",
  },

  decorativeCircleOne: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.06)",
    right: -34,
    bottom: -60,
  },

  decorativeCircleTwo: {
    position: "absolute",
    width: 95,
    height: 95,
    borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.04)",
    right: 62,
    top: -40,
  },

  logoBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  appName: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
  },

  appTagline: {
    color: colors.bannerText,
    fontSize: 13,
    marginTop: 4,
  },

  sheet: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: -18,
  },

  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 34,
  },

  heading: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "800",
  },

  description: {
    color: colors.gray,
    fontSize: 13,
    marginTop: 5,
    marginBottom: 18,
    lineHeight: 19,
  },
});
