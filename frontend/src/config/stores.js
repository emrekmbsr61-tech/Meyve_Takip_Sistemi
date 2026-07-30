/*
  Mağaza listesi (yalnızca mağaza id ve adı bilgisi için kullanılır).
  DİKKAT: Artık planId ÜRETMEK için kullanılmaz — planId her zaman backend
  tarafından yeni bir DeliveryPlan kaydı oluşturularak üretilir.
  Buradaki id değeri, DeliveryPlan.storeId alanına String olarak gönderilir.
*/
export const stores = [
  { id: 1, name: "Merkez Şube" },
  { id: 2, name: "Kadıköy Şubesi" },
  { id: 3, name: "Beşiktaş Şubesi" },
  { id: 4, name: "Üsküdar Şubesi" },
  { id: 5, name: "Ataşehir Şubesi" },
  { id: 6, name: "Bakırköy Şubesi" },
  { id: 7, name: "Şişli Şubesi" },
  { id: 8, name: "Maltepe Şubesi" },
  { id: 9, name: "Kartal Şubesi" },
  { id: 10, name: "Beylikdüzü Şubesi" },
];

// Mağazayı, backend'den gelen storeId ile bulur (id String/Number karışık gelebilir, ikisi de karşılaştırılır).
export function getStoreById(storeId) {
  return stores.find((store) => String(store.id) === String(storeId));
}

// Bir plan/ihtiyaç kaydının storeId'sine göre mağaza adını döner.
export function getStoreName(storeId) {
  return getStoreById(storeId)?.name || "Bilinmeyen Mağaza";
}
