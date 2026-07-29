// Meyve/ihtiyaç birimlerini backend değerinden okunabilir Türkçe metne çevirir.
// Backend'e gönderilen enum değerleri (KG, ADET, KASA, PAKET, DEMET) burada
// hiç değiştirilmez; yalnızca kullanıcıya gösterilen metin Türkçeleştirilir.

// Birim değerini büyük harfe çevirerek karşılaştırmayı kolaylaştırır.
export function normalizeUnit(unit) {
  return String(unit || "").trim().toUpperCase();
}

// KG yerine Kilo, ADET yerine Adet gösterir. Bilinmeyen/boş birimde uygulama çökmez.
export function getUnitLabel(unit) {
  switch (normalizeUnit(unit)) {
    case "KG":
      return "Kilo";

    case "ADET":
      return "Adet";

    case "KASA":
      return "Kasa";

    case "PAKET":
      return "Paket";

    case "DEMET":
      return "Demet";

    default:
      return unit ? String(unit) : "Birim yok";
  }
}

// Bu birimler küsuratlı sayı kabul etmemelidir.
export function requiresWholeNumber(unit) {
  return ["ADET", "KASA", "PAKET", "DEMET"].includes(normalizeUnit(unit));
}

// Kullanıcının miktar alanına geçersiz karakter yazmasını engeller.
export function cleanQuantity(value, unit) {
  const normalizedValue = String(value || "").replace(",", ".");

  /*
    ADET, KASA, PAKET ve DEMET için yalnızca tam sayı kabul edilir.
  */
  if (requiresWholeNumber(unit)) {
    return normalizedValue.replace(/[^0-9]/g, "");
  }

  // Kilo için rakam ve bir tane nokta kabul edilir.
  const onlyNumber = normalizedValue.replace(/[^0-9.]/g, "");
  const parts = onlyNumber.split(".");

  if (parts.length <= 2) {
    return onlyNumber;
  }

  return `${parts[0]}.${parts.slice(1).join("")}`;
}
