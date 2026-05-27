import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Shimmer } from '../../components/home/Shimmer';
import api from '../../utils/api';
const { width: windowWidth } = Dimensions.get('window');

// Base URL untuk gambar dari backend
const IMAGE_BASE_URL = 'https://backend.tangerangfast.online';

export const MenuGrid = () => {
  const router = useRouter();
  const [dbAssets, setDbAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [allMenuAsset, setAllMenuAsset] = useState<any>(null);

  useEffect(() => {
    const loadAssets = async () => {
      try {
        const response = await api.get('/assets');
        const assets = response.data || [];
        setDbAssets(assets);

        // Cari asset untuk menu "All" dari database
        const allAsset = assets.find((asset: any) =>
          asset.key_name === 'icon_all' ||
          asset.key_name === 'menu_all' ||
          asset.display_name === 'All'
        );
        setAllMenuAsset(allAsset);
      } catch (error) {
        console.error('Gagal memuat assets dari DB', error);
      } finally {
        setLoading(false);
      }
    };
    loadAssets();
  }, []);

  // Filter Jasa Terpopuler untuk Modal "All"
  const popularServices = dbAssets.filter((asset: any) =>
    asset.key_name?.includes('popular_service')
  );

  // Filter Kategori Menu Utama (tanpa menu All)
  const menuOrder = [
    'icon_ac',
    'icon_cleaning',
    'icon_wc',
    'icon_rigid',
    'icon_kebun',
    'icon_korporasi',
    'icon_bangunan'
  ];

  const categories = menuOrder
    .map(key => dbAssets.find((a: any) => a.key_name === key))
    .filter(Boolean);

  const handlePress = (keyName: string) => {
    // Mapping untuk navigasi ke halaman spesifik
    const navigationMap: any = {
      'icon_ac': { pathname: '/service-ac' },
      'icon_cleaning': { pathname: '/cleaning-service' },
      'icon_wc': { pathname: '/sedot-wc' },
      'icon_rigid': { pathname: '/art-babysitter' },
      'icon_all': { screen: 'All Services' }, // Menu All akan membuka modal
    };

    // Daftar menu yang belum tersedia
    const unavailableKeys = ['icon_bangunan', 'icon_kebun', 'icon_korporasi', 'icon_ojek'];

    // Untuk menu All, buka modal
    if (keyName === 'icon_all' || keyName === 'menu_all') {
      setShowModal(true);
      return;
    }

    // Cek apakah menu belum tersedia
    if (unavailableKeys.includes(keyName)) {
      return router.push('/belum-tersedia');
    }

    // Cek apakah ada mapping untuk menu tersebut
    const target = navigationMap[keyName];
    if (target) {
      if (target.params) {
        router.push(target);
      } else if (target.pathname) {
        router.push(target.pathname);
      } else if (target.screen) {
        // Untuk menu All, kita sudah handle di atas
        setShowModal(true);
      }
    } else {
      router.push('/belum-tersedia');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionHeader}>
          <Shimmer style={{ width: 120, height: 20, borderRadius: 4 }} />
        </View>
        <View style={styles.categoryGrid}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <View key={i} style={styles.categoryItem}>
              <Shimmer style={[styles.categoryCard, { width: '100%', height: 85 }]} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.sectionHeader, { marginTop: 20 }]}>
        <Text style={styles.sectionTitle}>Kategori Layanan</Text>
      </View>

      <View style={styles.categoryGrid}>
        {categories.map((item: any) => (
          <TouchableOpacity
            key={item.id}
            style={styles.categoryItem}
            activeOpacity={0.8}
            onPress={() => handlePress(item.key_name)}>
            <View style={styles.categoryCard}>
              <Image
                source={{ uri: `${IMAGE_BASE_URL}${item.image_url}` }}
                style={styles.categoryIcon}
              />
              <Text style={styles.categoryText}>
                {item.key_name === 'icon_bangunan' ? 'Toko' : item.display_name}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Menu All - Menggunakan asset dari database jika ada */}
        <TouchableOpacity
          style={styles.categoryItem}
          activeOpacity={0.8}
          onPress={() => handlePress('icon_all')}>
          <View style={styles.categoryCard}>
            {allMenuAsset ? (
              <Image
                source={{ uri: `${IMAGE_BASE_URL}${allMenuAsset.image_url}` }}
                style={styles.categoryIcon}
              />
            ) : (
              // Fallback icon jika tidak ada di database
              <Image
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2311/2311523.png' }}
                style={styles.categoryIcon}
              />
            )}
            <Text style={styles.categoryText}>
              {allMenuAsset?.display_name || 'All'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
          <View style={styles.bottomSheet}>
            <View style={styles.dragHandle} />
            <Text style={styles.modalTitle}>Semua Layanan</Text>
            <View style={styles.modalGrid}>
              {popularServices.map((item: any) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.modalItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    setShowModal(false);
                    handlePress(item.key_name);
                  }}>
                  <View style={styles.modalIconWrapper}>
                    <Image
                      source={{ uri: `${IMAGE_BASE_URL}${item.image_url}` }}
                      style={styles.modalIcon}
                    />
                  </View>
                  <Text style={styles.modalText} numberOfLines={2}>
                    {item.display_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: 20,
    paddingHorizontal: 0,
    gap: 12,
  },
  categoryItem: {
    width: '22%',
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f5f5f5',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    marginBottom: 6,
    resizeMode: 'contain',
  },
  categoryText: {
    textAlign: 'center',
    fontSize: 10,
    color: '#444',
    fontWeight: '700',
    paddingHorizontal: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingBottom: 40,
    minHeight: '60%',
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#ccc',
    borderRadius: 10,
    alignSelf: 'center',
    marginVertical: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 25,
    color: '#333',
    textAlign: 'left',
  },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  modalItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  modalIconWrapper: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  modalIcon: {
    width: '70%',
    height: '70%',
    resizeMode: 'contain',
  },
  modalText: {
    marginTop: 8,
    fontSize: 10,
    fontWeight: '600',
    color: '#444',
    textAlign: 'center',
  },
});