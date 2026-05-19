import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions, // Ganti dengan ini
} from 'react-native';
import API from '../../utils/api';
import { BannerShimmer } from './BannerShimmer';

interface BannerData {
  id: number;
  image_url: string;
  key_name: string;
  category: string;
}

export const BannerSlider = () => {
  const { width: PAGE_WIDTH } = useWindowDimensions(); // Hook untuk mendapatkan width dinamis
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerHeight, setContainerHeight] = useState(220);

  const scrollViewRef = useRef<ScrollView>(null);
  const autoPlayTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBanners = async () => {
    try {
      setIsLoading(true);
      const response = await API.get('/assets');
      const BASE_URL = 'https://backend.tangerangfast.online';

      const formattedData = response.data
        .filter(
          (item: BannerData) =>
            item.key_name && item.key_name.toLowerCase().includes('banner'),
        )
        .map((item: BannerData) => ({
          ...item,
          image_url: item.image_url.startsWith('http')
            ? item.image_url
            : `${BASE_URL}${item.image_url}`,
        }));

      setBanners(formattedData);

      // Get dimensions of first image to set container height
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

  // Update height ketika width berubah (device rotation)
  useEffect(() => {
    if (banners.length > 0 && banners[0]?.image_url) {
      Image.getSize(banners[0].image_url, (width, height) => {
        const aspectRatio = height / width;
        const calculatedHeight = PAGE_WIDTH * aspectRatio;
        setContainerHeight(calculatedHeight);
      });
    }
  }, [PAGE_WIDTH, banners]);

  // Reset scroll position when width changes
  useEffect(() => {
    if (scrollViewRef.current && banners.length > 0) {
      scrollViewRef.current.scrollTo({
        x: activeIndex * PAGE_WIDTH,
        animated: false,
      });
    }
  }, [PAGE_WIDTH, activeIndex, banners.length]);

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

  // Loading state
  if (isLoading) {
    return <BannerShimmer height={containerHeight} />;
  }

  // Empty state
  if (banners.length === 0) return null;

  // Actual banner slider
  return (
    <View style={[styles.container, { height: containerHeight }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onTouchStart={stopAutoPlay}
        onTouchEnd={startAutoPlay}
        decelerationRate="fast">
        {banners.map((item, index) => (
          <View key={item.id.toString()} style={[styles.slide, { width: PAGE_WIDTH }]}>
            <Image
              source={{ uri: item.image_url }}
              style={{ width: PAGE_WIDTH, height: containerHeight, resizeMode: 'cover' }}
            />
          </View>
        ))}
      </ScrollView>

      {/* Dots Indicator */}
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