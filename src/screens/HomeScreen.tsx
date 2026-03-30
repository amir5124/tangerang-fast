import React, { useCallback, useEffect, useState } from 'react';
import {
    Image,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { MenuGrid } from '../../src/components/home/MenuGrid';
import api from '../../src/utils/api';
import { BannerSlider } from '../components/home/BannerSlider';

const IMAGE_BASE_URL = 'https://backend.tangerangfast.online';

interface PromoState {
  image: string | null;
  title: string;
  description: string;
}

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [promoData, setPromoData] = useState<PromoState>({
    image: null,
    title: 'Promo Spesial',
    description: 'Memuat promo terbaru untukmu...',
  });

  const fetchPromoAssets = async () => {
    try {
      const response = await api.get('/assets');
      const assets = response.data;

      if (Array.isArray(assets)) {
        const bannerPromo = assets.find(
          (a: any) => a.key_name === 'banner_promo',
        );

        if (bannerPromo) {
          setPromoData({
            image: (bannerPromo as any).image_url
              ? `${IMAGE_BASE_URL}${(bannerPromo as any).image_url}`
              : null,
            title: (bannerPromo as any).title || 'Rumah Nyaman, Dompet Aman!',
            description:
              (bannerPromo as any).description ||
              'Dapatkan layanan terbaik dari TangerangFast dengan harga spesial bulan ini.',
          });
        }
      }
    } catch (error) {
      console.error('Gagal mengambil data promo:', error);
    }
  };

  useEffect(() => {
    fetchPromoAssets();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPromoAssets();
    setRefreshing(false);
  }, []);

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#633594" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#633594']}
            tintColor="#633594"
          />
        }>
        <View style={styles.bannerWrapper}>
          <BannerSlider />
        </View>

        <View style={styles.mainContent}>
          <MenuGrid />
        </View>

        <View style={styles.promoSection}>
          <Text style={styles.sectionTitle}>Promo Spesial Untukmu</Text>

          <View style={styles.promoCard}>
            {promoData.image ? (
              <Image
                source={{uri: promoData.image}}
                style={styles.promoImageContent}
              />
            ) : (
              <View
                style={[styles.promoImageContent, {backgroundColor: '#f0f0f0'}]}
              />
            )}

            <View style={styles.promoTextContainer}>
              <Text style={styles.promoTitle}>{promoData.title}</Text>
              <Text style={styles.promoDescription}>
                {promoData.description}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#ffffff',
  },
  bannerWrapper: {
    width: '100%',
    backgroundColor: '#ffffff',
  },
  mainContent: {
    marginTop: 10,
  },
  promoSection: {
    paddingHorizontal: 20,
    marginTop: 0,
    paddingBottom: 80,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#633594',
    marginBottom: 15,
  },
  promoCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  promoImageContent: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  promoTextContainer: {
    padding: 15,
  },
  promoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  promoDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
