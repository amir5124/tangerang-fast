import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Shimmer } from '../../components/home/Shimmer';

const { width: PAGE_WIDTH } = Dimensions.get('window');

interface BannerShimmerProps {
    height?: number;
}

export const BannerShimmer = ({ height = 220 }: BannerShimmerProps) => {
    return (
        <View style={styles.container}>
            {/* Banner Image Shimmer */}
            <Shimmer style={{ width: PAGE_WIDTH, height: height }} />

            {/* Dots Shimmer */}
            <View style={styles.dotRow}>
                {[1, 2, 3].map(i => (
                    <View key={i} style={styles.dotWrapper}>
                        <Shimmer style={styles.dot} />
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        width: PAGE_WIDTH,
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
    dotWrapper: {
        marginHorizontal: 4,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E1E9EE',
    },
});