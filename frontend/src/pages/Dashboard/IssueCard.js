import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

const colors = {
  white: "#FFFFFF",
  border: "#DDE7DF",
  text: "#17211B",
  gray: "#6B7280",
  red: "#C62828",
  redLight: "#FDECEC",
  orange: "#C96800",
  orangeLight: "#FFF1DC",
};

/*
  TAMAMLANMIŞ bir plandaki tek bir ürünün BÜTÜN hikayesini tek kartta,
  akıcı bir şekilde gösterir: İhtiyaç -> Alım -> Toplama -> Kabul.

  Backend artık ham JSON değil, dört düz sayı gönderiyor (requiredQuantity,
  purchasedQuantity, collectedQuantity, acceptedQuantity); bu sayede burada
  hiçbir metin ayrıştırma yapılmaz, kart doğrudan bu sayılardan üretilir.

  Tasarım fikri: dört sayıyı bir "akış" (ok ok ok) olarak yan yana göster;
  sayı DÜŞTÜĞÜ yerdeki ok kırmızı/turuncu olur ve üzerinde "-2" gibi bir
  etiket çıkar. Böylece kaybın TAM OLARAK hangi aşamada olduğu bir bakışta,
  cümle okumaya gerek kalmadan görülür.
*/
export default function IssueCard({ issue }) {
  const renk = issue.lossDetected ? colors.red : colors.orange;
  const arkaPlan = issue.lossDetected ? colors.redLight : colors.orangeLight;
  const etiket = issue.lossDetected ? "KAYIP ŞÜPHESİ" : "FAZLALIK VAR";

  const adimlar = [
    { kisaEtiket: "İhtiyaç", deger: issue.requiredQuantity },
    { kisaEtiket: "Alım", deger: issue.purchasedQuantity },
    { kisaEtiket: "Toplama", deger: issue.collectedQuantity },
    { kisaEtiket: "Kabul", deger: issue.acceptedQuantity },
  ].filter((adim) => adim.deger !== null && adim.deger !== undefined);

  const birim = unitLabel(issue.unit);

  return (
    <View style={[styles.card, { borderLeftColor: renk }]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: arkaPlan }]}>
          <Ionicons name="git-compare-outline" size={17} color={renk} />
        </View>

        <View style={styles.headerText}>
          <Text style={[styles.etiket, { color: renk }]}>{etiket}</Text>
          <Text style={styles.baslik}>{issue.fruitName}</Text>
        </View>
      </View>

      {/* Akış: İhtiyaç -> Alım -> Toplama -> Kabul, düşen yer renklenir */}
      <View style={styles.akis}>
        {adimlar.map((adim, index) => {
          const oncekiAdim = adimlar[index - 1];
          const fark = oncekiAdim ? adim.deger - oncekiAdim.deger : 0;
          const okRengi = fark < 0 ? colors.red : fark > 0 ? colors.orange : colors.gray;

          return (
            <View key={adim.kisaEtiket} style={styles.adimGrubu}>
              {index > 0 ? (
                <View style={styles.okAlani}>
                  <Ionicons name="arrow-forward" size={14} color={okRengi} />
                  {fark !== 0 ? (
                    <Text style={[styles.farkEtiketi, { color: okRengi }]}>
                      {fark < 0 ? "" : "+"}
                      {miktar(fark)}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.adim}>
                <Text style={styles.adimDeger}>{miktar(adim.deger)}</Text>
                <Text style={styles.adimEtiket}>{adim.kisaEtiket}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <Text style={styles.birimText}>{birim}</Text>

      <Text style={styles.meta}>
        {issue.storeName ? `${issue.storeName} · ` : ""}
        {issue.planId ? `Plan #${issue.planId}` : ""}
        {" · "}
        {gecenSure(issue.completedAt)}
      </Text>
    </View>
  );
}

// 2.0 -> "2", 0.5 -> "0,5" (Türkçe ondalık ayracı)
function miktar(value) {
  const sayi = Number(value) || 0;
  return Number.isInteger(sayi) ? String(sayi) : String(sayi).replace(".", ",");
}

function unitLabel(birim) {
  switch (birim) {
    case "KG":
      return "kilo";
    case "ADET":
      return "adet";
    case "KASA":
      return "kasa";
    default:
      return "birim";
  }
}

// "az önce", "10 dakika önce", "2 saat önce", "3 gün önce"
function gecenSure(value) {
  if (!value) return "";

  const farkMs = Date.now() - new Date(value).getTime();

  if (Number.isNaN(farkMs)) return "";
  if (farkMs < 60 * 1000) return "az önce";

  const dakika = Math.floor(farkMs / (60 * 1000));
  if (dakika < 60) return `${dakika} dakika önce`;

  const saat = Math.floor(dakika / 60);
  if (saat < 24) return `${saat} saat önce`;

  return `${Math.floor(saat / 24)} gün önce`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 12 },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  etiket: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  baslik: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 2 },

  akis: {
    flexDirection: "row",
    alignItems: "flex-end",
    flexWrap: "wrap",
  },
  adimGrubu: { flexDirection: "row", alignItems: "flex-end" },
  adim: { alignItems: "center", minWidth: 44 },
  adimDeger: { color: colors.text, fontSize: 16, fontWeight: "800" },
  adimEtiket: { color: colors.gray, fontSize: 10, marginTop: 2 },
  okAlani: { alignItems: "center", justifyContent: "flex-end", width: 34, marginBottom: 5 },
  farkEtiketi: { fontSize: 10, fontWeight: "800", marginTop: 1 },

  birimText: { color: colors.gray, fontSize: 11, marginTop: 2 },
  meta: { color: colors.gray, fontSize: 11, marginTop: 9 },
});
