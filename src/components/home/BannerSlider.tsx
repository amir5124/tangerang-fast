import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import API from '../../utils/api'; // Pastikan path utilitas API Anda benar

const {width: PAGE_WIDTH} = Dimensions.get('window');

// Definisikan tipe data sesuai tabel app_assets
interface BannerData {
  id: number;
  image_url: string;
  key_name: string;
  category: string;
}

export const BannerSlider = () => {
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollViewRef = useRef<ScrollView>(null);
  const autoPlayTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- FETCH DATA DARI BACKEND ---
  const fetchBanners = async () => {
    try {
      setIsLoading(true);
      const response = await API.get('/assets');

      // Ganti dengan domain backend Anda
      const BASE_URL = 'https://backend.tangerangfast.online';

      const formattedData = response.data
        // 1. Filter berdasarkan key_name yang mengandung kata 'banner'
        // karena kolom category Anda saat ini masih null
        .filter(
          (item: BannerData) =>
            item.key_name && item.key_name.toLowerCase().includes('banner'),
        )
        // 2. Rakit URL gambar agar menjadi URL lengkap
        .map((item: BannerData) => ({
          ...item,
          image_url: item.image_url.startsWith('http')
            ? item.image_url
            : `${BASE_URL}${item.image_url}`,
        }));

      setBanners(formattedData);
    } catch (error) {
      console.error('Error Fetch Banners:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // --- LOGIKA AUTOPLAY ---
  useEffect(() => {
    if (banners.length > 0) {
      startAutoPlay();
    }
    return () => stopAutoPlay();
  }, [activeIndex, banners]);

  const startAutoPlay = () => {
    stopAutoPlay();
    autoPlayTimer.current = setInterval(() => {
      let nextIndex = activeIndex + 1;
      if (nextIndex >= banners.length) {
        nextIndex = 0;
      }

      scrollViewRef.current?.scrollTo({
        x: nextIndex * PAGE_WIDTH,
        animated: true,
      });
    }, 3500);
  };

  const stopAutoPlay = () => {
    if (autoPlayTimer.current) {
      clearInterval(autoPlayTimer.current);
      autoPlayTimer.current = null;
    }
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setActiveIndex(Math.round(index));
  };

  // Tampilkan loading jika data belum siap
  if (isLoading) {
    return (
      <View style={[styles.container, {justifyContent: 'center'}]}>
        <ActivityIndicator color="#633594" />
      </View>
    );
  }

  // Jika data kosong, sembunyikan slider
  if (banners.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onTouchStart={stopAutoPlay}
        onTouchEnd={startAutoPlay}
        style={styles.scrollView}>
        {banners.map(item => (
          <View key={item.id.toString()} style={styles.slide}>
            {/* Sesuaikan uri dengan kolom image_url dari database */}
            <Image source={{uri: item.image_url}} style={styles.image} />
          </View>
        ))}
      </ScrollView>

      <View style={styles.dotRow}>
        {banners.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              activeIndex === i ? styles.active : styles.inactive,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    // Menghilangkan paddingVertical jika ingin benar-benar menempel ke atas/bawah
    paddingVertical: 0,
  },
  scrollView: {width: PAGE_WIDTH},
  slide: {
    width: PAGE_WIDTH,
    paddingHorizontal: 0, // Width 100% tanpa jarak samping
  },
  image: {
    width: PAGE_WIDTH, // Menggunakan PAGE_WIDTH agar presisi
    height: 220, // Tinggi disesuaikan agar proporsional di layar lebar
    borderRadius: 0, // Radius dihilangkan
    resizeMode: 'cover',
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute', // Menaruh dots di atas gambar agar lebih hemat ruang
    bottom: 15, // Jarak dari bawah gambar
    width: '100%',
  },
  dot: {
    height: 4,
    borderRadius: 2,
    marginHorizontal: 3,
  },
  active: {
    width: 16,
    backgroundColor: '#fff', // Putih agar terlihat di atas gambar
  },
  inactive: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.5)', // Transparan putih
  },
});
