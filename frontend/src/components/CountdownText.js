import { useEffect, useState } from "react";
import { Text } from "react-native";

import {
  URGENCY_COLORS,
  formatRemaining,
  getRemainingMs,
  getUrgency,
} from "../utils/countdown";

/*
  Bir görevin son teslim zamanına kalan süreyi CANLI olarak gösterir.

  Önceden bu süre ekran çizilirken bir kez hesaplanıyordu ve olduğu yerde
  donuyordu. Buradaki setInterval sayesinde saniyede bir güncellenir; süre
  azaldıkça yazı rengi de değişir (normal -> turuncu -> kırmızı), böylece
  aciliyet bir bakışta anlaşılır.

  Kullanım: <CountdownText dueDate={task.dueDate} style={styles.remainingText} />
*/
export default function CountdownText({ dueDate, style }) {
  const [remainingMs, setRemainingMs] = useState(() => getRemainingMs(dueDate));

  useEffect(() => {
    setRemainingMs(getRemainingMs(dueDate));

    // Süre belirtilmemişse saymaya gerek yok.
    if (!dueDate) return;

    const timer = setInterval(() => {
      setRemainingMs(getRemainingMs(dueDate));
    }, 1000);

    // Bileşen ekrandan kalkınca sayacı durdur (bellek sızıntısını önler).
    return () => clearInterval(timer);
  }, [dueDate]);

  const urgency = getUrgency(remainingMs);

  return (
    <Text style={[style, { color: URGENCY_COLORS[urgency] }]}>
      {formatRemaining(remainingMs)}
    </Text>
  );
}
