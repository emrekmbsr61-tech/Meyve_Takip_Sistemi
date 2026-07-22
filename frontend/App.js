import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { View, Text, Button, ScrollView } from "react-native";
import Login from "./src/pages/Login";
import Fruits from "./src/pages/Fruits";
import NeedLists from "./src/pages/NeedLists";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);

  const renderRoleScreen = () => {
    if (currentUser.role === "MAGAZA_PERSONELI") {
      return (
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 22, marginBottom: 10 }}>
            Mağaza Personeli Paneli
          </Text>

          <Text>• İhtiyaç listesi oluşturma</Text>
          <Text>• Mevcut ihtiyaç listelerini görüntüleme</Text>
          <Text>• Mağaza görevlerini takip etme</Text>

          <NeedLists currentUser={currentUser} />

          <View style={{ marginTop: 20 }}>
            <Fruits />
          </View>
        </View>
      );
    }

    if (currentUser.role === "SOFOR") {
      return (
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 22, marginBottom: 10 }}>
            Şoför Paneli
          </Text>

          <Text>• Teslimat görevlerini görüntüleme</Text>
          <Text>• Teslim edilen ürünleri onaylama</Text>
          <Text>• Görev durumunu güncelleme</Text>
        </View>
      );
    }

    if (currentUser.role === "ADMIN") {
      return (
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 22, marginBottom: 10 }}>
            Admin Paneli
          </Text>

          <Text>• Kullanıcıları yönetme</Text>
          <Text>• Meyve listesini yönetme</Text>
          <Text>• Sistem loglarını görüntüleme</Text>
        </View>
      );
    }

    return (
      <View style={{ padding: 20 }}>
        <Text>Bu role ait panel bulunamadı.</Text>
      </View>
    );
  };

  return (
    <>
      {currentUser ? (
        <ScrollView style={{ flex: 1 }}>
          <View style={{ padding: 20, borderBottomWidth: 1 }}>
            <Text style={{ fontSize: 20 }}>
              Hoş geldin, {currentUser.fullName}
            </Text>

            <Text style={{ marginTop: 5, marginBottom: 10 }}>
              Rol: {currentUser.role}
            </Text>

            <Button title="Çıkış Yap" onPress={() => setCurrentUser(null)} />
          </View>

          {renderRoleScreen()}
        </ScrollView>
      ) : (
        <Login onLoginSuccess={setCurrentUser} />
      )}

      <StatusBar style="auto" />
    </>
  );
}