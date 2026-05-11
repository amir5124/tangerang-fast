import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
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

const { width } = Dimensions.get('window');
const IMAGE_BASE_URL = 'https://backend.tangerangfast.online';

interface PromoState {
  image: string | null;
  title: string;
  description: string;
}

interface Review {
  review_id: number;
  full_name: string;
  profile_picture: string | null;
  rating: number;
  comment: string;
  store_name?: string;
}

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [promoData, setPromoData] = useState<PromoState>({
    image: null,
    title: 'Promo Spesial',
    description: 'Memuat promo terbaru untukmu...',
  });

  const fetchReviews = async () => {
    try {
      const response = await api.get('/reviews/latest-all');
      console.log(response, "se")
      if (response.data.success) {
        setReviews(response.data.latest_comments || []);
      }
    } catch (error) {
      console.error('Gagal mengambil review terbaru:', error);
    }
  };

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
    fetchReviews();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchPromoAssets(), fetchReviews()]);
    setRefreshing(false);
  }, []);

  const RenderStars = ({ count }: { count: number }) => {
    return (
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((s) => (
          <Text key={s} style={[styles.star, { color: s <= count ? '#FFB400' : '#DDD' }]}>
            ★
          </Text>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
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

        {/* --- SECTION ULASAN TERBARU --- */}
        {reviews.length > 0 && (
          <View style={styles.reviewSection}>
            <Text style={styles.sectionTitle}>Apa Kata Mereka</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reviewScroll}
            >
              {reviews.map((item) => (
                <View key={item.review_id} style={styles.reviewCard}>
                  <View style={styles.profileContainer}>
                    <Image
                      source={
                        item.profile_picture
                          ? { uri: item.profile_picture.startsWith('http') ? item.profile_picture : `${IMAGE_BASE_URL}${item.profile_picture}` }
                          : { uri: 'https://res.cloudinary.com/dgsdmgcc7/image/upload/v1770898632/Salinan_LOGO_TF_1_s7xulh.png' }
                      }
                      style={styles.profileImage}
                    />
                  </View>
                  <View style={styles.reviewContent}>
                    <Text style={styles.customerName} numberOfLines={1}>{item.full_name}</Text>
                    <RenderStars count={item.rating} />
                    <Text style={styles.commentText} numberOfLines={3}>
                      “{item.comment}”
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.promoSection}>
          <Text style={styles.sectionTitle}>Promo Spesial Untukmu</Text>

          <View style={styles.promoCard}>
            {promoData.image ? (
              <Image
                source={{ uri: promoData.image }}
                style={styles.promoImageContent}
              />
            ) : (
              <View
                style={[styles.promoImageContent, { backgroundColor: '#f0f0f0' }]}
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
  // Style Baru untuk Review Section
  reviewSection: {
    marginTop: 0,
    marginBottom: 10,
  },
  reviewScroll: {
    paddingLeft: 20,
    paddingRight: 10,
    paddingTop: 35, // Ruang untuk foto yang nongol ke atas
    paddingBottom: 15,
  },
  reviewCard: {
    width: width * 0.55, // Lebar card 55% dari layar
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
    padding: 15,
    marginRight: 15,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  profileContainer: {
    position: 'absolute',
    top: -35, // Membuat foto menggantung di atas
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: '#ffffff',
    backgroundColor: '#e0e0e0',
    overflow: 'hidden',
    elevation: 5,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  reviewContent: {
    marginTop: 35, // Jarak agar teks tidak tertutup foto
    alignItems: 'center',
  },
  customerName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  starContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  star: {
    fontSize: 14,
    marginHorizontal: 1,
  },
  commentText: {
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  // Style Promo Tetap Sama
  promoSection: {
    paddingHorizontal: 20,
    marginTop: 10,
    paddingBottom: 80,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#633594',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  promoCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  promoImageContent: {
    width: '100%',
    aspectRatio: 16 / 9,
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