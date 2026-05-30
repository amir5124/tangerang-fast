import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { ServiceOptionCard } from '../components/home/ServiceOptionCard';
import API from '../utils/api';

// Konfigurasi Animasi untuk Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// --- DATA SOURCE DINAMIS UNTUK SYARAT & KETENTUAN ---
const SERVICE_TERMS_DATA = {
  AC_SERVICE: {
    equipmentLabel: 'Peralatan dan perlengkapan (Sudah Termasuk):',
    equipment: [
      'Mesin Jet Washer (Pompa cuci)',
      'Plastik Pelindung AC (Cover)',
      'Ember & Selang Air',
      'Cairan Pembersih/Sabun Khusus',
      'Alat Ukur Tekanan Freon (Manifold)',
      'Tangga Aluminium Standar',
    ],
    includes: [
      'Pembersihan Filter, Evaporator (Indoor), dan Fan (Outdoor)',
      'Pembersihan bak drainase dan pengecekan pipa pembuangan',
      'Pengecekan tekanan freon dan fungsi remote',
      'Garansi servis selama 30 hari (tergantung kerusakan awal)',
    ],
    excludes: [
      'Penambahan atau pengisian ulang Freon (Biaya tambahan berlaku)',
      'Perbaikan modul elektronik, kompresor, atau penggantian sparepart',
      'Bongkar pasang unit AC atau pemindahan lokasi unit',
      'Penanganan kebocoran pipa di dalam tembok (bobok tembok)',
      'Pengerjaan di ketinggian ekstrim (Lantai 2+ tanpa akses aman)',
    ],
    notes: [
      'Untuk memudahkan proses pemesanan, Tangerang Fast menyediakan estimasi waktu pengerjaan sebagai berikut:',
      '• Pagi : 08.00 – 11.00',
      '• Siang : 11.00 – 14.00',
      '• Sore : 14.00 – 16.00',
      'Waktu kedatangan dan pengerjaan akan menyesuaikan ketersediaan jadwal teknisi atau pekerja di area customer.',
    ],
  },
  CLEANING: {
    equipmentLabel: 'Peralatan dan perlengkapan (Apabila pesan dengan Alat):',
    equipment: [
      'Sapu',
      'Pel',
      'Kemoceng',
      'Cairan pembersih',
      'Lap microfiber',
      'Sikat lantai',
    ],
    includes: [
      'Pembersihan standar seperti mengepel, menyapu, mengelap',
      'Pembuangan sampah harian',
      'Pembersihan Kaca Dalam (Max 2m)',
    ],
    excludes: [
      'Pembersihan area yang tidak terjangkau (contoh: harus tangga)',
      'Pembersihan kotoran hewan dan/atau manusia',
      'Pembersihan kerak, noda berat, lumut, atau jamur',
      'Pembersihan area taman, garasi, dan gudang lama',
    ],
    notes: [],
  },
  SEDOT_WC: {
    equipmentLabel: 'Armada dan Peralatan (Sudah Termasuk):',
    equipment: [
      'Truk Tangki Vakum',
      'Selang Panjang (Standar 15-20m)',
      'Mesin Sedot Vakum Daya Tinggi',
      'Alat Pembuka Tutup Septic Tank',
      'Disinfektan Anti Bakteri & Penghilang Bau',
    ],
    includes: [
      'Penyedotan kotoran septic tank hingga tuntas',
      'Pelancaran saluran pipa yang tersumbat ringan',
      'Pembuangan limbah ke lokasi pengolahan resmi (IPLT)',
      'Pembersihan area sekitar lubang sedot setelah pengerjaan',
    ],
    excludes: [
      'Penambahan panjang selang di atas 20 meter (Biaya tambahan)',
      'Bongkar pasang keramik permanen (Jika lubang tidak tersedia)',
      'Pembuatan septic tank baru atau resapan baru',
      'Perbaikan struktur septic tank yang runtuh/rusak berat',
    ],
    notes: [
      'Ketersediaan teknisi dan mobil akan diinformasikan setelah proses pemesanan selesai.'
    ],
  },
  ART_BABYSITTER: {
    equipmentLabel: 'Peralatan dan Perlengkapan Utama:',
    equipment: [
      'Seragam Kerja Standar & Apron Higienis',
      'Alat Pelindung Diri (Masker & Hand Sanitizer)',
      'Buku Laporan Harian (Daily Activity Log)',
      'Alat Kebersihan Dasar (Sapu, Pel, & Kemoceng)',
      'Termometer Digital (Untuk cek suhu anak/anggota keluarga)',
    ],
    includes: [
      'Pengasuhan anak (Makan, Mandi, Bermain, & Stimulasi)',
      'Pembersihan area dalam rumah (Sapu, Pel, & Debu)',
      'Pencucian dan penyetrikaan pakaian harian',
      'Pembersihan dapur, alat makan, dan kamar mandi',
      'Update rutin kondisi anak dan pekerjaan rumah kepada majikan',
      'Penyediaan tenaga kerja yang sudah terverifikasi identitasnya',
    ],
    excludes: [
      'Penyediaan kebutuhan pokok (Susu, Diapers, Deterjen, Bahan Makanan)',
      'Pembersihan kerak berat atau sisa renovasi (Deep Cleaning)',
      'Pengerjaan di ketinggian yang berisiko (Lantai 2 sisi luar)',
      'Biaya transportasi di luar area jangkauan standar',
      'Tindakan medis khusus atau pengobatan darurat',
      'Biaya lembur di luar jam operasional yang disepakati',
    ],
    notes: [],
  },
};

