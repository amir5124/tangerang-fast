import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../../utils/api'; // Pastikan path api sudah benar

// Base URL untuk gambar dari backend
const IMAGE_BASE_URL = 'https://backend.tangerangfast.online';

export const MenuGrid = () => {
  const router = useRouter();
  const [dbAssets, setDbAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Ambil data assets dari database saat komponen dimuat
  useEffect(() => {
    const loadAssets = async () => {
      try {
        const response = await api.get('/assets');
        setDbAssets(response.data || []);
      } catch (error) {
        console.error('Gagal memuat assets dari DB', error);
      } finally {
        setLoading(false);
      }
    };
    loadAssets();
  }, []);

  // Fungsi Helper untuk mendapatkan URL gambar berdasarkan key_name
  const getImageUrl = (keyName: string, defaultUrl: string) => {
    const asset = dbAssets.find(a => a.key_name === keyName);
    return asset?.image_url
      ? `${IMAGE_BASE_URL}${asset.image_url}`
      : defaultUrl;
  };

  const popularServices = [
    {
      id: 1,
      title: 'Service AC',
      image: getImageUrl(
        'popular_service_1',
        'https://res.cloudinary.com/dgsdmgcc7/image/upload/v1769957885/ac_i3fgtf.jpg',
      ),
      category: 'ac',
    },
    {
      id: 2,
      title: 'Cleaning Service',
      image: getImageUrl(
        'popular_service_2',
        'https://res.cloudinary.com/dgsdmgcc7/image/upload/v1765960038/clean_ndmyx7.jpg',
      ),
      category: 'cleaning',
    },
  ];

  const categories = [
    {id: 1, title: 'Perbaikan\nAC', category: 'ac', key: 'icon_ac'},
    {
      id: 2,
      title: 'Jasa\nKebersihan',
      category: 'cleaning',
      key: 'icon_cleaning',
    },
    {
      id: 3,
      title: 'Tukang\nBangunan',
      category: 'bangunan',
      key: 'icon_bangunan',
    },
    {id: 4, title: 'Tukang\nKebun', category: 'kebun', key: 'icon_kebun'},
    {
      id: 5,
      title: 'Layanan\nKorporasi',
      category: 'korporasi',
      key: 'icon_korporasi',
    },
    {id: 6, title: 'Ojek\nOnline', category: 'ojek', key: 'icon_ojek'},
    {id: 7, title: 'Sedot\nWC', category: 'wc', key: 'icon_wc'},
    {
      id: 8,
      title: 'Layanan\nRigid',
      category: 'rigid',
      key: 'icon_rigid',
    },
  ];

  const handlePress = (category: string) => {
    const restricted = ['bangunan', 'kebun', 'korporasi', 'ojek', 'rigid'];

    if (restricted.includes(category)) {
      return router.push('/belum-tersedia');
    }

    switch (category) {
      case 'ac':
        router.push({
          pathname: '/order-detail',
          params: {id: '16', user_id: '25', title: 'TangerangFast'},
        });
        break;
      case 'cleaning':
        router.push({
          pathname: '/order-detail',
          params: {id: '19', user_id: '38', title: 'TangerangFast Service'},
        });
        break;
      case 'wc':
        router.push({
          pathname: '/order-detail',
          params: {id: '20', user_id: '52', title: 'Sedot WC'},
        });
        break;
      default:
        console.log('Navigasi ke kategori:', category);
    }
  };

  if (loading) {
    return (
      <ActivityIndicator size="large" color="#633594" style={{marginTop: 50}} />
    );
  }

  return (
    <View style={styles.container}>
      {/* Section: Jasa Terpopuler */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Jasa Terpopuler</Text>
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={() => router.push('/explore')}>
          <Text style={styles.seeAll}>Lihat Semua</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.popularRow}>
        {popularServices.map(item => (
          <TouchableOpacity
            key={item.id}
            style={styles.popularCard}
            activeOpacity={1}
            onPress={() => handlePress(item.category)}>
            <Image source={{uri: item.image}} style={styles.popularImage} />
            <Text style={styles.popularText}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Section: Kategori */}
      <View style={[styles.sectionHeader, {marginTop: 35}]}>
        <Text style={styles.sectionTitle}>Kategori</Text>
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={() => router.push('/explore')}>
          <Text style={styles.seeAll}>Lihat Semua</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.categoryGrid}>
        {categories.map(item => (
          <TouchableOpacity
            key={item.id}
            style={styles.categoryItem}
            activeOpacity={1}
            onPress={() => handlePress(item.category)}>
            <View style={styles.categoryCard}>
              <Image
                source={{
                  uri: getImageUrl(
                    item.key,
                    'https://kilaugroup.co.id/placeholder.png',
                  ),
                }}
                style={styles.categoryIcon}
              />
              <Text style={styles.categoryText}>{item.title}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    backgroundColor: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#633594',
  },
  seeAll: {
    color: '#28a745',
    fontWeight: 'bold',
    fontSize: 14,
  },
  popularRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  popularCard: {
    width: '48%',
    backgroundColor: '#fff',
  },
  popularImage: {
    width: '100%',
    height: 110,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
  },
  popularText: {
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '600',
    color: '#333',
    fontSize: 14,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: 20,
  },
  categoryItem: {
    width: '25%', // Diubah ke 25% agar 4 kolom per baris untuk total 8 menu
    padding: 5,
    marginBottom: 10,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    height: 95,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  categoryIcon: {
    width: 35,
    height: 35,
    marginBottom: 8,
    resizeMode: 'contain',
  },
  categoryText: {
    textAlign: 'center',
    fontSize: 9, // Diperkecil sedikit agar muat 4 kolom
    color: '#444',
    fontWeight: '600',
    lineHeight: 12,
  },
});
