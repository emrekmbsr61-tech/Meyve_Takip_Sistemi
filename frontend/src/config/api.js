import { Platform } from "react-native";

// Expo'da gerçek cihaz için EXPO_PUBLIC_API_URL tanımlanmalıdır.
// Fiziksel Android telefon aynı Wi-Fi ağındaki bilgisayarın yerel IP adresini kullanır.
const fallbackBaseUrl =
  Platform.OS === "android"
      ? "http://192.168.1.10:8080/api"
      : "http://localhost:8080/api";


export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || fallbackBaseUrl;

export const API_SERVER_URL = API_BASE_URL.replace(/\/api$/, "");
