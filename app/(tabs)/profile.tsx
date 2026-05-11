import LogoutModal from '@/src/components/home/LogoutModal';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import API from '../../src/utils/api';
import { storage } from '../../src/utils/storage';

interface Transaction {
  amount: string | number;
  type: 'credit' | 'debit';
  description: string;
  created_at: string;
  is_withdraw?: boolean;
  status?: string;
}

interface WalletResponse {
  user: { id: string; name: string; role: string };
  wallet: { balance: number; transactions: Transaction[] };
}

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [walletData, setWalletData] = useState<WalletResponse | null>(null);

  const formatRupiah = (value: string | number) => {
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(numericValue || 0);
  };

  const BASE_URL = 'https://backend.tangerangfast.online';

  const fetchUserProfile = async () => {
    try {
      const response: any = await API.get('/auth/profile');

      if (response.data.success) {
        const userData = response.data.user;
        setUser(userData);
        // Pastikan menyimpan data terbaru ke storage agar sinkron dengan Edit Profile
        await storage.save('userData', JSON.stringify(userData));
      }
    } catch (error: any) {
      console.error('❌ Gagal ambil data dari DB:', error);
      const cached = await storage.get('userData');
      if (cached) {
        setUser(JSON.parse(cached));
        console.log('📦 Using cached data instead.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchWalletData = async () => {
    try {
      const response = await API.get('/balance');
      if (response.data.success) {
        setWalletData(response.data.data);
      }
    } catch (error) {
      console.error('Gagal memuat data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
      fetchWalletData();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserProfile();
  };

  const logoutAction = async () => {
    try {
      const fcmToken = await storage.get('fcmToken');
      await API.post('/auth/logout', { fcm_token: fcmToken });
    } catch (error) {
      console.log('Logout error bypass...');
    } finally {
      await storage.delete('userToken');
      await storage.delete('userData');
      router.replace('/(auth)/login');
    }
  };

  const handleWhatsApp = async () => {
    const phoneNumber = '628211074757';
    const message =
      'Halo Admin, saya butuh bantuan terkait layanan TangerangFast.';
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      supported
        ? await Linking.openURL(url)
        : await Linking.openURL(`https://wa.me/${phoneNumber}`);
    } catch (error) {
      Alert.alert('Error', 'Tidak dapat membuka WhatsApp');
    }
  };

  const getProfileImage = () => {
    // 1. Cek jika data kosong atau string "null"
    if (
      !user?.profile_picture ||
      user.profile_picture === 'null' ||
      user.profile_picture === ''
    ) {
      return {
        uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          user?.full_name || 'User',
        )}&background=633594&color=fff&size=256`,
      };
    }

    const path = user.profile_picture;

    // 2. Jika URL sudah lengkap (http/https)
    if (path.startsWith('http')) {
      return { uri: path.replace('http://', 'https://') };
    }

    // 3. Logika Pintar untuk Path Relatif
    // Kita cek apakah path sudah mengandung kata 'uploads/profiles'
    const hasFolder = path.includes('uploads/profiles');

    // Hilangkan slash di awal agar tidak terjadi double slash saat digabung BASE_URL
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;

    let finalUri = '';
    if (hasFolder) {
      // Jika di DB sudah ada folder 'uploads/profiles/...'
      finalUri = `${BASE_URL}/${cleanPath}`;
    } else {
      // Jika di DB hanya nama filenya saja 'foto.jpg'
      finalUri = `${BASE_URL}/uploads/profiles/${cleanPath}`;
    }

    // Debugging: Muncul di console log untuk cek URL mana yang salah
    // console.log("Final Profile URI:", finalUri);

    return { uri: finalUri };
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#633594" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.mainWrapper}>
      <View style={styles.customHeader}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profil Saya</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#633594']}
          />
        }>
        <View style={styles.heroSection}>
          <View style={styles.avatarWrapper}>
            <Image source={getProfileImage()} style={styles.avatar} />
            <TouchableOpacity
              style={styles.editBadge}
              onPress={() => router.push('/edit-profile')}>
              <Ionicons name="pencil" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.userNameText}>{user?.full_name || 'User'}</Text>
        </View>

        <View style={styles.infoCard}>
          <InfoItem
            icon="call"
            label="Nomor Telepon"
            value={user?.phone_number || '-'}
          />
          <View style={styles.infoDivider} />
          <InfoItem
            icon="mail"
            label="Alamat Email"
            value={user?.email || '-'}
          />
        </View>

        <View style={styles.fullStatsContainer}>
          <TouchableOpacity
            onPress={() => router.push('/balance')}
            style={styles.wideStatItem}
            activeOpacity={0.8}>
            <View style={styles.statIconCircle}>
              <Ionicons name="wallet-outline" size={20} color="#633594" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.wideStatLabel}>Saldo Wallet</Text>
              <Text style={styles.wideStatValue}>
                {walletData ? formatRupiah(walletData.wallet.balance) : 'Rp 0'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        <View style={styles.menuGroup}>
          <Text style={styles.groupLabel}>Aktivitas & Keamanan</Text>

          <MenuItem
            icon="person-outline"
            label="Edit Profil"
            onPress={() => router.push('/edit-profile')}
          />
          <MenuItem
            icon="time-outline"
            label="Riwayat Transaksi"
            onPress={() => router.push('/(tabs)/riwayat')}
          />
          <MenuItem
            icon="shield-checkmark-outline"
            label="Ubah Password"
            onPress={() => router.push('/change-password')}
          />
          <MenuItem
            icon="help-buoy-outline"
            label="Pusat Bantuan"
            onPress={handleWhatsApp}
          />

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => setIsModalOpen(true)}>
            <Ionicons name="log-out-outline" size={22} color="#FF3B30" />
            <Text style={styles.logoutText}>Keluar dari Akun</Text>
          </TouchableOpacity>

          <LogoutModal
            visible={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onConfirm={logoutAction}
          />
        </View>

        <Text style={styles.versionText}>TangerangFast • v1.1.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Sub-komponen tetap sama
const InfoItem = ({ icon, label, value }: any) => (
  <View style={styles.infoItem}>
    <View style={styles.iconCircle}>
      <Ionicons name={icon} size={18} color="#633594" />
    </View>
    <View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const MenuItem = ({ icon, label, onPress }: any) => (
  <TouchableOpacity
    style={styles.menuItem}
    activeOpacity={0.6}
    onPress={onPress}>
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
  mainWrapper: { flex: 1, backgroundColor: '#FFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  customHeader: {
    backgroundColor: '#FFF',
    // Gunakan border yang sangat tipis
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',

    // --- SHADOW UNTUK IOS ---
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, // Tipis saja agar tidak kotor
    shadowRadius: 2,

    // --- SHADOW UNTUK ANDROID ---
    // Elevation 2 atau 3 sudah cukup.
    // Jika terlalu tinggi, bayangan Android terlihat "patah"
    elevation: 2,
  },
  headerContent: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    justifyContent: 'space-between',
  },
  backButton: { padding: 5 },
  headerTitle: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
    marginRight: 10,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#FFF',
  },
  avatarWrapper: { position: 'relative', marginBottom: 15 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#F8FAFC',
    backgroundColor: '#F1F5F9',
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
  infoCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 5,
  },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3E5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginTop: 2 },
  infoDivider: { height: 1, backgroundColor: '#F8FAFC', marginVertical: 15 },
  menuGroup: { paddingHorizontal: 20, marginTop: 30, backgroundColor: '#FFF' },
  groupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  menuIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#334155' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 40,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFF1F0',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#FF3B30' },
  fullStatsContainer: { paddingHorizontal: 20, marginTop: 25 },
  wideStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  wideStatLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  wideStatValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#633594',
    marginTop: 2,
  },
  versionText: {
    textAlign: 'center',
    color: '#CBD5E1',
    fontSize: 11,
    marginTop: 40,
    fontWeight: '500',
  },
});
