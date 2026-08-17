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
  blue: "#2563EB",
  blueLight: "#E8F0FE",
};

/*
  Tespit edilen tek bir miktar farkını okunabilir bir kart olarak gösterir.

  Backend uzun bir cümle gönderir, örn:
    "Plan #31 - Armut Deveci: Toplama 90 Kilo, Kabul 88 Kilo. 2 Kilo eksik!
     HIRSIZLIK/KAYIP ŞÜPHESİ: Taşıma sırasında miktar değişmiş."

  Bu kart onu üçe böler:
    Başlık   -> "Armut Deveci · 2 Kilo eksik"
    Açıklama -> "Taşıma sırasında kayıp"
    Alt bilgi-> "Plan #31 · 10 dakika önce"

  Sayısal veriyi backend'in gönderdiği details (JSON) alanından okur; okunamazsa
  ham mesaja geri döner, böylece ekran hiçbir durumda boş kalmaz.
*/

// Önem derecesine göre görsel ayarlar.
const SEVERITY = {
  CRITICAL: { label: "KAYIP ŞÜPHESİ", icon: "alert-circle", color: colors.red, background: colors.redLight },
  ERROR: { label: "İHTİYAÇ KARŞILANMADI", icon: "close-circle", color: colors.red, background: colors.redLight },
  WARNING: { label: "UYARI", icon: "warning", color: colors.orange, background: colors.orangeLight },
  SUCCESS: { label: "BİLGİ", icon: "information-circle", color: colors.blue, background: colors.blueLight },
};

/*
  Hangi aşamada tespit edildiğini sade Türkçeye çevirir.

  Yön önemlidir: eksik çıkması kayıp/hırsızlık şüphesidir, fazla çıkması ise
  kayıp değildir (fazla alınmış/fazla gelmiştir). Bu yüzden her aşama için
  iki ayrı metin tutulur - aksi halde "2 kilo fazla" için de "kayıp" yazardı.
*/
const STAGE_LABELS = {
  "IHTIYAC-ALIM": { eksik: "İhtiyaçtan az sipariş edilmiş", fazla: "İhtiyaçtan fazla sipariş edilmiş" },
  "ALIM-TOPLAMA": { eksik: "Halde kayıp", fazla: "Halde fazla yüklenmiş" },
  "TOPLAMA-KABUL": { eksik: "Taşımada kayıp", fazla: "Mağazada fazla sayılmış" },
  "IHTIYAC-KABUL": { eksik: "Mağazaya eksik ulaştı", fazla: "Mağazaya fazla ulaştı" },
};

// Aşama ve farkın yönüne göre açıklama metnini seçer.
function stageReason(asama, fark) {
  const labels = STAGE_LABELS[asama];

  if (!labels) {
    return "Miktar farkı";
  }

  return Number(fark) < 0 ? labels.eksik : labels.fazla;
}

export default function IssueCard({ issue }) {
  const severity = SEVERITY[issue.status] || SEVERITY.WARNING;
  const detail = parseDetails(issue.details);

  const title = detail
    ? `${detail.urun} · ${formatDifference(detail.fark, detail.birim)}`
    : kisalt(issue.message);

  const reason = detail ? stageReason(detail.asama, detail.fark) : null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: severity.background }]}>
          <Ionicons name={severity.icon} size={18} color={severity.color} />
        </View>

        <View style={styles.headerText}>
          <Text style={[styles.severityLabel, { color: severity.color }]}>
            {severity.label}
          </Text>
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>

      {reason ? <Text style={styles.reason}>{reason}</Text> : null}

      <Text style={styles.meta}>
        {issue.planId ? `Plan #${issue.planId}` : "Plan bilgisi yok"}
        {" · "}
        {formatRelativeTime(issue.createdAt)}
      </Text>
    </View>
  );
}

/*
  details alanı backend'de bizim ürettiğimiz bir JSON metnidir, örn:
  {"asama":"ALIM-TOPLAMA","urun":"Armut Deveci","birim":"KG","fark":-5}
  Bozuk/boş gelirse null döner ve kart ham mesaja geri döner.
*/
function parseDetails(details) {
  if (!details) return null;

  try {
    const parsed = JSON.parse(details);
    return parsed && parsed.urun ? parsed : null;
  } catch {
    return null;
  }
}

// -5 -> "5 Kilo eksik", +2 -> "2 Kilo fazla"
function formatDifference(fark, birim) {
  const amount = Math.abs(Number(fark) || 0);
  const rounded = Number.isInteger(amount) ? amount : amount.toFixed(1);

  return `${rounded} ${unitLabel(birim)} ${Number(fark) < 0 ? "eksik" : "fazla"}`;
}

function unitLabel(birim) {
  switch (birim) {
    case "KG":
      return "Kilo";
    case "ADET":
      return "Adet";
    case "KASA":
      return "Kasa";
    default:
      return "birim";
  }
}

// Uzun mesajı ilk cümlesiyle sınırlar (details okunamadığında kullanılır).
function kisalt(message) {
  if (!message) return "Miktar farkı tespit edildi";

  const firstSentence = String(message).split(". ")[0];
  return firstSentence.length > 70 ? `${firstSentence.slice(0, 70)}...` : firstSentence;
}

// "10 dakika önce", "2 saat önce", "3 gün önce"
function formatRelativeTime(value) {
  if (!value) return "";

  const diffMs = Date.now() - new Date(value).getTime();

  if (Number.isNaN(diffMs)) return "";
  if (diffMs < 60 * 1000) return "az önce";

  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 60) return `${minutes} dakika önce`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;

  return `${Math.floor(hours / 24)} gün önce`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 11 },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  severityLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  title: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 2 },
  reason: { color: colors.gray, fontSize: 13, marginTop: 9, marginLeft: 45 },
  meta: { color: colors.gray, fontSize: 11, marginTop: 8, marginLeft: 45 },
});
