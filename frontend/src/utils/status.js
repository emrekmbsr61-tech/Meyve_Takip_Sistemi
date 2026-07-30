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
