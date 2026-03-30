import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
    item: {
        id: string | number;
        name: string;
        price: number; // Pastikan ini number
        image: string;
    };
    quantity: number;
    onAdd: () => void;
    onRemove: () => void;
}

export const ServiceOptionCard = ({ item, quantity, onAdd, onRemove }: Props) => {
    // PROTEKSI: Jika item atau item.price tidak ada, tampilkan 0 agar tidak crash
    const displayPrice = item?.price ? item.price.toLocaleString('id-ID') : '0';

    return (
        <View style={styles.card}>
            <Image
                source={{ uri: item?.image || 'https://via.placeholder.com/100' }}
                style={styles.image}
            />

            <View style={styles.info}>
                <Text style={styles.name}>{item?.name || 'Layanan'}</Text>
                {/* Gunakan variabel displayPrice yang sudah aman */}
                <Text style={styles.price}>Rp{displayPrice}</Text>
            </View>

            {quantity === 0 ? (
                <TouchableOpacity style={styles.btnAdd} onPress={onAdd}>
                    <Text style={styles.btnAddText}>TAMBAH</Text>
                    <Ionicons name="add" size={14} color="#22C55E" />
                </TouchableOpacity>
            ) : (
                <View style={styles.counter}>
                    <TouchableOpacity onPress={onRemove}>
                        <Ionicons name="remove-circle-outline" size={28} color="#633594" />
                    </TouchableOpacity>

                    <Text style={styles.qtyText}>{quantity}</Text>

                    <TouchableOpacity onPress={onAdd}>
                        <Ionicons name="add-circle" size={28} color="#633594" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderColor: '#eee',
        backgroundColor: '#fff'
    },
    image: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#f0f0f0' },
    info: { flex: 1, marginLeft: 12 },
    name: { fontWeight: 'bold', fontSize: 14, color: '#333' },
    price: { color: '#633594', fontWeight: 'bold', marginTop: 4, fontSize: 13 },
    btnAdd: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#22C55E',
        borderRadius: 6,
        flexDirection: 'row',
        alignItems: 'center'
    },
    btnAddText: { color: '#22C55E', fontWeight: 'bold', fontSize: 12 },
    counter: { flexDirection: 'row', alignItems: 'center' },
    qtyText: {
        marginHorizontal: 12,
        fontWeight: 'bold',
        fontSize: 16,
        minWidth: 20,
        textAlign: 'center'
    }
});