import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import API from '../../utils/api';
import { BannerShimmer } from './BannerShimmer';

interface BannerData {
  id: number;
  image_url: string;
  key_name: string;
  category: string;
  display_name?: string | null;
}

export const BannerSlider = () => {
  const { width: PAGE_WIDTH } = useWindowDimensions();
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerHeight, setContainerHeight] = useState(220);

  const scrollViewRef = useRef<ScrollView>(null);
  const autoPlayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTouching = useRef(false);

  const fetchBanners = async () => {
    try {
      setIsLoading(true);
      const response = await API.get('/assets');
      const BASE_URL = 'https://backend.tangerangfast.online';

      // Filter banner dan ambil hanya 5 data pertama
      const allBanners = response.data
        .filter(
          (item: BannerData) =>
            item.category === 'banner' ||
            (item.key_name && item.key_name.toLowerCase().includes('banner'))
        )
        .sort((a: BannerData, b: BannerData) => a.id - b.id)
        .map((item: BannerData) => ({
          ...item,
          image_url: item.image_url.startsWith('http')
            ? item.image_url
            : `${BASE_URL}${item.image_url}`,
        }));

      // Ambil hanya 5 banner pertama
      const formattedData = allBanners.slice(0, 5);



      setBanners(formattedData);

      if (formattedData.length > 0) {
        Image.getSize(formattedData[0].image_url, (width, height) => {
          const aspectRatio = height / width;
          const calculatedHeight = PAGE_WIDTH * aspectRatio;
          setContainerHeight(calculatedHeight);
        });
      }

    } catch (error) {
      console.error('Error Fetch Banners:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // Update height ketika width berubah
  useEffect(() => {
    if (banners.length > 0 && banners[0]?.image_url) {
      Image.getSize(banners[0].image_url, (width, height) => {
        const aspectRatio = height / width;
        const calculatedHeight = PAGE_WIDTH * aspectRatio;
        setContainerHeight(calculatedHeight);
      });
    }
  }, [PAGE_WIDTH, banners]);

  // Reset ke index 0 jika banners berubah
  useEffect(() => {
    if (banners.length > 0) {
      setActiveIndex(0);
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: 0, animated: false });
      }
    }
  }, [banners]);

  useEffect(() => {
    if (banners.length > 1 && !isTouching.current) {
      startAutoPlay();
    }
    return () => stopAutoPlay();
  }, [activeIndex, banners.length]);

  const startAutoPlay = () => {
    stopAutoPlay();
    autoPlayTimer.current = setInterval(() => {
      if (!isTouching.current && banners.length > 0) {
        let nextIndex = activeIndex + 1;
        if (nextIndex >= banners.length) {
          nextIndex = 0; // Kembali ke awal setelah slide terakhir
        }

        scrollViewRef.current?.scrollTo({
          x: nextIndex * PAGE_WIDTH,
          animated: true,
        });

        setActiveIndex(nextIndex);
      }
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
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / slideSize);

    if (index !== activeIndex && index >= 0 && index < banners.length) {
      setActiveIndex(index);
    }
  };

  const onTouchStart = () => {
    isTouching.current = true;
    stopAutoPlay();
  };

  const onTouchEnd = () => {
    isTouching.current = false;
    startAutoPlay();
  };

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / slideSize);

    if (index !== activeIndex && index >= 0 && index < banners.length) {
      setActiveIndex(index);
    }
  };

  if (isLoading) {
    return <BannerShimmer height={containerHeight} />;
  }

  if (banners.length === 0) return null;

  return (
    <View style={[styles.container, { height: containerHeight }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        decelerationRate="fast"
        automaticallyAdjustContentInsets={false}>
        {banners.map((item, index) => (
          <View key={item.id.toString()} style={[styles.slide, { width: PAGE_WIDTH }]}>
            <Image
              source={{ uri: item.image_url }}
              style={{
                width: PAGE_WIDTH,
                height: containerHeight,
                resizeMode: 'cover'
              }}
              onError={(e) => console.log(`Error loading banner ${item.id}:`, e.nativeEvent.error)}
            />
          </View>
        ))}
      </ScrollView>

      {/* Dots Indicator - hanya tampil jika banner lebih dari 1 */}
      {banners.length > 1 && (
        <View style={styles.dotRow}>
          {banners.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                activeIndex === i ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  slide: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 24,
    backgroundColor: '#FFFFFF',
  },
  inactiveDot: {
    width: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
});