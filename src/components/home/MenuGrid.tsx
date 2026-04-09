import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Shimmer } from '../../components/home/Shimmer';
import api from '../../utils/api';

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
    {id: 3, title: 'Sedot\nWC', category: 'wc', key: 'icon_wc'},
    {
      id: 4,
      title: 'ART\nBabysitter',
      category: 'art',
      key: 'icon_rigid',
    },
    {
      id: 5,
      title: 'Tukang\nBangunan',
      category: 'bangunan',
      key: 'icon_bangunan',
    },
    {id: 6, title: 'Tukang\nKebun', category: 'kebun', key: 'icon_kebun'},
    // {
    //   id: 7,
    //   title: 'Layanan\nKorporasi',
    //   category: 'korporasi',
    //   key: 'icon_korporasi',
    // },
    // {id: 8, title: 'Ojek\nOnline', category: 'ojek', key: 'icon_ojek'},
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
          params: {id: '22', user_id: '58', title: 'Vendor Rijit'},
        });
        break;
      case 'art':
        router.push({
          pathname: '/order-detail',
          params: {id: '23', user_id: '59', title: 'Vendor ART'},
        });
        break;
      default:
        console.log('Navigasi ke kategori:', category);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        {/* Skeleton Header */}
        <View style={styles.sectionHeader}>
          <Shimmer style={{width: 120, height: 20, borderRadius: 4}} />
        </View>

        {/* Skeleton Jasa Terpopuler */}
        <View style={styles.popularRow}>
          <Shimmer style={[styles.popularImage, {width: '48%', height: 110}]} />
          <Shimmer style={[styles.popularImage, {width: '48%', height: 110}]} />
        </View>

        {/* Skeleton Kategori Grid */}
        <View style={[styles.sectionHeader, {marginTop: 35}]}>
          <Shimmer style={{width: 100, height: 20, borderRadius: 4}} />
        </View>

        <View style={styles.categoryGrid}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <View key={i} style={styles.categoryItem}>
              <Shimmer style={[styles.categoryCard, {width: '100%'}]} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Section: Jasa Terpopuler */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Jasa Terpopuler</Text>
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
        <Text style={styles.sectionTitle}>Kategori Layanan</Text>
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
    justifyContent: 'flex-start', // Tetap flex-start agar sejajar rapi
    marginTop: 20,
  },
  categoryItem: {
    width: '33.3%', // Diubah ke 33.3% agar menjadi 3 kolom per baris
    padding: 8, // Padding sedikit diperbesar agar antar card ada jarak manis
    marginBottom: 5,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    height: 95, // Tinggi tetap sama sesuai permintaan Anda
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
    width: 45, // Ukuran icon bisa dinaikkan sedikit karena ruang lebih luas
    height: 45,
    marginBottom: 8,
    resizeMode: 'contain',
  },
  categoryText: {
    textAlign: 'center',
    fontSize: 11, // Ukuran font dinaikkan dari 9 ke 11 agar lebih jelas
    color: '#444',
    fontWeight: '600',
    lineHeight: 14,
  },
});
