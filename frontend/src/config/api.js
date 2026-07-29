import { Platform } from "react-native";

// Expo'da gerçek cihaz için EXPO_PUBLIC_API_URL tanımlanmalıdır.
// Android emülatöründe 10.0.2.2, geliştirme bilgisayarını temsil eder.
const fallbackBaseUrl =
  Platform.OS === "android"
    ? "http://10.0.2.2:8080/api"
    : "http://localhost:8080/api";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || fallbackBaseUrl;

export const API_SERVER_URL = API_BASE_URL.replace(/\/api$/, "");
