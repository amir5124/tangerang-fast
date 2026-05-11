import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
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
}

const steps = [
  { id: 'accepted', title: 'Diterima' },
  { id: 'on_the_way', title: 'Di Jalan' },
  { id: 'working', title: 'Proses' },
  { id: 'completed', title: 'Selesai' },
];

const ExploreScreen: React.FC = () => {
  const router = useRouter();
  const [combinedChat, setCombinedChat] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const getStatusWeight = (status: string | undefined) => {
    if (!status) return 0;
    const weights: Record<string, number> = {
      accepted: 1, on_the_way: 2, working: 3, completed: 4,
      unpaid: 0, pending: 0, cancelled: -1
    };
    return weights[status] || 0;
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
          is_order_data: false
        }));
      }

      // Format data dari tabel orders (Step Pesanan Aktif)
      if (resOrders.data.success) {
        formattedOrders = resOrders.data.data
          .filter((o: any) => o.status !== 'unpaid' && o.status !== 'cancelled') // Hanya yang aktif
          .map((o: any) => ({
            id: `order-${o.id}`,
            title: `Pesanan TFAST${o.id}`,
            message: `Status: ${o.store_name || 'Mitra Sedang Menangani'}`,
            type: 'order',
            is_read: 1,
            created_at: o.updated_at || o.order_date,
            status_order: o.status,
            is_order_data: true
          }));
      }

      // 3. Gabungkan dan Urutkan berdasarkan tanggal terbaru (Descending)
      const merged = [...formattedNotifs, ...formattedOrders].sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setCombinedChat(merged);
    } catch (error) {
      console.error('❌ Gagal sinkronisasi chat:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
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
                <Ionicons name="help" size={30} color="#fff" />
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
              const curWeight = getStatusWeight(item.status_order);

              return (
                <View key={item.id} style={styles.cardWrapper}>
                  <TouchableOpacity
                    style={styles.chatCard}
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
                        <View style={styles.chatHeaderRow}>
                          <Text style={styles.chatName}>{item.title}</Text>
                          <Text style={styles.chatTime}>
                            {new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })}
                          </Text>
                        </View>
                        <View style={styles.chatHeaderRow}>
                          <Text style={styles.chatMessage} numberOfLines={1}>{item.message}</Text>
                          {item.is_read === 0 && <View style={styles.dotOrange} />}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* STEPPER TRACKING - Muncul untuk Pesanan Aktif */}
                  {item.type === 'order' && curWeight > 0 && (
                    <View style={styles.stepperContainer}>
                      <View style={styles.stepperLineRow}>
                        {steps.map((step, index) => {
                          const isActive = curWeight !== -1 && index + 1 <= curWeight;
                          return (
                            <View key={step.id} style={styles.stepItem}>
                              <View style={styles.stepIndicator}>
                                {index !== 0 && (
                                  <View style={[styles.connector, { backgroundColor: index < curWeight ? '#633594' : '#E2E8F0' }]} />
                                )}
                                <View style={[styles.stepDot, { backgroundColor: isActive ? '#633594' : '#E2E8F0' }]}>
                                  {isActive && <Ionicons name="checkmark" size={8} color="#fff" />}
                                </View>
                              </View>
                              <Text style={[styles.stepLabel, { color: isActive ? '#633594' : '#94A3B8' }]}>
                                {step.title}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}
                  <View style={styles.separator} />
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>Tidak ada percakapan</Text>
          )}
        </View>
      </ScrollView>


    </SafeAreaView>
  );
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
  chatTime: { fontSize: 11, color: '#94A3B8' },
  chatMessage: { fontSize: 13, color: '#64748B', marginTop: 2, flex: 1 },
  dotOrange: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F39233' },
  separator: { height: 1, backgroundColor: '#F1F5F9', marginTop: 12 },

  // Stepper Chat Styles
  stepperContainer: { marginLeft: 60, marginTop: 12, paddingRight: 10 },
  stepperLineRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stepItem: { flex: 1, alignItems: 'center' },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' },
  stepDot: { width: 14, height: 14, borderRadius: 7, zIndex: 2, justifyContent: 'center', alignItems: 'center' },
  connector: { height: 2, flex: 1, position: 'absolute', left: '-50%', right: '50%', zIndex: 1 },
  stepLabel: { fontSize: 8, fontWeight: 'bold', marginTop: 4 },

  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#008917', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 40 }
});

export default ExploreScreen;