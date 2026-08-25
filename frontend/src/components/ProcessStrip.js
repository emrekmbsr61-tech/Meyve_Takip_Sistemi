import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

/*
  Giriş ekranının alt boşluğunda duran, uygulamanın dört aşamalı iş akışını
  özetleyen şerittir: İhtiyaç -> Alım -> Toplama -> Kabul.

  Neden var: giriş ekranında formun altında büyük bir boşluk kalıyordu.
  Buraya süsleme yerine işin kendisini anlatan bir özet konuldu; uygulamayı
  ilk kez açan biri ne işe yaradığını tek bakışta görüyor.

  Yalnızca AuthLayout tarafından, showProcess seçeneği verildiğinde çizilir
  (bkz. AuthLayout.js). Kayıt ekranında formu aşağı itmemesi için orada
  bilerek kullanılmaz.

  Veri çekmez, backend'e istek atmaz - tamamen görsel bir bileşendir.
*/

const colors = {
  green: "#2E7D32",
  tint: "#EAF3EB",
  border: "#E6EAE6",
  label: "#8A9990",
  step: "#5F6E64",
};

// Şeritteki dört aşama. Sıra, gerçek iş akışıyla aynıdır.
const STEPS = [
  { icon: "clipboard-outline", label: "İhtiyaç" },
  { icon: "cart-outline", label: "Alım" },
  { icon: "cube-outline", label: "Toplama" },
  { icon: "checkmark-circle-outline", label: "Kabul" },
];

export default function ProcessStrip() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Teslimat süreci</Text>

      <View style={styles.row}>
        {STEPS.map((step, index) => (
          // Aşamalar arasına çizgi konur, sonuncudan sonra konmaz.
          <View key={step.label} style={styles.stepWrapper}>
            <View style={styles.step}>
              <View style={styles.circle}>
                <Ionicons name={step.icon} size={17} color={colors.green} />
              </View>
              <Text style={styles.stepLabel}>{step.label}</Text>
            </View>

            {index < STEPS.length - 1 ? <View style={styles.connector} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 20,
    marginTop: 36,
  },

  title: {
    color: colors.label,
    fontSize: 11,
    letterSpacing: 0.4,
    marginBottom: 14,
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  /*
    Her aşama ve ondan sonraki çizgi tek bir sarmalayıcıda tutulur; sarmalayıcı
    esner (flex: 1) böylece dört aşama ekran genişliğine eşit dağılır.
  */
  stepWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  step: {
    flex: 1,
    alignItems: "center",
  },

  circle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  stepLabel: {
    color: colors.step,
    fontSize: 11,
  },

  // Aşamaları birbirine bağlayan ince çizgi; dairelerin hizasında durur.
  connector: {
    height: 1,
    width: 12,
    backgroundColor: colors.border,
    marginBottom: 18,
  },
});
