import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

/*
  Giriş/Kayıt ekranlarındaki tek bir form alanı (etiket + kutu).

  Neden ayrı dosya: iki ekranda toplam yedi alan var, hepsi aynı görünüyor.
  Ayrıca "odaklanınca kenarlık yeşile döner" davranışı her alanda kendi
  durumunu tutmak zorunda; bunu tek bir küçük bileşende tutmak iki ekranı da
  sade bırakır.

  Kullanılmayan hiçbir prop eklenmedi; TextInput'a verilen ekstra özellikler
  (secureTextEntry, keyboardType vb.) ...rest ile olduğu gibi aktarılır.
*/

const colors = {
  primary: "#2E7D32",
  white: "#FFFFFF",
  background: "#F4F7F4",
  border: "#DDE7DF",
  text: "#17211B",
  gray: "#6B7280",
};

export default function AuthField({ label, icon, ...rest }) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.box, focused && styles.boxFocused]}>
        {icon ? (
          <Ionicons
            name={icon}
            size={19}
            color={focused ? colors.primary : colors.gray}
            style={styles.icon}
          />
        ) : null}

        <TextInput
          {...rest}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor="#9CA3AF"
          style={styles.input}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },

  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7,
  },

  box: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 13,
  },

  // Odaklanınca kenarlık yeşile döner ve zemin beyazlar: hangi alanda
  // olduğun net görünür (önceki tasarımda hiçbir odak göstergesi yoktu).
  boxFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },

  icon: {
    marginRight: 9,
  },

  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 13,
  },
});
