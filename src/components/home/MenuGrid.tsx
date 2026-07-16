// components/home/MenuGrid.tsx
import { storage } from '@/src/utils/storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import api from '../../utils/api';
import { checkActiveArtOrder, navigateToMatching } from '../../utils/checkActiveArtOrder';
import { Shimmer } from './Shimmer';

const { width: windowWidth } = Dimensions.get('window');
const IMAGE_BASE_URL = 'https://backend.tangerangfast.online';

interface Asset {
  id: number;
  key_name: string;
  display_name: string;
  image_url: string;
}

export const MenuGrid: React.FC = () => {
  const router = useRouter();
  const [dbAssets, setDbAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [allMenuAsset, setAllMenuAsset] = useState<Asset | null>(null);
  const [isCheckingOrder, setIsCheckingOrder] = useState<boolean>(false);

  useEffect(() => {
    const loadAssets = async () => {
      try {
        const response = await api.get('/assets');
        const assets = response.data || [];
        setDbAssets(assets);

        const allAsset = assets.find((asset: Asset) =>
          asset.key_name === 'icon_all' ||
          asset.key_name === 'menu_all' ||
          asset.display_name === 'All'
        );
        setAllMenuAsset(allAsset || null);
      } catch (error) {
        console.error('Gagal memuat assets dari DB', error);
      } finally {
        setLoading(false);
      }
    };
    loadAssets();
  }, []);

  // ============================================================
  // 🔥 CEK PESANAN ART AKTIF SEBELUM MASUK HALAMAN ART
  // ============================================================
  const handleArtPress = async (): Promise<void> => {
    if (isCheckingOrder) return;
    setIsCheckingOrder(true);

    try {
      // 🔥 Ambil user data dari storage (key: 'userData'), sama seperti di DetailKontakScreen
      const jsonValue = await storage.get('userData');

      if (!jsonValue) {
        // Jika tidak ada data user, langsung ke halaman ART
        router.push('/art/art-babysitter');
        return;
      }

      const localData = JSON.parse(jsonValue);
      const customerId = localData?.id;

      console.log('🆔 customerId yang dipakai untuk cek order aktif:', customerId);

      if (!customerId) {
        router.push('/art/art-babysitter');
        return;
      }

      const { hasActiveOrder, activeOrder } = await checkActiveArtOrder(customerId);

      if (hasActiveOrder && activeOrder) {
        // 🔥 Ada pesanan aktif -> redirect ke MatchingScreen
        navigateToMatching(activeOrder);
      } else {
        // Tidak ada pesanan aktif -> ke halaman ART
        router.push('/art/art-babysitter');
      }
    } catch (error) {
      console.error('Error checking active order:', error);
      router.push('/art/art-babysitter');
    } finally {
      setIsCheckingOrder(false);
    }
  };

  // Filter Jasa Terpopuler untuk Modal "All"
  const popularServices = dbAssets.filter((asset: Asset) =>
    asset.key_name?.includes('popular_service')
  );

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
    .map(key => dbAssets.find((a: Asset) => a.key_name === key))
    .filter((item): item is Asset => item !== undefined);

  const handlePress = (keyName: string): void => {
    // 🔥 KHUSUS ART/BABYSITTER - cek pesanan aktif
    if (keyName === 'icon_rigid') {
      handleArtPress();
      return;
    }

    const navigationMap: Record<string, { pathname: string } | { screen: string }> = {
      'icon_ac': { pathname: '/service-ac' },
      'icon_cleaning': { pathname: '/cleaning-service' },
      'icon_wc': { pathname: '/sedot-wc' },
      'icon_bangunan': { pathname: '/toko/tokolist' },
      'icon_kebun': { pathname: '/laundry/list-mitra' },
      'icon_all': { screen: 'All Services' },
    };

    const unavailableKeys = ['icon_korporasi', 'icon_ojek'];

    if (keyName === 'icon_all' || keyName === 'menu_all') {
      setShowModal(true);
      return;
    }

    if (unavailableKeys.includes(keyName)) {
      router.push('/belum-tersedia');
      return;
    }

    const target = navigationMap[keyName];
    if (target && 'pathname' in target) {
      router.push(target.pathname);
    } else if (target && 'screen' in target) {
      setShowModal(true);
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
        {categories.map((item: Asset) => (
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

        {/* Menu All */}
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

      {/* Modal All Services */}
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
              {popularServices.map((item: Asset) => (
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