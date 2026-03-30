import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../utils/api';

const RegisterScreen = ({ navigation }) => {
  const tailwind = useTailwind();
  const [fcmToken, setFcmToken] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    full_name: '', // Tambahkan field nama sesuai tabel MySQL
    email: '',
    phone_number: '', // Tambahkan field nomor hp sesuai tabel MySQL
    password: '',
    repeat_password: '',
    role: 'customer', // Otomatis sebagai customer
  });

  useEffect(() => {
    getDeviceToken();
  }, []);

  const getDeviceToken = async () => {
    try {
      let token = await messaging().getToken();
      if (token) {
        setFcmToken(token);
        await AsyncStorage.setItem('fcm_token', token);
        console.log("FCM Token didapat:", token);
      }
    } catch (error) {
      console.log("Gagal ambil FCM Token:", error);
    }
  };

  const handleRegister = async () => {
    if (form.password !== form.repeat_password) {
      return Alert.alert("Error", "Password tidak cocok");
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        fcm_token: fcmToken // Kirim token ke backend
      };

      const response = await API.post('/auth/register', payload);
      
      Alert.alert("Berhasil", "Akun berhasil dibuat!");
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert("Gagal", error.response?.data?.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={tailwind('flex-1 bg-white p-6')}>
      <View style={tailwind('mt-10')}>
        <Text style={[tailwind('text-3xl font-bold'), { color: '#633594' }]}>Buat akun</Text>
        <Text style={tailwind('text-gray-500 mt-2')}>Silakan masukkan detail Anda</Text>
      </View>

      <View style={tailwind('mt-8')}>
        {/* Full Name */}
        <Text style={tailwind('font-bold text-gray-700 mb-2')}>Nama Lengkap</Text>
        <TextInput
          style={tailwind('bg-gray-100 p-4 rounded-xl mb-4')}
          placeholder="Masukkan nama lengkap"
          onChangeText={(val) => setForm({ ...form, full_name: val })}
        />

        {/* Email */}
        <Text style={tailwind('font-bold text-gray-700 mb-2')}>Email Anda</Text>
        <TextInput
          style={tailwind('bg-gray-100 p-4 rounded-xl mb-4')}
          placeholder="Masukkan email"
          keyboardType="email-address"
          autoCapitalize="none"
          onChangeText={(val) => setForm({ ...form, email: val })}
        />

        {/* Password */}
        <Text style={tailwind('font-bold text-gray-700 mb-2')}>Kata Sandi</Text>
        <TextInput
          style={tailwind('bg-gray-100 p-4 rounded-xl mb-4')}
          placeholder="Masukkan kata sandi"
          secureTextEntry
          onChangeText={(val) => setForm({ ...form, password: val })}
        />

        {/* Repeat Password */}
        <Text style={tailwind('font-bold text-gray-700 mb-2')}>Ulangi kata sandi</Text>
        <TextInput
          style={tailwind('bg-gray-100 p-4 rounded-xl mb-4')}
          placeholder="Ulangi kata sandi"
          secureTextEntry
          onChangeText={(val) => setForm({ ...form, repeat_password: val })}
        />

        {/* Register Button */}
        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading}
          style={[tailwind('p-4 rounded-xl mt-4 items-center shadow-lg'), { backgroundColor: '#633594' }]}
        >
          <Text style={tailwind('text-white font-bold text-lg')}>
            {loading ? 'Memproses...' : 'Daftar'}
          </Text>
        </TouchableOpacity>

        {/* Login Link */}
        <View style={tailwind('mt-10 items-center')}>
          <Text style={tailwind('text-gray-600')}>Sudah punya akun?</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Login')}
            style={[tailwind('w-full p-4 rounded-xl mt-4 items-center border'), { borderColor: '#2ca942' }]}
          >
            <Text style={[tailwind('font-bold'), { color: '#2ca942' }]}>Masuk</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default RegisterScreen;