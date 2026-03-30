import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../utils/api';

const HomeScreen = ({ navigation }) => {
  const tailwind = useTailwind();
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    getUserData();
  }, []);

  const getUserData = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem('userData');
      setUserData(jsonValue != null ? JSON.parse(jsonValue) : null);
    } catch (e) {
      console.log('Gagal ambil data user:', e);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Apakah Anda yakin ingin keluar?",
      [
        { text: "Batal", style: "cancel" },
        { 
          text: "Ya, Keluar", 
          onPress: async () => {
            try {
              await AsyncStorage.clear(); // Hapus semua data (token, userData, dll)
              navigation.replace('Login'); // Lempar balik ke Login
            } catch (e) {
              console.log('Error logout:', e);
            }
          } 
        }
      ]
    );
  };

  return (
    <View style={tailwind('flex-1 bg-gray-50')}>
      {/* Header Ungu */}
      <View style={[tailwind('p-6 pt-12 rounded-b-3xl shadow-lg'), { backgroundColor: '#633594' }]}>
        <View style={tailwind('flex-row justify-between items-center')}>
          <View>
            <Text style={tailwind('text-white text-lg opacity-80')}>Selamat Datang,</Text>
            <Text style={tailwind('text-white text-2xl font-bold')}>
              {userData ? userData.full_name : 'Pelanggan'}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={handleLogout}
            style={tailwind('bg-red-500 p-2 rounded-lg')}
          >
            <Text style={tailwind('text-white font-bold text-xs')}>LOGOUT</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={tailwind('p-6')}>
        {/* Card Info Saldo/Status (Contoh) */}
        <View style={tailwind('bg-white p-6 rounded-2xl shadow-sm mb-6 -mt-12')}>
          <Text style={tailwind('text-gray-500 font-bold')}>Status Akun</Text>
          <View style={tailwind('flex-row items-center mt-2')}>
            <View style={[tailwind('w-3 h-3 rounded-full mr-2'), { backgroundColor: '#2ca942' }]} />
            <Text style={[tailwind('font-bold'), { color: '#2ca942' }]}>Aktif (Customer)</Text>
          </View>
        </View>

        {/* Placeholder Menu Jasa */}
        <Text style={tailwind('text-lg font-bold text-gray-800 mb-4')}>Layanan Kami</Text>
        
        <View style={tailwind('flex-row flex-wrap justify-between')}>
          {['Cuci AC', 'Service Pompa', 'Listrik', 'Bangunan'].map((item, index) => (
            <TouchableOpacity 
              key={index}
              style={tailwind('bg-white w-5/12 p-4 rounded-xl mb-4 items-center shadow-sm')}
            >
              <View style={[tailwind('w-12 h-12 rounded-full mb-2 opacity-20'), { backgroundColor: '#633594' }]} />
              <Text style={tailwind('font-bold text-gray-700')}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default HomeScreen;