const OrderDetailScreen = () => {
  const params = useLocalSearchParams();
  const router = useRouter();

  // --- STATE DATA API ---
  const [isLoading, setIsLoading] = useState(true);
  const [subServices, setSubServices] = useState<any[]>([]);
  const [operatingHours, setOperatingHours] = useState<any[]>([]);

  // State untuk Custom Toast (iOS Fallback)
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // --- STATE TRANSAKSI ---
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [buildingType, setBuildingType] = useState('Rumah');
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const localISOTime = new Date(now.getTime() - offset).toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(localISOTime);

  // Ambil kategori dari params (dikirim dari halaman list vendor)
  const vendorCategory = (params.category as string) || '';

  // Helper function untuk cek apakah waktu harus di-hidden (untuk AC dan Sedot WC)
  const isTimeHidden = () => {
    // Untuk kategori AC dan WC, waktu di-hidden/disabled
    return vendorCategory === 'ac' || vendorCategory === 'wc';
  };

  // Helper function untuk cek apakah ini vendor AC Service
  const isACServiceVendor = () => {
    return vendorCategory === 'ac';
  };

  const getInitialTime = () => {
    const d = new Date();
    return {
      h: String(d.getHours()).padStart(2, '0'),
      m: String(d.getMinutes()).padStart(2, '0'),
    };
  };

  const initialTime = getInitialTime();
  const [inputHour, setInputHour] = useState(initialTime.h);
  const [inputMinute, setInputMinute] = useState(initialTime.m);
  const [showTerms, setShowTerms] = useState(false);

  // --- TOAST FUNCTION ---
  const showInfoToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      setToastMsg(message);
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 3000);
    }
  };

  // --- LOGIKA PENENTUAN SYARAT & KETENTUAN DINAMIS ---
  const getActiveTerms = () => {
    const titleStr = typeof params.title === 'string' ? decodeURIComponent(params.title) : '';

    // Prioritas berdasarkan kategori
    if (vendorCategory === 'ac') return SERVICE_TERMS_DATA.AC_SERVICE;
    if (vendorCategory === 'cleaning') return SERVICE_TERMS_DATA.CLEANING;
    if (vendorCategory === 'wc') return SERVICE_TERMS_DATA.SEDOT_WC;
    if (vendorCategory === 'art') return SERVICE_TERMS_DATA.ART_BABYSITTER;

    // Fallback berdasarkan title
    if (titleStr === 'TangerangFast Service') return SERVICE_TERMS_DATA.CLEANING;
    if (titleStr === 'TangerangFast') return SERVICE_TERMS_DATA.AC_SERVICE;
    if (titleStr === 'Vendor Rijit') return SERVICE_TERMS_DATA.SEDOT_WC;
    if (titleStr === 'Vendor ART') return SERVICE_TERMS_DATA.ART_BABYSITTER;

    return SERVICE_TERMS_DATA.CLEANING;
  };

  const currentTerms = getActiveTerms();

  const toggleTerms = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowTerms(!showTerms);
  };

  // --- FETCH DATA LAYANAN MITRA ---
  const fetchDetailMitra = async () => {
    try {
      setIsLoading(true);
      const response = await API.get(`/mitra/${params.id}`);

      const rawHours = response.data.operating_hours;
      if (rawHours) {
        setOperatingHours(
          typeof rawHours === 'string' ? JSON.parse(rawHours) : rawHours,
        );
      }

      const servicesData = response.data.services || [];
      const BASE_URL = 'https://backend.tangerangfast.online';

      const normalizedServices = servicesData
        .filter((s: any) => s.is_active === 1 || s.is_active === true) // ✅ hanya tampilkan yang aktif
        .map((s: any) => {
          let finalImage = 'https://via.placeholder.com/100';
          if (s.image_url) {
            finalImage = s.image_url.startsWith('http')
              ? s.image_url
              : `${BASE_URL}${s.image_url}`;
          }
          return {
            ...s,
            price: Number(s.base_price || s.price || 0),
            display_image: finalImage,
          };
        });

      setSubServices(normalizedServices);
    } catch (error) {
      showInfoToast('Gagal memuat daftar harga.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) fetchDetailMitra();
  }, [params.id]);

  const checkIsClosed = () => {
    // Jika waktu di-hidden (AC/WC), tidak perlu cek jam operasional
    if (isTimeHidden()) return false;

    if (!operatingHours || operatingHours.length === 0) return false;

    const daysMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    const [year, month, day] = selectedDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const selectedDayName = daysMap[dateObj.getDay()];

    const schedule = operatingHours.find((h: any) => h.day === selectedDayName);

    if (!schedule || !schedule.active) return true;

    const hh = inputHour.padStart(2, '0');
    const mm = inputMinute.padStart(2, '0');
    const userTime = `${hh}:${mm}`;

    const openTime = schedule.open;
    const closeTime = schedule.close;

    if (closeTime < openTime) {
      return userTime < openTime && userTime > closeTime;
    }

    return userTime < openTime || userTime > closeTime;
  };

  const isClosed = checkIsClosed();

  // --- KALKULASI TOTAL ---
  const subtotal = subServices.reduce((acc: number, item: any) => {
    const qty = selectedItems[item.id] || 0;
    return acc + item.price * qty;
  }, 0);

  const buildingFee = buildingType && buildingType !== 'Rumah' ? 5000 : 0;
  const total = subtotal > 0 ? subtotal + buildingFee : 0;

  // --- FUNGSI NAVIGASI ---
  const handleNext = () => {
    const selectedLayanan = subServices
      .filter((s: any) => selectedItems[s.id] > 0)
      .map((s: any) => ({
        id: s.id,
        nama: s.service_name,
        qty: selectedItems[s.id],
        hargaSatuan: s.price,
      }));

    if (selectedLayanan.length === 0) {
      return showInfoToast('Pilih minimal satu layanan dulu ya!');
    }

    if (isClosed) {
      return showInfoToast('🛑 Jadwal yang dipilih di luar jam operasional mitra.');
    }

    const orderData = {
      mitraId: params.id,
      userIdMitra: params.user_id,
      namaToko: params.title,
      layananTerpilih: selectedLayanan,
      jenisGedung: buildingType,
      jadwal: { tanggal: selectedDate, waktu: `${inputHour}:${inputMinute}` },
      totalPembayaran: total,
      ratingMitra: params.rating,
    };

    router.push({
      pathname: '/contact-detail',
      params: { prevPayload: JSON.stringify(orderData) },
    });
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#633594" />
        <Text style={{ marginTop: 10, color: '#666' }}>Mohon tunggu...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* HEADER */}
      <View style={styles.customHeader}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {typeof params.title === 'string'
              ? params.title.toUpperCase()
              : 'DETAIL PESANAN'}
          </Text>
          <View style={{ width: 34 }} />
        </View>
      </View>

      {/* BANNER NOTIFIKASI TUTUP - Hanya untuk yang tidak di-hidden */}
      {isClosed && !isTimeHidden() && (
        <View
          style={{
            backgroundColor: '#FFF1F2',
            padding: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="alert-circle" size={18} color="#E11D48" />
          <Text
            style={{
              color: '#E11D48',
              marginLeft: 8,
              fontSize: 13,
              fontWeight: '600',
            }}>
            Yah, mitra sudah tutup coba besok lagi ya
          </Text>
        </View>
      )}

      {/* OVERLAY PADA SCROLLVIEW JIKA TUTUP */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        style={isClosed && !isTimeHidden() ? { opacity: 0.6 } : null}>

        {/* ACCORDION SYARAT & KETENTUAN */}
        <View style={styles.termsSection}>
          <TouchableOpacity
            style={styles.termsHeader}
            onPress={toggleTerms}
            activeOpacity={0.7}>
            <Text style={styles.termsTitle}>Syarat & Ketentuan</Text>
            <Ionicons
              name={showTerms ? 'chevron-down' : 'chevron-forward'}
              size={20}
              color="#64748B"
            />
          </TouchableOpacity>
          {showTerms && (
            <View style={styles.termsContent}>
              <Text style={styles.contentLabel}>{currentTerms.equipmentLabel}</Text>
              <View style={styles.bulletList}>
                {currentTerms.equipment.map((item, index) => (
                  <Text key={index} style={styles.bulletItem}>• {item}</Text>
                ))}
              </View>
              <View style={styles.dividerSmall} />
              <Text style={styles.sectionHeading}>Layanan ini meliputi:</Text>
              {currentTerms.includes.map((item, index) => (
                <Text key={`inc-${index}`} style={styles.textCheck}>✅ {item}</Text>
              ))}
              <View style={styles.dividerSmall} />
              <Text style={styles.sectionHeading}>Layanan ini tidak termasuk:</Text>
              {currentTerms.excludes.map((item, index) => (
                <Text key={`exc-${index}`} style={styles.textCross}>❌ {item}</Text>
              ))}
              <View style={styles.dividerSmall} />
              <Text style={styles.sectionHeading}>Note:</Text>
              {currentTerms.notes.map((item, index) => (
                <Text key={`exc-${index}`} style={styles.textCross}>{item}</Text>
              ))}
            </View>
          )}
        </View>

        {/* 1. PILIH JASA LAYANAN */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pilih Jasa Layanan*</Text>
          <Text style={styles.sectionSubtitle}>Daftar layanan dari vendor ini</Text>
          <View style={styles.optionsContainer}>
            {subServices.length > 0 ? (
              subServices.map((item: any) => (
                <ServiceOptionCard
                  key={item.id.toString()}
                  item={{
                    id: item.id,
                    name: item.service_name,
                    price: item.price,
                    image: item.display_image,
                  }}
                  quantity={selectedItems[item.id] || 0}
                  onAdd={() =>
                    !isClosed &&
                    setSelectedItems({
                      ...selectedItems,
                      [item.id]: (selectedItems[item.id] || 0) + 1,
                    })
                  }
                  onRemove={() =>
                    !isClosed &&
                    setSelectedItems({
                      ...selectedItems,
                      [item.id]: Math.max(0, (selectedItems[item.id] || 0) - 1),
                    })
                  }
                />
              ))
            ) : (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <Ionicons name="alert-circle-outline" size={40} color="#ccc" />
                <Text style={{ color: '#999', marginTop: 10 }}>Belum ada daftar layanan.</Text>
              </View>
            )}
          </View>
        </View>

        {/* 2. JENIS GEDUNG */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Jenis Gedung *</Text>
          <View style={styles.row}>
            {['Rumah', 'Apartemen', 'Kantor', 'Resto'].map(type => (
              <TouchableOpacity
                key={type}
                disabled={isClosed && !isTimeHidden()}
                style={[styles.typeBtn, buildingType === type && styles.typeBtnActive]}
                onPress={() => setBuildingType(type)}>
                <Text
                  style={[styles.typeBtnText, buildingType === type && styles.typeBtnTextActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 3. WAKTU - HANYA UNTUK KATEGORI YANG TIDAK DI-HIDDEN (CLEANING, ART) */}
        {!isTimeHidden() && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pukul berapa membutuhkan layanan *</Text>
            <View style={styles.timeInputContainer}>
              <TextInput
                style={styles.timeInput}
                value={inputHour}
                onChangeText={t => setInputHour(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={styles.timeSeparator}>:</Text>
              <TextInput
                style={styles.timeInput}
                value={inputMinute}
                onChangeText={t => setInputMinute(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
          </View>
        )}

        {/* NOTES KHUSUS UNTUK VENDOR AC SERVICE */}
        {isACServiceVendor() && (
          <View style={styles.notesSection}>
            <View style={styles.notesContainer}>
              <Ionicons name="information-circle-outline" size={20} color="#633594" />
              <Text style={styles.notesTitle}>Informasi Penting</Text>
            </View>
            <Text style={styles.notesText}>
              • Teknisi akan menghubungi Anda maksimal 1x24 jam untuk konfirmasi jadwal kunjungan
            </Text>
            <Text style={styles.notesText}>
              • Waktu kunjungan akan disesuaikan dengan jadwal teknisi di area Anda
            </Text>
            <Text style={styles.notesText}>
              • Pastikan nomor telepon yang terdaftar aktif dan dapat dihubungi
            </Text>
            <Text style={styles.notesText}>
              • Estimasi waktu pengerjaan: Pagi (08.00-11.00), Siang (11.00-14.00), Sore (14.00-16.00)
            </Text>
          </View>
        )}

        {/* 4. KALENDER */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pilih tanggal pesan layanan *</Text>
          <Calendar
            minDate={today}
            onDayPress={(day: any) => setSelectedDate(day.dateString)}
            markedDates={{
              [selectedDate]: { selected: true, selectedColor: '#633594' },
            }}
            theme={{
              todayTextColor: '#633594',
              selectedDayBackgroundColor: '#633594',
              arrowColor: '#633594',
            }}
          />
        </View>
      </ScrollView>

      {/* BOTTOM BAR */}
      <View style={styles.bottomBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.totalLabel}>Total Estimasi</Text>
          <Text style={styles.totalValue}>Rp{(total || 0).toLocaleString('id-ID')}</Text>
          <TouchableOpacity
            onPress={() =>
              showInfoToast('Biaya operasional untuk pengembangan aplikasi TangerangFast.')
            }>
            <Text style={[styles.minOrder, { color: '#633594', textDecorationLine: 'none' }]}>
              Belum termasuk biaya layanan ⓘ
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.btnPesan, (isClosed && !isTimeHidden()) && { backgroundColor: '#94A3B8' }]}
          onPress={handleNext}>
          <Text style={styles.btnPesanText}>
            {(isClosed && !isTimeHidden()) ? 'Mitra Tutup' : 'Lanjutkan'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* IOS TOAST FALLBACK */}
      {toastVisible && Platform.OS !== 'android' && (
        <View
          style={{
            position: 'absolute',
            bottom: 100,
            alignSelf: 'center',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: 12,
            borderRadius: 20,
          }}>
          <Text style={{ color: '#fff' }}>{toastMsg}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 5,
    color: '#1F2937',
  },
  sectionSubtitle: { fontSize: 12, color: '#6B7280', marginBottom: 15 },
  optionsContainer: {
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', gap: 12 },
  typeBtn: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    alignItems: 'center',
  },
  typeBtnActive: { borderColor: '#633594', backgroundColor: '#F5F3FF' },
  typeBtnText: { color: '#4B5563', fontSize: 14 },
  typeBtnTextActive: { color: '#633594', fontWeight: 'bold' },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 5,
    backgroundColor: '#F9FAFB',
  },
  timeInput: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 60,
    color: '#1F2937',
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#633594',
    marginHorizontal: 10,
  },
  bottomBar: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    position: 'absolute',
    bottom: 0,
    width: '100%',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  totalLabel: { fontSize: 11, color: '#6B7280', textTransform: 'uppercase' },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: '#633594' },
  minOrder: { fontSize: 10, color: '#EF4444', marginTop: 2 },
  btnPesan: {
    backgroundColor: '#633594',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
  },
  btnPesanText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  customHeader: {
    backgroundColor: '#633594',
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
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
    marginRight: 10,
  },
  termsSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
    borderWidth: Platform.OS === 'ios' ? 1 : 0,
    borderColor: '#F1F5F9',
  },
  termsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  termsContent: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  termsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  contentLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 8,
  },
  bulletList: { paddingLeft: 8, marginBottom: 12 },
  bulletItem: { fontSize: 13, color: '#64748B', lineHeight: 20 },
  sectionHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 8,
    marginBottom: 6,
  },
  textCheck: { fontSize: 13, color: '#334155', marginBottom: 4, lineHeight: 18 },
  textCross: { fontSize: 13, color: '#64748B', marginBottom: 4, lineHeight: 18 },
  dividerSmall: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  // Style untuk notes section
  notesSection: {
    marginHorizontal: 20,
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#633594',
  },
  notesText: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 8,
    lineHeight: 18,
    paddingLeft: 4,
  },
});

export default OrderDetailScreen;