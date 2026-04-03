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
  View,
} from 'react-native';
import API from '../../src/utils/api';
import { storage } from '../../src/utils/storage';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const rawData = await storage.get('userData');
      if (rawData) {
        const parsedData =
          typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        setUser(parsedData);
      }
    } catch (error) {
      console.error('❌ Gagal memuat profil:', error);
    } finally {
      setLoading(false);
    }
  };

  const logoutAction = async () => {
    try {
      // 1. Ambil fcm_token sebelum dihapus untuk dikirim ke backend (opsional tapi disarankan)
      const fcmToken = await storage.get('fcmToken');

      // 2. Beritahu server bahwa user ini logout
      await API.post('/auth/logout', {fcm_token: fcmToken});
    } catch (error) {
      // Kita tetap lanjut menghapus storage lokal meskipun request server gagal
      console.log('⚠️ Logout server skip atau token sudah tidak valid');
    } finally {
      // 3. HAPUS SEMUA DATA SESI (Token Auth, Data User, dan FCM Token)
      // Ini memastikan saat login lagi, aplikasi mencari token FCM yang BARU
      await storage.delete('userToken');
      await storage.delete('userData');
      await storage.delete('fcmToken'); // <--- TAMBAHKAN INI (Sangat Penting)

      // 4. Arahkan kembali ke halaman login
      router.replace('/(auth)/login');
    }
  };

  const handleLogout = () => {
    setIsModalOpen(true);
  };

  const confirmLogout = () => {
    setIsModalOpen(false);
    logoutAction();
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
      {/* <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Profil Saya</Text>
        <TouchableOpacity style={styles.navBtn}>
          <Ionicons name="settings-outline" size={24} color="#1E293B" />
        </TouchableOpacity>
      </View> */}

      <View style={styles.customHeader}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profil Saya</Text>
          <View style={{width: 40}} />
        </View>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.avatarWrapper}>
            <Image
              source={{
                uri: `https://ui-avatars.com/api/?name=${user?.full_name}&background=633594&color=fff&size=128`,
              }}
              style={styles.avatar}
            />
            <TouchableOpacity style={styles.editBadge}>
              <Ionicons name="camera" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.userNameText}>
            {user?.full_name || 'User TangerangFast'}
          </Text>
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
            <View style={{flex: 1}}>
              <Text style={styles.wideStatLabel}>Saldo Wallet</Text>
              <Text style={styles.wideStatValue}>Rp 0</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* Menu Section */}
        <View style={styles.menuGroup}>
          <Text style={styles.groupLabel}>Aktivitas & Keamanan</Text>
          <MenuItem icon="time-outline" label="Riwayat Transaksi" />
          <MenuItem icon="shield-checkmark-outline" label="Ubah Password" />
          <MenuItem icon="help-buoy-outline" label="Pusat Bantuan" />

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout} // Memanggil handleLogout yang baru
            activeOpacity={0.7}>
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
        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const MenuItem = ({icon, label}: any) => (
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
  // 1. mainWrapper diubah menjadi warna off-white modern (bukan murni fff)
  mainWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // 2. container (latar halaman scroll) diubah menjadi putih murni
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },

  customHeader: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9', // Warna abu-abu sangat muda agar elegan

    // --- SHADOW UNTUK IOS ---
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,

    // --- SHADOW UNTUK ANDROID ---
    elevation: 3,
  },
  headerContent: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    justifyContent: 'space-between',
  },
  backButton: {padding: 5},
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
    // Border radius dihapus atau dikurangi jika ingin look yang lebih clean menyatu dengan bg putih
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
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
    borderColor: '#F8FAFC',
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
  userNameText: {fontSize: 22, fontWeight: '800', color: '#1E293B'},

  infoCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginTop: 0, // Dinetralkan karena heroSection sudah putih
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    // Shadow dibuat sangat soft
    shadowColor: '#633594',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  infoItem: {flexDirection: 'row', alignItems: 'center', gap: 15},
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12, // Dibuat kotak tumpul lebih modern dari lingkaran penuh
    backgroundColor: '#F3E5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {fontSize: 12, color: '#94A3B8', fontWeight: '500'},
  infoValue: {fontSize: 14, fontWeight: '600', color: '#1E293B', marginTop: 2},
  infoDivider: {height: 1, backgroundColor: '#F8FAFC', marginVertical: 15},

  menuGroup: {
    paddingHorizontal: 20,
    marginTop: 30,
    backgroundColor: '#FFF',
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 15,
    textTransform: 'uppercase', // Gaya modern
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16, // Lebih lega
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  menuLeft: {flexDirection: 'row', alignItems: 'center', gap: 15},
  menuIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {fontSize: 15, fontWeight: '600', color: '#334155'},

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 40,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFF1F0', // Tetap soft red untuk warning
  },
  logoutText: {fontSize: 15, fontWeight: '700', color: '#FF3B30'},

  fullStatsContainer: {
    paddingHorizontal: 20,
    marginTop: 25,
  },
  wideStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC', // Kontras tipis dengan background putih utama
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
    elevation: 1,
  },
  wideStatLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
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
