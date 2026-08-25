/*
  NeedList durumunu (backend'deki NeedListStatus enum'u) kullanıcıya Türkçe
  gösterir. Ham İngilizce değerler ("CREATED", "APPROVED" gibi) ekranda
  gösterilmemelidir.

  Not (teknik borç): NeedListStatus şu an yalnızca CREATED/APPROVED/CANCELLED
  değerlerini biliyor; Alım/Toplama aşamalarının tamamlanması bu alana henüz
  yansımıyor (Purchase modülü NeedList.status'a dokunmuyor, yalnızca
  TaskAssignment'ı günceller). Bu yüzden CREATED durumu, plan aslında Alım veya
  Toplama aşamasında olsa bile hep "Alım Bekliyor" olarak görünür. Dört seviyeli
  ilerleme takibi ayrı bir görevde ele alınmalıdır.
*/
export function getNeedListStatusLabel(status) {
  switch (status) {
    case "CREATED":
      return "Alım Bekliyor";

    case "APPROVED":
      return "Tamamlandı";

    case "CANCELLED":
      return "İptal Edildi";

    default:
      return status || "Bilinmiyor";
  }
}

/*
  Plan kartındaki rozet için etiket üretir.

  Neden ayrı bir fonksiyon: getNeedListStatusLabel yalnızca NeedListStatus'a
  bakar, ama alımı yapılmış bir plan hâlâ CREATED durumunda kalır (bkz.
  yukarıdaki teknik borç notu). Bu yüzden ekranda rozet "Alım Bekliyor" derken
  aynı kartın altında "Alım yapıldı, bu plan artık değiştirilemez" yazıyordu.

  editable alanı bu boşluğu kapatır: backend, plana ilk alım kaydı düştüğü an
  bu alanı false yapar (bkz. NeedListService.requirePlanNotPurchased).
  Böylece NeedListStatus enum'una dokunmadan doğru etiket gösterilir.
*/
export function getPlanStageLabel(status, editable) {
  if (status === "CREATED" && editable === false) {
    return "Alım Yapıldı";
  }

  return getNeedListStatusLabel(status);
}
