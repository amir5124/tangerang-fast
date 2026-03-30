import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const BalanceCard = ({ saldo }: { saldo: string }) => {
    return (
        <View style={styles.container}>
            {/* Area Saldo Putih */}
            <View style={styles.balanceInfo}>
                <Ionicons name="wallet" size={24} color="#633594" />
                <Text style={styles.balanceText}>Rp {saldo}</Text>
            </View>

            {/* Area Tombol Aksi */}
            <View style={styles.actionContainer}>
                <ActionItem icon="add-circle-outline" label="Topup" />
                <ActionItem icon="arrow-down-circle-outline" label="Withdraw" />
                <ActionItem icon="phone-portrait-outline" label="PPOB" />
            </View>
        </View>
    );
};

const ActionItem = ({ icon, label }: { icon: any, label: string }) => (
    <TouchableOpacity style={styles.actionItem}>
        <Ionicons name={icon} size={24} color="#fff" />
        <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#28a745', // Warna hijau sesuai gambar
        marginHorizontal: 15,
        borderRadius: 15,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: -15, // Menumpuk di atas banner
        elevation: 5,
    },
    balanceInfo: {
        backgroundColor: '#fff',
        paddingVertical: 15,
        paddingHorizontal: 10,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1.2,
    },
    balanceText: { fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
    actionContainer: { flexDirection: 'row', flex: 2, justifyContent: 'space-around' },
    actionItem: { alignItems: 'center' },
    actionLabel: { color: '#fff', fontSize: 12, marginTop: 4 }
});