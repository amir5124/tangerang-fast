import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import API from '../utils/api';

const LoginScreen = ({ navigation }) => {
  const tailwind = useTailwind();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      return Alert.alert("Peringatan", "Email dan password wajib diisi");
    }

    setLoading(true);
    try {
      // 1. Ambil FCM Token terbaru untuk update di database saat login
      const fcmToken = await messaging().getToken();

      // 2. Kirim request ke Backend Node.js
      const response = await API.post('/auth/login', {
        email,
        password,
        fcm_token: fcmToken
      });

      const { token, user } = response.data;

      // 3. Simpan Token dan Data User ke Local Storage
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(user));

      Alert.alert("Sukses", `Selamat datang kembali, ${user.full_name}`);
      
      // 4. Arahkan ke halaman utama (Home)
      navigation.replace('Home'); 
    } catch (error) {
      const msg = error.response?.data?.message || "Koneksi ke server gagal";
      Alert.alert("Gagal Masuk", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={tailwind('flex-1 bg-white p-6 justify-center')}>
      <View style={tailwind('mb-10')}>
        <Text style={[tailwind('text-4xl font-bold'), { color: '#633594' }]}>Masuk</Text>
        <Text style={tailwind('text-gray-500 mt-2')}>Selamat datang kembali di TangerangFast</Text>
      </View>

      <View>
        <Text style={tailwind('font-bold text-gray-700 mb-2')}>Email</Text>
        <TextInput
          style={tailwind('bg-gray-100 p-4 rounded-xl mb-4')}
          placeholder="email@contoh.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={tailwind('font-bold text-gray-700 mb-2')}>Kata Sandi</Text>
        <TextInput
          style={tailwind('bg-gray-100 p-4 rounded-xl mb-6')}
          placeholder="Masukkan kata sandi"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          style={[tailwind('p-4 rounded-xl items-center shadow-md'), { backgroundColor: '#633594' }]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={tailwind('text-white font-bold text-lg')}>Masuk</Text>
          )}
        </TouchableOpacity>

        <View style={tailwind('mt-8 items-center')}>
          <Text style={tailwind('text-gray-600')}>Belum punya akun?</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Register')}
            style={[tailwind('w-full p-4 rounded-xl mt-4 items-center border'), { borderColor: '#2ca942' }]}
          >
            <Text style={[tailwind('font-bold'), { color: '#2ca942' }]}>Daftar Akun Baru</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default LoginScreen;