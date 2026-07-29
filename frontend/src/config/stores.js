export const stores = [
  { id: 1, name: "Merkez Şube", planId: 1 },
  { id: 2, name: "Kadıköy Şubesi", planId: 2 },
  { id: 3, name: "Beşiktaş Şubesi", planId: 3 },
  { id: 4, name: "Üsküdar Şubesi", planId: 4 },
  { id: 5, name: "Ataşehir Şubesi", planId: 5 },
  { id: 6, name: "Bakırköy Şubesi", planId: 6 },
  { id: 7, name: "Şişli Şubesi", planId: 7 },
  { id: 8, name: "Maltepe Şubesi", planId: 8 },
  { id: 9, name: "Kartal Şubesi", planId: 9 },
  { id: 10, name: "Beylikdüzü Şubesi", planId: 10 },
];

export function getStoreByPlanId(planId) {
  return stores.find((store) => store.planId === Number(planId));
}

export function getStoreName(planId) {
  return getStoreByPlanId(planId)?.name || "Bilinmeyen Mağaza";
}
