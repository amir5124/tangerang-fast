import React from 'react';
import { StyleSheet, View } from 'react-native';
// UBAH BAGIAN INI: Hilangkan kurung kurawal pada ShimmerPlaceholder
import { LinearGradient } from 'expo-linear-gradient';
import ShimmerPlaceholder from 'expo-shimmer-placeholder';

export const ServiceCardSkeleton = () => {
    return (
        <View style={styles.card}>
            <View style={styles.rowBetween}>
                {/* Gunakan langsung ShimmerPlaceholder dengan prop LinearGradient */}
                <ShimmerPlaceholder
                    LinearGradient={LinearGradient}
                    style={styles.shimmerTitle}
                />
                <ShimmerPlaceholder
                    LinearGradient={LinearGradient}
                    style={styles.shimmerBadge}
                />
            </View>

            <View style={styles.mainContent}>
                <View style={styles.leftContent}>
                    <ShimmerPlaceholder LinearGradient={LinearGradient} style={styles.shimmerPrice} />
                    <ShimmerPlaceholder LinearGradient={LinearGradient} style={styles.shimmerText} />
                    <ShimmerPlaceholder LinearGradient={LinearGradient} style={styles.shimmerEstimation} />
                </View>

                <View style={styles.rightContent}>
                    <ShimmerPlaceholder LinearGradient={LinearGradient} style={styles.shimmerImage} />
                    <ShimmerPlaceholder LinearGradient={LinearGradient} style={styles.shimmerButton} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: { backgroundColor: '#fff', padding: 15, borderBottomWidth: 1, borderColor: '#eee', marginBottom: 5 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    shimmerTitle: { width: '40%', height: 20, borderRadius: 4 },
    shimmerBadge: { width: 60, height: 20, borderRadius: 12 },
    mainContent: { flexDirection: 'row' },
    leftContent: { flex: 1.5 },
    rightContent: { flex: 1, alignItems: 'flex-end' },
    shimmerPrice: { width: '80%', height: 18, marginBottom: 10, borderRadius: 4 },
    shimmerText: { width: '90%', height: 12, marginBottom: 6, borderRadius: 4 },
    shimmerEstimation: { width: '70%', height: 12, marginTop: 15, borderRadius: 4 },
    shimmerImage: { width: 100, height: 70, borderRadius: 12, marginBottom: 10 },
    shimmerButton: { width: 80, height: 35, borderRadius: 8 }
});