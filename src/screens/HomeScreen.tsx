import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions, // Tambahkan ini
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

interface Review {
  review_id: number;
  full_name: string;
  profile_picture: string | null;
  rating: number;
  comment: string;
  store_name?: string;
}

interface Voucher {
  id: number;
  code: string;
  description: string;
  image_url: string;
  discount_type: string;
  discount_percent: number;
  max_discount_amount: string;
  min_purchase: string;
  is_active: number;
  usage_limit: number;
  expired_at: string | null;
  created_at: string;
}

export default function HomeScreen() {
  const { width: screenWidth } = useWindowDimensions(); // Untuk responsive

  // Hitung dimensi responsive
  const CARD_WIDTH = screenWidth * 0.55 + 15;
  const VOUCHER_CARD_WIDTH = screenWidth * 0.90;
  const PADDING_LEFT = 20;
  const VOUCHER_CARD_MARGIN = 12;
  const VOUCHER_ITEM_WIDTH = VOUCHER_CARD_WIDTH + VOUCHER_CARD_MARGIN;
  const RIGHT_PADDING = screenWidth - VOUCHER_CARD_WIDTH;

  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [voucherIndex, setVoucherIndex] = useState(0);
  const [promoData, setPromoData] = useState<PromoState>({
    image: null,
    title: 'Promo Spesial',
    description: 'Memuat promo terbaru untukmu...',
  });

  const scrollRef = useRef<ScrollView>(null);
  const voucherScrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset scroll position when screen width changes
  useEffect(() => {
    if (scrollRef.current && reviews.length > 0) {
      scrollRef.current.scrollTo({
        x: currentIndex * CARD_WIDTH,
        animated: false,
      });
    }
  }, [screenWidth, currentIndex, reviews.length, CARD_WIDTH]);

  useEffect(() => {
    if (voucherScrollRef.current && vouchers.length > 0) {
      voucherScrollRef.current.scrollTo({
        x: voucherIndex * VOUCHER_ITEM_WIDTH,
        animated: false,
      });
    }
  }, [screenWidth, voucherIndex, vouchers.length, VOUCHER_ITEM_WIDTH]);

  const fetchReviews = async () => {
    try {
      const response = await api.get('/reviews/latest-all');
      if (response.data.success) {
        const data: Review[] = response.data.latest_comments || [];
        const uniqueData = data.filter((v, i, a) =>
          a.findIndex(t => t.review_id === v.review_id) === i
        );
        setReviews(uniqueData);
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

  const fetchVouchers = async () => {
    try {
      const res = await api.get('/voucher');


      const allVouchers = res.data.data || [];

      // 2. FILTER HANYA VOUCHER YANG AKTIF (is_active === 1)
      const activeVouchers = allVouchers.filter((voucher: Voucher) => voucher.is_active === 1);


      setVouchers(activeVouchers);

    } catch (error) {
      // 4. LOG JIKA API MENGALAMI ERROR/DOWN

    }
  };

  useEffect(() => {
    fetchPromoAssets();
    fetchReviews();
    fetchVouchers();
  }, []);

  // Auto Slide Review
  useEffect(() => {
    if (reviews.length > 0) {
      const interval = setInterval(() => {
        let nextIndex = currentIndex + 1;
        if (nextIndex >= reviews.length) {
          nextIndex = 0;
        }
        scrollRef.current?.scrollTo({
          x: nextIndex * CARD_WIDTH,
          animated: true,
        });
        setCurrentIndex(nextIndex);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [currentIndex, reviews.length, CARD_WIDTH]);

  // Auto Slide Voucher
  useEffect(() => {
    if (vouchers.length > 0) {
      const interval = setInterval(() => {
        const nextIndex = (voucherIndex + 1) % vouchers.length;
        voucherScrollRef.current?.scrollTo({
          x: nextIndex * VOUCHER_ITEM_WIDTH,
          animated: true,
        });
        setVoucherIndex(nextIndex);
      }, 3500);

      return () => clearInterval(interval);
    }
  }, [voucherIndex, vouchers.length, VOUCHER_ITEM_WIDTH]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchPromoAssets(), fetchReviews(), fetchVouchers()]);
    setCurrentIndex(0);
    setVoucherIndex(0);
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
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reviewScroll}
              onMomentumScrollEnd={(e) => {
                const contentOffset = e.nativeEvent.contentOffset.x;
                const newIndex = Math.round(contentOffset / CARD_WIDTH);
                setCurrentIndex(newIndex);
              }}
            >
              {reviews.map((item) => (
                <View key={item.review_id} style={[styles.reviewCard, { width: screenWidth * 0.55 }]}>
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
                      "{item.comment}"
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* --- SECTION VOUCHER SLIDER MODERN --- */}
        {vouchers.length > 0 && (
          <View style={styles.voucherSection}>
            <Text style={styles.sectionTitle}>Promo Spesial Untukmu</Text>

            <ScrollView
              ref={voucherScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={VOUCHER_ITEM_WIDTH}
              decelerationRate="fast"
              snapToAlignment="start"
              disableIntervalMomentum={true}
              contentContainerStyle={[styles.contentContainer, { paddingRight: RIGHT_PADDING }]}
              onMomentumScrollEnd={(e) => {
                const contentOffset = e.nativeEvent.contentOffset.x;
                const newIndex = Math.round(contentOffset / VOUCHER_ITEM_WIDTH);
                setVoucherIndex(Math.max(0, Math.min(newIndex, vouchers.length - 1)));
              }}
            >
              {vouchers.map((item) => (
                <View key={item.id} style={[styles.voucherCard, { width: VOUCHER_CARD_WIDTH }]}>
                  <Image
                    source={{ uri: `${IMAGE_BASE_URL}${item.image_url}` }}
                    style={styles.voucherImage}
                    resizeMode="cover"
                  />
                </View>
              ))}
            </ScrollView>

            {/* Dots Indicator */}
            <View style={styles.dotsContainer}>
              {vouchers.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    voucherScrollRef.current?.scrollTo({
                      x: index * VOUCHER_ITEM_WIDTH,
                      animated: true,
                    });
                    setVoucherIndex(index);
                  }}
                  style={[
                    styles.dot,
                    index === voucherIndex ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>
          </View>
        )}

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
  reviewSection: {
    marginTop: 0,
    marginBottom: 10,
  },
  reviewScroll: {
    paddingLeft: 20,
    paddingRight: 10,
    paddingTop: 35,
    paddingBottom: 15,
  },
  reviewCard: {
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
    top: -35,
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
    marginTop: 35,
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

  // ---- Voucher Section ----
  voucherSection: {
    marginTop: 10,
    paddingBottom: 30,
  },
  contentContainer: {
    paddingLeft: 20,
    paddingBottom: 10,
  },
  voucherCard: {
    marginRight: 12,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    backgroundColor: '#fff',
  },
  voucherImage: {
    width: '100%',
    aspectRatio: 5 / 3,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginTop: 12,
    paddingLeft: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotActive: {
    width: 20,
    backgroundColor: '#633594',
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#D0B8E8',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#633594',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
});