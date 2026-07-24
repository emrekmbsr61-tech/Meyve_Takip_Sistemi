import { useEffect, useState } from "react";
import { View, Text, Image } from "react-native";
import { getFruits } from "./api";

// Meyve listesini gösteren ekrandır.
export default function Fruits() {
  const [fruits, setFruits] = useState([]);

  // Ekran açılınca backend'den meyve listesini çeker.
  useEffect(() => {
    getFruits()
      .then((data) => {
        setFruits(data);
      })
      .catch((error) => {
        console.log(error.message);
      });
  }, []);

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Meyve Listesi</Text>

      {fruits.length === 0 ? (
        <Text>Henüz meyve kaydı yok.</Text>
      ) : (
        fruits.map((fruit) => (
          <View
            key={fruit.id}
            style={{
              marginBottom: 15,
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 8,
              padding: 10,
              backgroundColor: "white",
            }}
          >
            {fruit.imagePath && (
              <Image
                source={{ uri: `http://localhost:8080${fruit.imagePath}` }}
                style={{
                  width: 100,
                  height: 100,
                  marginBottom: 10,
                  borderRadius: 8,
                }}
              />
            )}

            <Text>Ad: {fruit.name}</Text>
            <Text>Kod: {fruit.code}</Text>
            <Text>Birim: {fruit.unit}</Text>
          </View>
        ))
      )}
    </View>
  );
}