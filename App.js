import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStackNavigator } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, LogBox, View } from 'react-native';
import { TailwindProvider } from 'tailwind-rn';
import utilities from './tailwind.json';

// Import Halaman
import HomeScreen from './src/pages/HomeScreen';
import LoginScreen from './src/pages/LoginScreen';
import RegisterScreen from './src/pages/RegisterScreen';

// Abaikan warning jika ada log yang terlalu banyak saat debug
LogBox.ignoreLogs(['Navigation state']);

const Stack = createStackNavigator();

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);

  // --- LOGIKA AUTH ---
  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      console.log("🔑 Status Login:", token ? "Sudah Login" : "Belum Login");
      setUserToken(token);
    } catch (e) {
      console.error("🔥 Gagal cek status login:", e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#633594" />
      </View>
    );
  }

  return (
    <TailwindProvider utilities={utilities}>
      <Stack.Navigator initialRouteName={userToken ? "Home" : "Register"}>
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Beranda' }}
        />
      </Stack.Navigator>
    </TailwindProvider>
  );
};

export default App;