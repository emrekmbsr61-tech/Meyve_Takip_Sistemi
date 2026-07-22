import { useEffect, useState } from "react";
import { View, Text, TextInput, Button, Pressable } from "react-native";
import {
  createNeedList,
  getNeedLists,
  deleteNeedList,
  updateNeedList,
} from "../../services/needListService";
import { getFruits } from "../Fruits/api";

// Mağaza personelinin ihtiyaç listesi oluşturduğu ekrandır.
export default function NeedLists({ currentUser }) {
  const [planId, setPlanId] = useState("1");
  const [fruitId, setFruitId] = useState("");
  const [requiredQuantity, setRequiredQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [needLists, setNeedLists] = useState([]);
  const [fruits, setFruits] = useState([]);
  const [message, setMessage] = useState("");

  // Güncelleme yapılacak kaydın id bilgisini tutar.
  const [editingId, setEditingId] = useState(null);

  // Ekran açılınca meyveleri ve ihtiyaç listelerini getirir.
  useEffect(() => {
    loadFruits();
    loadNeedLists();
  }, []);

  // Backend'den meyve listesini çeker.
  const loadFruits = async () => {
    try {
      const data = await getFruits();
      setFruits(data);

      if (data.length > 0) {
        setFruitId(String(data[0].id));
      }
    } catch (error) {
      setMessage("Meyve listesi alınamadı.");
    }
  };

  // Backend'den ihtiyaç listelerini çeker.
  const loadNeedLists = async () => {
    try {
      const data = await getNeedLists();
      setNeedLists(data);
    } catch (error) {
      setMessage(error.message);
    }
  };

  // Formu temizler.
  const clearForm = () => {
    setRequiredQuantity("");
    setNotes("");
    setEditingId(null);

    if (fruits.length > 0) {
      setFruitId(String(fruits[0].id));
    }
  };

  // Yeni ihtiyaç listesi oluşturur veya mevcut ihtiyacı günceller.
  const handleSaveNeedList = async () => {
    if (!fruitId) {
      setMessage("Meyve seçilmelidir.");
      return;
    }

    if (!requiredQuantity) {
      setMessage("Miktar alanı boş bırakılamaz.");
      return;
    }

    const selectedFruit = fruits.find((fruit) => fruit.id === Number(fruitId));

    if (!selectedFruit) {
      setMessage("Geçerli bir meyve seçilmelidir.");
      return;
    }

    try {
      const needListData = {
        planId: Number(planId),
        fruitId: Number(fruitId),
        requiredQuantity: Number(requiredQuantity),
        createdBy: currentUser.id,
        notes: notes,
      };

      if (editingId) {
        await updateNeedList(editingId, needListData);
        setMessage("İhtiyaç listesi güncellendi.");
      } else {
        await createNeedList(needListData);
        setMessage("İhtiyaç listesi oluşturuldu.");
      }

      clearForm();
      loadNeedLists();
    } catch (error) {
      setMessage(error.message);
    }
  };

  // Seçilen ihtiyaç listesini siler.
  const handleDeleteNeedList = async (id) => {
    try {
      await deleteNeedList(id);
      setMessage("İhtiyaç listesi silindi.");
      loadNeedLists();
    } catch (error) {
      setMessage(error.message);
    }
  };

  // Seçilen ihtiyaç listesini güncelleme için forma aktarır.
  const handleEditNeedList = (item) => {
    setEditingId(item.id);
    setPlanId(String(item.planId));
    setFruitId(String(item.fruitId));
    setRequiredQuantity(String(item.requiredQuantity));
    setNotes(item.notes || "");
    setMessage("Güncellemek istediğin kayıt forma aktarıldı.");
  };

  return (
    <View style={{ marginTop: 15 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 10 }}>
        {editingId ? "İhtiyaç Listesi Güncelle" : "İhtiyaç Listesi Oluştur"}
      </Text>

      <Text>Plan ID</Text>
      <TextInput
        value={planId}
        onChangeText={setPlanId}
        keyboardType="numeric"
        style={styles.input}
      />

      <Text style={{ marginBottom: 6 }}>Meyve Seç</Text>

      {fruits.length === 0 ? (
        <Text>Meyve bulunamadı.</Text>
      ) : (
        fruits.map((fruit) => (
          <Pressable
            key={fruit.id}
            onPress={() => setFruitId(String(fruit.id))}
            style={[
              styles.fruitButton,
              Number(fruitId) === fruit.id && styles.selectedFruitButton,
            ]}
          >
            <Text>
              {fruit.name} - {fruit.code} / {fruit.unit}{" "}
              {Number(fruitId) === fruit.id ? "(Seçili)" : ""}
            </Text>
          </Pressable>
        ))
      )}

      <Text>İstenen Miktar</Text>
      <TextInput
        value={requiredQuantity}
        onChangeText={setRequiredQuantity}
        placeholder="Örn: 20"
        keyboardType="numeric"
        style={styles.input}
      />

      <Text>Not</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Örn: Bugün elma ihtiyacı var"
        style={styles.input}
      />

      <Button
        title={editingId ? "İhtiyacı Güncelle" : "İhtiyaç Oluştur"}
        onPress={handleSaveNeedList}
      />

      {editingId && (
        <View style={{ marginTop: 10 }}>
          <Button title="Güncellemeyi İptal Et" onPress={clearForm} />
        </View>
      )}

      <Text style={{ marginTop: 10, color: "green" }}>{message}</Text>

      <Text style={{ fontSize: 20, fontWeight: "bold", marginTop: 25 }}>
        Mevcut İhtiyaç Listeleri
      </Text>

      {needLists.length === 0 ? (
        <Text style={{ marginTop: 10 }}>Henüz ihtiyaç listesi yok.</Text>
      ) : (
        needLists.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text>ID: {item.id}</Text>
            <Text>Plan ID: {item.planId}</Text>
            <Text>
              Meyve: {item.fruitName} (ID: {item.fruitId})
            </Text>
            <Text>Miktar: {item.requiredQuantity}</Text>
            <Text>
              Oluşturan Kullanıcı: {item.createdByName} (ID: {item.createdBy})
            </Text>
            <Text>Durum: {item.status}</Text>
            <Text>Not: {item.notes}</Text>

            <View style={{ marginTop: 10 }}>
              <Button
                title="Güncelle"
                onPress={() => handleEditNeedList(item)}
              />
            </View>

            <View style={{ marginTop: 10 }}>
              <Button
                title="Sil"
                onPress={() => handleDeleteNeedList(item.id)}
              />
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = {
  input: {
    borderWidth: 1,
    borderColor: "#999",
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  fruitButton: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
    backgroundColor: "white",
  },
  selectedFruitButton: {
    borderColor: "#2196f3",
    backgroundColor: "#e3f2fd",
  },
  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    backgroundColor: "white",
  },
};