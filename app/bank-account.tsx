import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import API from '../src/utils/api';

// ========== Type Definitions ==========
interface Bank {
    code: string;
    name: string;
}

interface BankAccount {
    id: number;
    bank_code: string;
    bank_name: string;
    account_number: string;
    account_name: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

interface MetaData {
    total_accounts: number;
    max_accounts: number;
    remaining_slots: number;
}

interface FormData {
    bank_code: string;
    account_number: string;
    account_name: string;
}

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    meta?: MetaData;
}

// ========== Helper Function ==========
// Fungsi untuk membersihkan nama bank dari karakter aneh (angka 0, spasi, dll)
const cleanBankName = (name: string): string => {
    if (!name) return '';
    // Hapus angka 0 di akhir, spasi berlebih, dan karakter aneh
    let cleaned = name.replace(/\s*0+\s*$/g, ''); // Hapus angka 0 di akhir
    cleaned = cleaned.replace(/[^\w\s]/g, ''); // Hapus karakter aneh
    cleaned = cleaned.trim(); // Hapus spasi berlebih
    return cleaned || name;
};

// ========== Main Component ==========
const BankAccountManager: React.FC = () => {
    const router = useRouter();
    const [banks, setBanks] = useState<Bank[]>([]);
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [meta, setMeta] = useState<MetaData>({
        total_accounts: 0,
        max_accounts: 2,
        remaining_slots: 2
    });
    const [formData, setFormData] = useState<FormData>({
        bank_code: '',
        account_number: '',
        account_name: ''
    });
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    // Modal states
    const [addModalVisible, setAddModalVisible] = useState<boolean>(false);
    const [confirmModalVisible, setConfirmModalVisible] = useState<boolean>(false);
    const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'setActive'; id?: number; bankName?: string } | null>(null);

    useEffect(() => {
        fetchBankList();
        fetchAccounts();
    }, []);

    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const fetchBankList = async () => {
        try {
            const response = await API.get<ApiResponse<Bank[]>>('/bank/list');
            if (response.data.success && response.data.data) {
                setBanks(response.data.data);
            }
        } catch (error) {
            console.error('Fetch bank list error:', error);
            setError('Gagal mengambil daftar bank');
        }
    };

    const fetchAccounts = async () => {
        try {
            const response = await API.get<ApiResponse<BankAccount[]>>('/bank/accounts');
            if (response.data.success) {
                // Bersihkan nama bank dari karakter aneh
                const cleanedAccounts = (response.data.data || []).map(account => ({
                    ...account,
                    bank_name: cleanBankName(account.bank_name)
                }));
                setAccounts(cleanedAccounts);
                if (response.data.meta) {
                    setMeta(response.data.meta);
                }
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || 'Gagal mengambil data rekening';
            setError(errorMsg);
            console.error('Fetch accounts error:', errorMsg);
        }
    };

    const handleSubmit = async () => {
        // Validasi lengkap
        if (!formData.bank_code) {
            setError('Silakan pilih bank terlebih dahulu');
            return;
        }
        if (!formData.account_number || formData.account_number.length < 6) {
            setError('Nomor rekening minimal 6 digit');
            return;
        }
        if (!formData.account_name || formData.account_name.length < 3) {
            setError('Nama pemilik rekening minimal 3 karakter');
            return;
        }

        setLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            const response = await API.post<ApiResponse<{ id: number; is_active: boolean }>>(
                '/bank/accounts',
                formData
            );
            if (response.data.success) {
                setSuccessMessage(response.data.message || 'Rekening berhasil ditambahkan!');
                await fetchAccounts();
                setFormData({ bank_code: '', account_number: '', account_name: '' });
                setAddModalVisible(false);
            } else {
                setError(response.data.message || 'Gagal menambahkan rekening');
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || 'Gagal menambahkan rekening';
            setError(errorMsg);
            console.error('Submit error:', errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: number, bankName: string) => {
        setConfirmAction({ type: 'delete', id, bankName: cleanBankName(bankName) });
        setConfirmModalVisible(true);
    };

    const confirmDelete = async () => {
        if (!confirmAction?.id) return;
        setConfirmModalVisible(false);

        try {
            const response = await API.delete<ApiResponse<null>>(`/bank/accounts/${confirmAction.id}`);
            if (response.data.success) {
                setSuccessMessage(response.data.message || 'Rekening berhasil dihapus');
                await fetchAccounts();
            } else {
                setError(response.data.message || 'Gagal menghapus rekening');
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || 'Gagal menghapus rekening';
            setError(errorMsg);
            console.error('Delete error:', errorMsg);
        }
        setConfirmAction(null);
    };

    const handleSetActive = (id: number, bankName: string) => {
        setConfirmAction({ type: 'setActive', id, bankName: cleanBankName(bankName) });
        setConfirmModalVisible(true);
    };

    const confirmSetActive = async () => {
        if (!confirmAction?.id) return;
        setConfirmModalVisible(false);
        setLoading(true);

        try {
            const response = await API.patch<ApiResponse<null>>(`/bank/accounts/${confirmAction.id}/active`, {});
            if (response.data.success) {
                setSuccessMessage(response.data.message || 'Rekening utama berhasil diubah');
                await fetchAccounts();
            } else {
                setError(response.data.message || 'Gagal mengubah rekening utama');
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || 'Gagal mengubah rekening utama';
            setError(errorMsg);
            console.error('Set active error:', errorMsg);
        } finally {
            setLoading(false);
            setConfirmAction(null);
        }
    };

    const closeConfirmModal = () => {
        setConfirmModalVisible(false);
        setConfirmAction(null);
    };

    // Get rekening number (1, 2, etc)
    const getAccountNumber = (index: number, isActive: boolean): string => {
        if (isActive) return 'Utama';
        return `Rekening ${index + 1}`;
    };

    const renderBankAccount = ({ item, index }: { item: BankAccount; index: number }) => {
        const cleanedBankName = cleanBankName(item.bank_name);
        const accountLabel = getAccountNumber(index, item.is_active);

        return (
            <View style={[styles.accountCard, item.is_active && styles.activeCard]}>
                <View style={styles.accountHeader}>
                    <View style={styles.bankInfo}>
                        <View style={[styles.bankIcon, { backgroundColor: item.is_active ? PRIMARY_COLOR : '#e9ecef' }]}>
                            <Ionicons
                                name="business-outline"
                                size={24}
                                color={item.is_active ? '#fff' : PRIMARY_COLOR}
                            />
                        </View>
                        <View style={styles.bankTextInfo}>
                            <View style={styles.bankNameRow}>
                                <Text style={styles.bankName}>{cleanedBankName}</Text>
                                <View style={[
                                    styles.accountLabelBadge,
                                    item.is_active ? styles.activeLabelBadge : styles.inactiveLabelBadge
                                ]}>
                                    <Text style={[
                                        styles.accountLabelText,
                                        item.is_active ? styles.activeLabelText : styles.inactiveLabelText
                                    ]}>
                                        {accountLabel}
                                    </Text>
                                </View>
                            </View>

                        </View>
                    </View>
                </View>
                <View style={styles.accountDetails}>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>No. Rekening</Text>
                        <Text style={styles.detailValue}>{item.account_number}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Atas Nama</Text>
                        <Text style={styles.detailValue}>{item.account_name}</Text>
                    </View>
                </View>
                <View style={styles.buttonContainer}>
                    {!item.is_active && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.activeButton]}
                            onPress={() => handleSetActive(item.id, item.bank_name)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="star-outline" size={14} color="#fff" style={styles.buttonIcon} />
                            <Text style={styles.buttonText}>Jadikan Utama</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDelete(item.id, item.bank_name)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="trash-outline" size={14} color="#fff" style={styles.buttonIcon} />
                        <Text style={styles.buttonText}>Hapus</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* HEADER WITH ARROW BACK */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back-outline" size={24} color={PRIMARY_COLOR} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Manajemen Rekening</Text>
                <View style={styles.headerRight} />
            </View>

            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Success & Error Messages */}
                    {successMessage !== '' && (
                        <View style={styles.successContainer}>
                            <Ionicons name="checkmark-circle-outline" size={20} color="#155724" style={styles.messageIcon} />
                            <Text style={styles.successText}>{successMessage}</Text>
                        </View>
                    )}
                    {error !== '' && (
                        <View style={styles.errorContainer}>
                            <Ionicons name="alert-circle-outline" size={20} color="#721c24" style={styles.messageIcon} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}



                    {/* Add Button */}
                    {meta.remaining_slots > 0 ? (
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => setAddModalVisible(true)}
                            activeOpacity={0.9}
                        >
                            <Ionicons name="add-circle-outline" size={22} color="#fff" />
                            <Text style={styles.addButtonText}>Tambah Rekening Baru</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.warningContainer}>
                            <Ionicons name="warning-outline" size={20} color="#856404" />
                            <Text style={styles.warningText}>Anda sudah mencapai batas maksimal 2 rekening</Text>
                        </View>
                    )}

                    {/* Bank Accounts List */}
                    <View style={styles.listContainer}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="wallet-outline" size={20} color={PRIMARY_COLOR} />
                            <Text style={styles.sectionTitle}>
                                Daftar Rekening Tersimpan
                                <Text style={styles.accountCount}> ({accounts.length}/{meta.max_accounts})</Text>
                            </Text>
                        </View>

                        {accounts.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="card-outline" size={48} color="#adb5bd" />
                                <Text style={styles.emptyText}>Belum ada rekening yang tersimpan</Text>
                                <Text style={styles.emptySubtext}>Tekan tombol di atas untuk menambahkan</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={accounts}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={({ item, index }) => renderBankAccount({ item, index })}
                                scrollEnabled={false}
                            />
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* MODAL TAMBAH REKENING */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={addModalVisible}
                onRequestClose={() => setAddModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderLeft}>
                                <Ionicons name="add-circle-outline" size={24} color={PRIMARY_COLOR} />
                                <Text style={styles.modalTitle}>Tambah Rekening Baru</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setAddModalVisible(false)}
                                style={styles.modalClose}
                            >
                                <Ionicons name="close-outline" size={20} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.inputLabel}>Pilih Bank *</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={formData.bank_code}
                                    onValueChange={(itemValue) => setFormData({ ...formData, bank_code: itemValue })}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Pilih Bank" value="" />
                                    {banks.map((bank) => (
                                        <Picker.Item
                                            key={bank.code}
                                            label={`${bank.name} (${bank.code})`}
                                            value={bank.code}
                                        />
                                    ))}
                                </Picker>
                            </View>

                            <Text style={styles.inputLabel}>Nomor Rekening *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Masukkan nomor rekening"
                                placeholderTextColor="#adb5bd"
                                value={formData.account_number}
                                onChangeText={(text) => {
                                    const numericValue = text.replace(/\D/g, '');
                                    setFormData({ ...formData, account_number: numericValue });
                                }}
                                keyboardType="numeric"
                                maxLength={20}
                            />

                            <Text style={styles.inputLabel}>Nama Pemilik Rekening *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Nama sesuai rekening bank"
                                placeholderTextColor="#adb5bd"
                                value={formData.account_name}
                                onChangeText={(text) => setFormData({ ...formData, account_name: text.toUpperCase() })}
                                autoCapitalize="characters"
                            />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.cancelModalButton]}
                                    onPress={() => setAddModalVisible(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Batal</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.submitModalButton]}
                                    onPress={handleSubmit}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <>
                                            <Ionicons name="save-outline" size={16} color="#fff" />
                                            <Text style={styles.submitButtonText}>Simpan</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* MODAL KONFIRMASI */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={confirmModalVisible}
                onRequestClose={closeConfirmModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.confirmModalContent}>
                        <View style={styles.confirmIconContainer}>
                            <Ionicons
                                name={confirmAction?.type === 'delete' ? "trash-outline" : "star-outline"}
                                size={40}
                                color={PRIMARY_COLOR}
                            />
                        </View>
                        <Text style={styles.confirmTitle}>
                            {confirmAction?.type === 'delete' ? 'Hapus Rekening' : 'Jadikan Rekening Utama'}
                        </Text>
                        <Text style={styles.confirmMessage}>
                            {confirmAction?.type === 'delete'
                                ? `Apakah Anda yakin ingin menghapus rekening ${confirmAction?.bankName || ''}?\n\nTindakan ini tidak dapat dibatalkan.`
                                : `Jadikan ${confirmAction?.bankName || ''} sebagai rekening utama?\n\nRekening sebelumnya akan dinonaktifkan.`}
                        </Text>
                        <View style={styles.confirmButtons}>
                            <TouchableOpacity
                                style={[styles.confirmButton, styles.cancelConfirmButton]}
                                onPress={closeConfirmModal}
                            >
                                <Text style={styles.cancelConfirmText}>Batal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmButton, styles.actionConfirmButton]}
                                onPress={confirmAction?.type === 'delete' ? confirmDelete : confirmSetActive}
                            >
                                <Text style={styles.actionConfirmText}>
                                    {confirmAction?.type === 'delete' ? 'Hapus' : 'Ya, Jadikan Utama'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

// ========== Styles ==========
const PRIMARY_COLOR = '#633594';
const PRIMARY_DARK = '#4e2a75';

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    scrollContent: {
        paddingBottom: 30,
    },
    // Header Styles
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a2e',
    },
    headerRight: {
        width: 40,
    },
    // Message Icon
    messageIcon: {
        marginRight: 8,
    },
    // Info Card
    infoCard: {
        flexDirection: 'row',
        backgroundColor: '#f0e6ff',
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 16,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        gap: 12,
    },
    infoContent: {
        flex: 1,
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: PRIMARY_COLOR,
        marginBottom: 4,
    },
    infoText: {
        fontSize: 13,
        color: '#495057',
    },
    infoSubtext: {
        fontSize: 12,
        color: '#6c757d',
        marginTop: 2,
    },
    infoBold: {
        fontWeight: 'bold',
        color: PRIMARY_COLOR,
        fontSize: 14,
    },
    // Success/Error
    successContainer: {
        backgroundColor: '#d4edda',
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 8,
        padding: 12,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    successText: {
        color: '#155724',
        fontSize: 14,
        flex: 1,
    },
    errorContainer: {
        backgroundColor: '#f8d7da',
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 8,
        padding: 12,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    errorText: {
        color: '#721c24',
        fontSize: 14,
        flex: 1,
    },
    // Add Button
    addButton: {
        backgroundColor: PRIMARY_COLOR,
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: PRIMARY_COLOR,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    warningContainer: {
        backgroundColor: '#fff3cd',
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 14,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    warningText: {
        color: '#856404',
        fontSize: 13,
        flex: 1,
    },
    // List Container
    listContainer: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 20,
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1a1a2e',
    },
    accountCount: {
        fontSize: 13,
        fontWeight: 'normal',
        color: '#6c757d',
    },
    // Account Card
    accountCard: {
        borderWidth: 1,
        borderColor: '#e9ecef',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        backgroundColor: '#fff',
    },
    activeCard: {
        borderColor: PRIMARY_COLOR,
        backgroundColor: '#faf5ff',
        borderWidth: 1.5,
    },
    accountHeader: {
        marginBottom: 12,
    },
    bankInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bankIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#e9ecef',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    bankTextInfo: {
        flex: 1,
    },
    bankNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 4,
    },
    bankName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#212529',
    },
    accountLabelBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    activeLabelBadge: {
        backgroundColor: PRIMARY_COLOR,
    },
    inactiveLabelBadge: {
        backgroundColor: '#e9ecef',
    },
    accountLabelText: {
        fontSize: 10,
        fontWeight: '600',
    },
    activeLabelText: {
        color: '#fff',
    },
    inactiveLabelText: {
        color: '#6c757d',
    },
    bankCode: {
        fontSize: 11,
        color: '#6c757d',
    },
    accountDetails: {
        marginBottom: 14,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    detailLabel: {
        fontSize: 12,
        color: '#6c757d',
    },
    detailValue: {
        fontSize: 13,
        fontWeight: '500',
        color: '#212529',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
        marginLeft: 10,
        gap: 6,
    },
    buttonIcon: {
        marginRight: 4,
    },
    activeButton: {
        backgroundColor: '#28a745',
    },
    deleteButton: {
        backgroundColor: '#dc3545',
    },
    buttonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    emptyContainer: {
        paddingVertical: 50,
        alignItems: 'center',
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
        color: '#6c757d',
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 12,
        color: '#adb5bd',
        textAlign: 'center',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        width: '90%',
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: PRIMARY_COLOR,
    },
    modalClose: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#495057',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        marginBottom: 16,
        backgroundColor: '#fff',
        overflow: 'hidden',
    },
    picker: {
        height: 50,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        fontSize: 14,
        backgroundColor: '#fff',
        color: '#212529',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
        marginBottom: 8,
    },
    modalButton: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
    },
    cancelModalButton: {
        backgroundColor: '#e9ecef',
    },
    submitModalButton: {
        backgroundColor: PRIMARY_COLOR,
    },
    cancelButtonText: {
        color: '#495057',
        fontSize: 14,
        fontWeight: '600',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    // Confirm Modal
    confirmModalContent: {
        backgroundColor: '#fff',
        borderRadius: 28,
        padding: 24,
        width: '85%',
        alignItems: 'center',
    },
    confirmIconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#f0e6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    confirmTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#212529',
        textAlign: 'center',
    },
    confirmMessage: {
        fontSize: 14,
        color: '#6c757d',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    confirmButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
    },
    cancelConfirmButton: {
        backgroundColor: '#f0f0f0',
    },
    actionConfirmButton: {
        backgroundColor: PRIMARY_COLOR,
    },
    cancelConfirmText: {
        color: '#666',
        fontWeight: '600',
    },
    actionConfirmText: {
        color: '#fff',
        fontWeight: '600',
    },
});

export default BankAccountManager;