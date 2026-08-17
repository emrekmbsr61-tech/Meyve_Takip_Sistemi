/*
  Görev son teslim zamanı (dueDate) ile ilgili ortak hesaplamalar.
  Hem şoförün hem müdürün görev listesi aynı kuralları kullansın diye
  tek dosyada toplandı.
*/

// Süre azaldıkça artan aciliyet seviyeleri.
export const URGENCY = {
  EXPIRED: "EXPIRED", // Süre doldu
  CRITICAL: "CRITICAL", // 15 dakikadan az
  WARNING: "WARNING", // 1 saatten az
  NORMAL: "NORMAL", // Bol zaman var
};

// Aciliyet seviyesine karşılık gelen renkler.
export const URGENCY_COLORS = {
  EXPIRED: "#C62828",
  CRITICAL: "#C62828",
  WARNING: "#C96800",
  NORMAL: "#708075",
};

// dueDate'e ne kadar kaldığını milisaniye olarak verir (geçtiyse negatif).
export function getRemainingMs(dueDate) {
  if (!dueDate) return null;

  const time = new Date(dueDate).getTime();
  return Number.isNaN(time) ? null : time - Date.now();
}

// Kalan süreye göre aciliyet seviyesini belirler.
export function getUrgency(remainingMs) {
  if (remainingMs === null) return URGENCY.NORMAL;
  if (remainingMs <= 0) return URGENCY.EXPIRED;
  if (remainingMs < 15 * 60 * 1000) return URGENCY.CRITICAL;
  if (remainingMs < 60 * 60 * 1000) return URGENCY.WARNING;
  return URGENCY.NORMAL;
}

/*
  Kalan süreyi okunabilir metne çevirir.
  Bir saatten az kaldıysa saniye de gösterilir ("12:34 kaldı"), böylece
  sayaç gerçekten işliyormuş gibi görünür ve aciliyet hissedilir.
*/
export function formatRemaining(remainingMs) {
  if (remainingMs === null) return "Süre belirtilmedi";
  if (remainingMs <= 0) return "Süresi geçti";

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours} sa ${minutes} dk kaldı`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} kaldı`;
}
