// Ürün arama kutusu için Türkçe karakterlere duyarlı, sade bir normalizasyon sağlar.
// Örn: "İĞ" ve "iğ" aynı metne indirgenir ki arama büyük/küçük harfe duyarsız çalışsın.
export function normalizeSearchText(value) {
  return String(value || "")
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .toLocaleLowerCase("tr-TR")
    .trim();
}
