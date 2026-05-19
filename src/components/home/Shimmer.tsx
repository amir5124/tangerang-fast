import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

export const Shimmer = ({ style }: { style: ViewStyle | ViewStyle[] }) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[{ backgroundColor: '#E1E9EE', opacity: pulseAnim }, style]} />
  );
};