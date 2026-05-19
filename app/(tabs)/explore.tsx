import { FontAwesome, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Import sesuai utilitas proyek Anda
import API from '../../src/utils/api';
import { storage } from '../../src/utils/storage';

// Interface Gabungan
interface ChatItem {
  id: string | number;
  title: string;
  message: string;
  type: 'info' | 'promo' | 'order' | 'system';
  is_read: number;
  created_at: string;
  status_order?: string; // Khusus untuk tipe order
  is_order_data?: boolean; // Flag untuk membedakan data order asli vs notif biasa
  full_message?: string; // Untuk menyimpan pesan lengkap
}

const ExploreScreen: React.FC = () => {
  const router = useRouter();
  const [combinedChat, setCombinedChat] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Helper function untuk format tanggal (asumsi data sudah dalam WIB)
  const formatToWIB = (dateString: string, showTime: boolean = false) => {
    if (!dateString) return '';

    try {
      // Parse tanggal langsung, tanpa konversi timezone
      // Ganti spasi dengan T agar bisa diparse dengan baik
      let dateStr = dateString.replace(' ', 'T');
      let date = new Date(dateStr);

      // Cek apakah date valid
      if (isNaN(date.getTime())) {
        // Fallback: parse manual untuk format "2026-05-13 11:05:18"
        const parts = dateString.match(/(\d+)-(\d+)-(\d+)\s+(\d+):(\d+):(\d+)/);
        if (parts) {
          const [_, year, month, day, hour, minute, second] = parts;
          date = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hour),
            parseInt(minute),
            parseInt(second || '0')
          );
        }
      }

      if (showTime) {
        return date.toLocaleString('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jakarta'
        });
      }

      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        timeZone: 'Asia/Jakarta'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  // Helper function untuk sorting berdasarkan waktu
  const getTimeForSorting = (dateString: string) => {
    try {
      let dateStr = dateString.replace(' ', 'T');
      let date = new Date(dateStr);

      if (isNaN(date.getTime())) {
        const parts = dateString.match(/(\d+)-(\d+)-(\d+)\s+(\d+):(\d+):(\d+)/);
        if (parts) {
          const [_, year, month, day, hour, minute, second] = parts;
          date = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hour),
            parseInt(minute),
            parseInt(second || '0')
          );
        }
      }

      return date.getTime();
    } catch (error) {
      return 0;
    }
  };

  const handleWhatsApp = async () => {
    const phoneNumber = '628211074757';
    const message = 'Halo, saya butuh bantuan terkait aplikasi TangerangFast.';
    const encodedMessage = encodeURIComponent(message);

    // URL yang berbeda untuk tiap platform
    const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodedMessage}`;
    const webUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    if (Platform.OS === 'web') {
      // Di Web, langsung buka wa.me di tab baru
      window.open(webUrl, '_blank');
    } else {
      // Di Native, coba buka skema aplikasi dulu
      try {
        const supported = await Linking.canOpenURL(whatsappUrl);
        if (supported) {
          await Linking.openURL(whatsappUrl);
        } else {
          // Jika aplikasi WA tidak ada, buka wa.me di browser HP
          await Linking.openURL(webUrl);
        }
      } catch (err) {
        // Fallback terakhir jika terjadi error fatal
        Linking.openURL(webUrl);
      }
    }
  };

  // Fungsi untuk menandai chat sebagai sudah dibaca
  const markAsRead = async (chatId: string | number, type: string, isOrderData: boolean = false) => {
    try {
      if (!isOrderData) {
        // Untuk notifikasi biasa, panggil API update read status
        await API.put(`/notifications/read/${chatId}`);
      }
      // Update state lokal
      setCombinedChat(prevChat =>
        prevChat.map(chat =>
          chat.id === chatId ? { ...chat, is_read: 1 } : chat
        )
      );
    } catch (error) {
      console.error('Gagal menandai sebagai dibaca:', error);
    }
  };

  const handleChatPress = async (item: ChatItem) => {
    // Tandai sebagai sudah dibaca
    if (item.is_read === 0) {
      await markAsRead(item.id, item.type, item.is_order_data || false);

      // Update unread count di storage setelah menandai sebagai dibaca
      const updatedUnreadCount = combinedChat.filter(chat =>
        chat.id !== item.id && chat.is_read === 0
      ).length;
      await storage.save('unreadChatCount', updatedUnreadCount.toString());
    }
    // Tampilkan modal dengan pesan lengkap
    setSelectedChat(item);
    setModalVisible(true);
  };

  const loadAllData = async () => {
    try {
      // 1. Ambil data User
      const rawData = await storage.get('userData');
      if (!rawData) return;
      const parsedUser = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

      // 2. Ambil data dari dua controller berbeda secara paralel
      const [resNotif, resOrders] = await Promise.all([
        API.get(`/notifications/${parsedUser.id}`),
        API.get(`/orders/user/${parsedUser.id}`)
      ]);

      let formattedNotifs: ChatItem[] = [];
      let formattedOrders: ChatItem[] = [];

      // Format data dari tabel notifications (Broadcast/Info)
      if (resNotif.data.success) {
        formattedNotifs = resNotif.data.data.map((n: any) => ({
          ...n,
          is_order_data: false,
          full_message: n.message || n.title || 'Tidak ada pesan lengkap'
        }));
      }

      // Format data dari tabel orders (Step Pesanan Aktif)
      if (resOrders.data.success) {
        formattedOrders = resOrders.data.data
          .filter((o: any) => o.status !== 'unpaid' && o.status !== 'cancelled') // Hanya yang aktif
          .map((o: any) => ({
            id: `order-${o.id}`,
            title: `Pesanan TFAST${o.id}`,
            message: o.store_name || 'Pesanan kamu saat ini',
            type: 'order',
            is_read: 1, // Order selalu dianggap sudah dibaca
            created_at: o.updated_at || o.order_date,
            status_order: o.status,
            is_order_data: true,
            full_message: `Status: ${o.status}\nStore: ${o.mitra_name || '-'}\nTotal: ${o.total_price ? `Rp ${o.total_price.toLocaleString()}` : '-'}`
          }));
      }

      // 3. Gabungkan dan Urutkan berdasarkan tanggal terbaru (Descending)
      const merged = [...formattedNotifs, ...formattedOrders].sort((a, b) => {
        const timeA = getTimeForSorting(a.created_at);
        const timeB = getTimeForSorting(b.created_at);
        return timeB - timeA;
      });

      setCombinedChat(merged);

      // Simpan jumlah notifikasi belum dibaca ke storage untuk diakses tab
      const unreadCount = merged.filter(chat => chat.is_read === 0).length;
      await storage.save('unreadChatCount', unreadCount.toString());

    } catch (error) {
      console.error('❌ Gagal sinkronisasi chat:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();

    // Setup interval untuk refresh data setiap 30 detik
    const interval = setInterval(() => {
      loadAllData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  const getIconConfig = (type: string) => {
    switch (type) {
      case 'promo': return { name: 'percent', color: '#D4E12D', family: 'Material' };
      case 'order': return { name: 'bag-handle-outline', color: '#633594', family: 'Ionicons' };
      case 'system': return { name: 'help-circle', color: '#26D3B4', family: 'Ionicons' };
      default: return { name: 'notifications', color: '#7D58B5', family: 'Ionicons' };
    }
  };

  // Hitung total unread untuk ditampilkan di tab (akan diupdate ke storage)
  const unreadCount = combinedChat.filter(chat => chat.is_read === 0).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.customHeader}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Chat</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>

        {/* Fitur Cepat */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fitur Cepat</Text>
          <View style={styles.featureRow}>
            <TouchableOpacity style={styles.featureItemContainer} onPress={handleWhatsApp}>
              <View style={[styles.iconCircle, { backgroundColor: '#25D366' }]}>
                <FontAwesome name="whatsapp" size={30} color="#fff" />
              </View>
              <Text style={styles.featureLabel}>Bantuan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.featureItemContainer}>
              <View style={[styles.iconCircle, { backgroundColor: '#FFBB33' }]}>
                <MaterialIcons name="question-answer" size={30} color="#fff" />
              </View>
              <Text style={styles.featureLabel}>FAQ</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Chat Kamu Gabungan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chat Kamu</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#633594" style={{ marginTop: 20 }} />
          ) : combinedChat.length > 0 ? (
            combinedChat.map((item) => {
              const config = getIconConfig(item.type);

              // Badge status khusus untuk item order
              const badge = item.type === 'order' ? getStatusBadge(item.status_order) : null;

              return (
                <View key={item.id} style={styles.cardWrapper}>
                  <TouchableOpacity
                    style={styles.chatCard}
                    onPress={() => handleChatPress(item)}
                  >
                    <View style={[styles.avatarCircle, { backgroundColor: config.color }]}>
                      {config.family === 'Ionicons' ? (
                        <Ionicons name={config.name as any} size={24} color="#fff" />
                      ) : (
                        <MaterialCommunityIcons name={config.name as any} size={26} color="#fff" />
                      )}
                    </View>
                    <View style={styles.chatContentContainer}>
                      <View style={styles.chatContent}>
                        {/* Baris atas: judul + tanggal */}
                        <View style={styles.chatHeaderRow}>
                          <Text style={[styles.chatName, item.is_read === 0 && styles.unreadText]}>
                            {item.title}
                          </Text>
                          <Text style={styles.chatTime}>
                            {formatToWIB(item.created_at)}
                          </Text>
                        </View>
                        {/* Baris bawah: pesan + badge status (order) atau dot ungu (notif) */}
                        <View style={styles.chatHeaderRow}>
                          <Text style={[styles.chatMessage, item.is_read === 0 && styles.unreadMessage]} numberOfLines={1}>
                            {item.message}
                          </Text>
                          {badge ? (
                            // Badge status untuk pesanan
                            <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                              <Text style={[styles.statusBadgeText, { color: badge.color }]}>
                                {badge.label}
                              </Text>
                            </View>
                          ) : (
                            // Dot ungu untuk notif yang belum dibaca
                            item.is_read === 0 && <View style={styles.dotPurple} />
                          )}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.separator} />
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>Tidak ada percakapan</Text>
          )}
        </View>
      </ScrollView>

      {/* Modal untuk menampilkan pesan lengkap */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedChat?.title}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.modalDateContainer}>
                <Ionicons name="time-outline" size={16} color="#94A3B8" />
                <Text style={styles.modalDate}>
                  {selectedChat?.created_at && formatToWIB(selectedChat.created_at, true)}
                </Text>
              </View>

              <View style={styles.messageContainer}>
                <Text style={styles.modalMessage}>
                  {selectedChat?.full_message || selectedChat?.message || 'Tidak ada pesan lengkap'}
                </Text>
              </View>

              {selectedChat?.type === 'order' && selectedChat?.status_order && (
                <View style={styles.modalStatusContainer}>
                  <Text style={styles.modalStatusLabel}>Status Pesanan:</Text>
                  <View style={[styles.modalStatusBadge, { backgroundColor: getStatusBadge(selectedChat.status_order).bg }]}>
                    <Text style={[styles.modalStatusText, { color: getStatusBadge(selectedChat.status_order).color }]}>
                      {getStatusBadge(selectedChat.status_order).label}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Helper function untuk badge status
const getStatusBadge = (status: string | undefined): { label: string; color: string; bg: string } => {
  switch (status) {
    case 'accepted':
      return { label: 'Diterima', color: '#1D4ED8', bg: '#DBEAFE' };
    case 'on_the_way':
      return { label: 'Sedang Di Jalan', color: '#92400E', bg: '#FEF3C7' };
    case 'working':
      return { label: 'Sedang Dikerjakan', color: '#065F46', bg: '#D1FAE5' };
    case 'completed':
      return { label: 'Selesai', color: '#166534', bg: '#DCFCE7' };
    case 'pending':
      return { label: 'Menunggu Konfirmasi', color: '#6B7280', bg: '#F3F4F6' };
    default:
      return { label: 'Diproses', color: '#6B7280', bg: '#F3F4F6' };
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  customHeader: {
    backgroundColor: '#FFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerContent: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, justifyContent: 'space-between' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  backButton: { padding: 5 },
  section: { marginTop: 15, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  featureRow: { flexDirection: 'row', marginBottom: 10 },
  featureItemContainer: { alignItems: 'center', marginRight: 25 },
  iconCircle: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  featureLabel: { fontSize: 12, color: '#444', fontWeight: '500' },
  cardWrapper: { marginBottom: 10 },
  chatCard: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  chatContentContainer: { flex: 1, marginLeft: 15 },
  chatContent: { paddingVertical: 5 },
  chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  unreadText: { color: '#633594', fontWeight: '800' },
  chatTime: { fontSize: 11, color: '#94A3B8' },
  chatMessage: { fontSize: 13, color: '#64748B', marginTop: 2, flex: 1, marginRight: 8 },
  unreadMessage: { color: '#1E293B', fontWeight: '500' },
  dotPurple: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#633594' },
  separator: { height: 1, backgroundColor: '#F1F5F9', marginTop: 12 },

  // Badge status order
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 40 },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
  },
  modalCloseButton: {
    padding: 5,
  },
  modalContent: {
    padding: 20,
  },
  modalDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalDate: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 5,
  },
  messageContainer: {
    backgroundColor: '#F8FAFC',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  modalMessage: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 22,
  },
  modalStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalStatusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  modalStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalButton: {
    backgroundColor: '#633594',
    margin: 20,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ExploreScreen;