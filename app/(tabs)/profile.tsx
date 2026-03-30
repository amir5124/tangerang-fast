import LogoutModal from '@/src/components/home/LogoutModal';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import API from '../../src/utils/api';
import { storage } from '../../src/utils/storage';

export default function ProfileScreen() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

    useEffect(() => { loadUserData(); }, []);

    const loadUserData = async () => {
        try {
            const rawData = await storage.get('userData');
            if (rawData) {
                const parsedData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
                setUser(parsedData);
            }
        } catch (error) { console.error("❌ Gagal memuat profil:", error); }
        finally { setLoading(false); }
    };

    const logoutAction = async () => {
        try { await API.post('/auth/logout'); }
        catch (error) { console.log("⚠️ Logout server skip"); }
        finally {
            await storage.delete('userToken');
            await storage.delete('userData');
            router.replace('/(auth)/login');
        }
    };

    const handleLogout = () => {
        setIsModalOpen(true);
    };

    // 3. Fungsi eksekusi final saat klik "Ya, Keluar!" di dalam modal
    const confirmLogout = () => {
        setIsModalOpen(false); // Tutup modal dulu
        logoutAction();       // Jalankan fungsi logout kamu (hapus token, dll)
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#633594" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.mainWrapper}>


            {/* Header Navbar */}
            <View style={styles.navbar}>
                <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.navTitle}>Profil Saya</Text>
                <TouchableOpacity style={styles.navBtn}>
                    <Ionicons name="settings-outline" size={24} color="#1E293B" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

                {/* Profile Hero Section */}
                <View style={styles.heroSection}>
                    <View style={styles.avatarWrapper}>
                        <Image
                            source={{ uri: `https://ui-avatars.com/api/?name=${user?.full_name}&background=633594&color=fff&size=128` }}
                            style={styles.avatar}
                        />
                        <TouchableOpacity style={styles.editBadge}>
                            <Ionicons name="camera" size={16} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.userNameText}>{user?.full_name || 'User TangerangFast'}</Text>

                </View>

                {/* Info Card */}
                <View style={styles.infoCard}>
                    <View style={styles.infoItem}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="call" size={18} color="#633594" />
                        </View>
                        <View>
                            <Text style={styles.infoLabel}>Nomor Telepon</Text>
                            <Text style={styles.infoValue}>{user?.phone_number || '-'}</Text>
                        </View>
                    </View>
                    <View style={styles.infoDivider} />
                    <View style={styles.infoItem}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="mail" size={18} color="#633594" />
                        </View>
                        <View>
                            <Text style={styles.infoLabel}>Alamat Email</Text>
                            <Text style={styles.infoValue}>{user?.email || '-'}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.fullStatsContainer}>
                    <TouchableOpacity style={styles.wideStatItem} activeOpacity={0.8}>
                        <View style={styles.statIconCircle}>
                            <Ionicons name="wallet-outline" size={20} color="#633594" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.wideStatLabel}>Saldo Wallet</Text>
                            <Text style={styles.wideStatValue}>Rp 0</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                    </TouchableOpacity>


                </View>

                {/* Menu Section */}
                <View style={styles.menuGroup}>
                    <Text style={styles.groupLabel}>Aktivitas & Keamanan</Text>
                    <MenuItem icon="heart-outline" label="Favorit Saya" />
                    <MenuItem icon="time-outline" label="Riwayat Transaksi" />
                    <MenuItem icon="shield-checkmark-outline" label="Ubah Password" />
                    <MenuItem icon="help-buoy-outline" label="Pusat Bantuan" />

                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={handleLogout} // Memanggil handleLogout yang baru
                        activeOpacity={0.7}
                    >
                        <Ionicons name="log-out-outline" size={22} color="#FF3B30" />
                        <Text style={styles.logoutText}>Keluar dari Akun</Text>
                    </TouchableOpacity>

                    {/* Letakkan Modal di sini */}
                    <LogoutModal
                        visible={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        onConfirm={confirmLogout} // Memanggil fungsi eksekusi logout
                    />
                </View>

                <Text style={styles.versionText}>TangerangFast • v1.1.0</Text>
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const MenuItem = ({ icon, label }: any) => (
    <TouchableOpacity style={styles.menuItem} activeOpacity={0.6}>
        <View style={styles.menuLeft}>
            <View style={styles.menuIconBg}>
                <Ionicons name={icon} size={20} color="#633594" />
            </View>
            <Text style={styles.menuLabel}>{label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    mainWrapper: { flex: 1, backgroundColor: '#F8FAFC' },
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },

    navbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 6,
        backgroundColor: '#FFF',
        // --- BORDER (Work on Android & iOS) ---
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9', // Warna abu-abu sangat muda agar elegan

        // --- SHADOW UNTUK IOS ---
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,

        // --- SHADOW UNTUK ANDROID ---
        elevation: 3,
    },
    navTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    navBtn: { padding: 8, borderRadius: 10 },

    heroSection: {
        alignItems: 'center',
        paddingVertical: 30,
        backgroundColor: '#FFF',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 15,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: '#F1F5F9',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#633594',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFF',
    },
    userNameText: { fontSize: 22, fontWeight: '800', color: '#1E293B' },
    badgeRole: {
        backgroundColor: '#F3E5F5',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        marginTop: 6,
    },
    userRoleText: { fontSize: 10, fontWeight: '800', color: '#633594', letterSpacing: 1 },

    infoCard: {
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        marginTop: -15,
        borderRadius: 20,
        padding: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
    },
    infoItem: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3E5F5',
        justifyContent: 'center',
        alignItems: 'center'
    },
    infoLabel: { fontSize: 12, color: '#94A3B8' },
    infoValue: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
    infoDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 15 },

    statsGrid: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 15,
        marginTop: 20
    },
    statItem: {
        flex: 1,
        backgroundColor: '#FFF',
        padding: 15,
        borderRadius: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    statValue: { fontSize: 18, fontWeight: '800', color: '#633594' },
    statLabel: { fontSize: 12, color: '#64748B', marginTop: 2 },

    menuGroup: { paddingHorizontal: 20, marginTop: 25 },
    groupLabel: { fontSize: 14, fontWeight: '700', color: '#94A3B8', marginBottom: 10, marginLeft: 5 },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    menuIconBg: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center'
    },
    menuLabel: { fontSize: 15, fontWeight: '600', color: '#1E293B' },

    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: 30,
        padding: 15,
        borderRadius: 15,
        backgroundColor: '#FFF1F0',
    },
    logoutText: { fontSize: 15, fontWeight: '700', color: '#FF3B30' },
    fullStatsContainer: {
        paddingHorizontal: 20,
        marginTop: 20,
        gap: 12, // Memberikan jarak antar box statistik
    },
    wideStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        // Efek bayangan halus
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
    },
    statIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F3E5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    wideStatLabel: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
    },
    wideStatValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
        marginTop: 2,
    },
    versionText: { textAlign: 'center', color: '#CBD5E1', fontSize: 11, marginTop: 40 }
});