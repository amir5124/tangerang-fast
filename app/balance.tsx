import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import API from '../src/utils/api';
import { storage } from '../src/utils/storage';

// --- Daftar Bank ---
const BANK_LIST = [
  {label: 'Bank BCA', code: '014'},
  {label: 'Bank Mandiri', code: '008'},
  {label: 'Bank BNI', code: '009'},
  {label: 'Bank BRI', code: '002'},
  {label: 'Bank BSI', code: '451'},
  {label: 'Bank Jago', code: '542'},
  {label: 'SeaBank', code: '535'},
].sort((a, b) => a.label.localeCompare(b.label));

// --- Interfaces ---
interface Transaction {
  amount: string | number;
  type: 'credit' | 'debit';
  description: string;
  created_at: string;
  is_withdraw?: boolean;
  status?: string;
}

interface WalletResponse {
  user: {id: string; name: string; role: string};
  wallet: {balance: number; transactions: Transaction[]};
}

interface WithdrawHistory {
  id: number;
  amount: string | number; // Menangani string "10000.00" dari API
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REJECTED';
  created_at: string;
}

const WalletScreen: React.FC = () => {
  const router = useRouter();
  const THEME_COLOR = '#633594';

  // State Data Utama
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletData, setWalletData] = useState<WalletResponse | null>(null);
  const [adminFee, setAdminFee] = useState(0);

  // State UI Modal
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [step, setStep] = useState(1);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // State Form Withdraw
  const [amount, setAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [bankInfo, setBankInfo] = useState({holder: '', inquiryReff: ''});
  const [searchBank, setSearchBank] = useState('');
  const [user, setUser] = useState<any>(null);

  // --- API Calls ---
  const formatTransactionDate = (dateString: string) => {
    // 1. Ubah spasi menjadi 'T' agar formatnya ISO: YYYY-MM-DDTHH:mm:ss
    // 2. Tambahkan 'Z' (Zero Meridian / UTC)
    const utcDate = new Date(dateString.replace(' ', 'T') + 'Z');

    return utcDate.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const fetchUserProfile = async () => {
    try {
      const response: any = await API.get('/auth/profile');
      if (response.data.success) {
        setUser(response.data.user);
        await storage.save('userData', JSON.stringify(response.data.user));
      }
    } catch (error: any) {
      const cached = await storage.get('userData');
      if (cached) setUser(JSON.parse(cached));
    }
  };

  const fetchAdminFee = async () => {
    try {
      const res = await API.get('/disburse/withdraw_fee');
      if (res.data.success && res.data.value) {
        setAdminFee(parseInt(res.data.value));
      }
    } catch (e) {
      console.error('❌ Error Fetch Admin Fee:');
      setAdminFee(0);
    }
  };

  const fetchWalletData = async () => {
    try {
      const response = await API.get('/balance');
      if (response.data.success) {
        setWalletData(response.data.data);
      }
    } catch (error) {
      console.error('Gagal memuat data dompet:', error);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchUserProfile(),
        fetchWalletData(),
        fetchAdminFee(),
      ]);
    } catch (err) {
      console.error('Load Data Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchWalletData(), fetchAdminFee()]);
    setRefreshing(false);
  }, []);

  // --- Helpers ---

  const formatRupiah = (value: string | number) => {
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(numericValue || 0);
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  // --- Logic Transaksi (KUNCI AGAR TIDAK DOUBLE) ---
  const combinedTransactions = (walletData?.wallet.transactions || [])
    .map((tx, index) => {
      // Deteksi jika deskripsi mengandung kata 'Withdrawal'
      const isWithdraw = tx.description.toLowerCase().includes('withdrawal');
      return {
        ...tx,
        // Gunakan created_at + index sebagai key sementara jika tidak ada ID unik dari API
        uniqueId: `tx-${tx.created_at}-${index}`,
        status: isWithdraw ? 'SUCCESS' : null,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  // --- Transaction Logic ---

  const handleInquiry = async () => {
    const userId = user?.id || walletData?.user?.id;
    const val = parseInt(amount);
    const balance = walletData?.wallet.balance || 0;

    if (!val || val < 10000)
      return showAlert('Minimal Penarikan', 'Minimal Rp 10.000');
    if (!selectedBank) return showAlert('Error', 'Pilih bank tujuan');
    if (!accountNumber) return showAlert('Error', 'Isi nomor rekening');
    if (val + adminFee > balance)
      return showAlert('Saldo Kurang', 'Saldo Anda tidak mencukupi.');

    setWithdrawLoading(true);
    try {
      const res = await API.post('/withdraw/inquiry', {
        user_id: userId,
        amount: val,
        bank_code: selectedBank.code,
        account_number: accountNumber,
        admin_fee: adminFee,
      });

      if (res.data.success) {
        setBankInfo({
          holder: res.data.data.accountname,
          inquiryReff: res.data.data.inquiry_reff,
        });
        setStep(2);
      }
    } catch (e: any) {
      showAlert(
        'Gagal',
        e.response?.data?.message || 'Rekening tidak ditemukan.',
      );
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleExecuteWithdraw = async () => {
    const userId = user?.id || walletData?.user?.id;
    setWithdrawLoading(true);
    try {
      const res = await API.post('/withdraw/execute', {
        user_id: userId,
        inquiry_reff: bankInfo.inquiryReff,
        admin_fee: adminFee,
      });

      if (res.data.success) {
        showAlert('Sukses', 'Permintaan penarikan berhasil dikirim.');
        setShowWithdrawModal(false);
        setStep(1);
        setAmount('');
        onRefresh();
      }
    } catch (e: any) {
      showAlert('Gagal', e.response?.data?.message || 'Terjadi kesalahan.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME_COLOR} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.customHeader}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dompet Anda</Text>
          <View style={{width: 40}} />
        </View>
      </View>

      <View style={[styles.headerSection, {backgroundColor: THEME_COLOR}]}>
        <View style={styles.balanceCard}>
          <View style={styles.balanceInfo}>
            <Text style={styles.cardLabel}>Total Saldo</Text>
            <Text style={styles.balanceText}>
              {walletData ? formatRupiah(walletData.wallet.balance) : 'Rp 0'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.withdrawBtn}
            onPress={() => setShowWithdrawModal(true)}>
            <Ionicons
              name="paper-plane-outline"
              size={20}
              color={THEME_COLOR}
            />
            <Text style={styles.withdrawText}>Tarik Dana</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>Transaksi Terakhir</Text>
        </View>

        <FlatList
          data={combinedTransactions}
          keyExtractor={item => item.uniqueId}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={THEME_COLOR}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={60} color="#E2E8F0" />
              <Text style={styles.emptyText}>Belum ada transaksi</Text>
            </View>
          }
          renderItem={({item}) => (
            <View style={styles.transactionItem}>
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor:
                      item.type === 'credit' ? '#F3E8FF' : '#FFF1F2',
                  },
                ]}>
                <Ionicons
                  name={
                    item.type === 'credit' ? 'add-outline' : 'remove-outline'
                  }
                  size={22}
                  color={item.type === 'credit' ? THEME_COLOR : '#F43F5E'}
                />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemDesc} numberOfLines={2}>
                  {item.description}
                </Text>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Text style={styles.itemDate}>
                    {formatTransactionDate(item.created_at)}
                  </Text>
                  {item.status && (
                    <View
                      style={[
                        styles.pendingBadge,
                        {
                          backgroundColor:
                            item.status === 'SUCCESS' ? '#DCFCE7' : '#FEF3C7',
                        },
                      ]}>
                      <Text
                        style={[
                          styles.pendingText,
                          {
                            color:
                              item.status === 'SUCCESS' ? '#166534' : '#D97706',
                          },
                        ]}>
                        {item.status === 'SUCCESS' ? 'Berhasil' : 'Proses'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <Text
                style={[
                  styles.itemAmount,
                  {color: item.type === 'credit' ? THEME_COLOR : '#F43F5E'},
                ]}>
                {item.type === 'credit' ? '+' : '-'} {formatRupiah(item.amount)}
              </Text>
            </View>
          )}
        />
      </View>
      {/* MODAL WITHDRAW */}
      <Modal visible={showWithdrawModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalTopBar}>
              <View style={styles.modalHandle} />
            </View>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {step === 1 ? 'Tarik Saldo' : 'Konfirmasi Transaksi'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowWithdrawModal(false);
                  setStep(1);
                }}>
                <Ionicons name="close-circle" size={28} color="#CBD5E1" />
              </TouchableOpacity>
            </View>

            {step === 1 ? (
              <View>
                <Text style={styles.inputLabel}>Nominal Penarikan</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Min. 10.000"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
                <Text style={styles.inputLabel}>Bank Tujuan</Text>
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setShowBankModal(true)}>
                  <Text style={{color: selectedBank ? '#1E293B' : '#94A3B8'}}>
                    {selectedBank ? selectedBank.label : 'Pilih Bank'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={THEME_COLOR} />
                </TouchableOpacity>
                <Text style={styles.inputLabel}>Nomor Rekening</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Masukkan nomor rekening"
                  keyboardType="numeric"
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                />
                <Text style={styles.inputLabel}>
                  Biaya admin: {formatRupiah(adminFee)}
                </Text>
                <TouchableOpacity
                  style={[styles.mainBtn, {backgroundColor: THEME_COLOR}]}
                  onPress={handleInquiry}
                  disabled={withdrawLoading}>
                  {withdrawLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.mainBtnText}>Lanjutkan</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View style={styles.confirmBox}>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confLabel}>Penerima</Text>
                    <Text style={styles.confVal}>{bankInfo.holder}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confLabel}>Bank</Text>
                    <Text style={styles.confVal}>{selectedBank?.label}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confLabel}>Nominal</Text>
                    <Text style={styles.confVal}>{formatRupiah(amount)}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confLabel}>Biaya Admin</Text>
                    <Text style={styles.confVal}>{formatRupiah(adminFee)}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.confirmRow}>
                    <Text style={styles.confLabel}>Total Potong</Text>
                    <Text style={[styles.confVal, {color: THEME_COLOR}]}>
                      {formatRupiah(parseInt(amount) + adminFee)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.mainBtn, {backgroundColor: '#10B981'}]}
                  onPress={handleExecuteWithdraw}
                  disabled={withdrawLoading}>
                  {withdrawLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.mainBtnText}>Konfirmasi & Tarik</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setStep(1)}
                  style={styles.cancelBtn}>
                  <Text style={{color: '#64748B'}}>Kembali</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL PILIH BANK */}
      <Modal visible={showBankModal} animationType="fade" transparent>
        <View style={styles.bankModalOverlay}>
          <View style={styles.bankModalContent}>
            <Text style={styles.modalTitle}>Pilih Bank</Text>
            <TextInput
              style={styles.searchBar}
              placeholder="Cari bank..."
              onChangeText={setSearchBank}
            />
            <FlatList
              data={BANK_LIST.filter(b =>
                b.label.toLowerCase().includes(searchBank.toLowerCase()),
              )}
              keyExtractor={item => item.code}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={styles.bankItem}
                  onPress={() => {
                    setSelectedBank(item);
                    setShowBankModal(false);
                  }}>
                  <Text style={styles.bankItemText}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#E2E8F0" />
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.closeBankBtn}
              onPress={() => setShowBankModal(false)}>
              <Text style={{color: THEME_COLOR, fontWeight: 'bold'}}>
                Tutup
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  customHeader: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  backButton: {padding: 5},
  headerTitle: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  headerSection: {margin: 15, borderRadius: 20, padding: 25, elevation: 8},
  balanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceInfo: {flex: 1},
  cardLabel: {color: '#E0E7FF', fontSize: 14, marginBottom: 4},
  balanceText: {color: '#FFF', fontSize: 22, fontWeight: 'bold'},
  withdrawBtn: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  withdrawText: {fontWeight: 'bold', marginLeft: 8, color: '#633594'},
  historySection: {flex: 1, paddingHorizontal: 20},
  historyHeader: {marginVertical: 20},
  historyTitle: {fontSize: 18, fontWeight: 'bold', color: '#1E293B'},
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  itemInfo: {flex: 1},
  itemDesc: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 2,
  },
  itemDate: {fontSize: 12, color: '#94A3B8'},
  itemAmount: {fontSize: 15, fontWeight: 'bold'},
  pendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  pendingText: {fontSize: 10, fontWeight: 'bold'},
  emptyState: {alignItems: 'center', justifyContent: 'center', marginTop: 60},
  emptyText: {color: '#94A3B8', marginTop: 12},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    minHeight: 500,
  },
  modalTopBar: {alignItems: 'center', marginBottom: 15},
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  modalTitle: {fontSize: 20, fontWeight: 'bold', color: '#1E293B'},
  inputLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 8,
    marginTop: 15,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    padding: 15,
    borderRadius: 15,
    fontSize: 16,
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 15,
    borderRadius: 15,
  },
  mainBtn: {padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 30},
  mainBtnText: {color: '#FFF', fontWeight: 'bold', fontSize: 16},
  cancelBtn: {alignItems: 'center', marginTop: 15},
  confirmBox: {backgroundColor: '#F8FAFC', padding: 20, borderRadius: 20},
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  confLabel: {color: '#64748B'},
  confVal: {fontWeight: 'bold'},
  divider: {height: 1, backgroundColor: '#E2E8F0', marginVertical: 10},
  bankModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  bankModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 25,
    padding: 20,
    maxHeight: '80%',
  },
  searchBar: {
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 12,
    marginVertical: 15,
  },
  bankItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  bankItemText: {fontSize: 16, color: '#334155'},
  closeBankBtn: {marginTop: 15, alignItems: 'center'},
});

export default WalletScreen;
