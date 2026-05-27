import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Image,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Toast from 'react-native-toast-message';

// ─── Types ────────────────────────────────────────────────────────────────────
type TabKey = 'Deskripsi' | 'Perilaku' | 'Analisa';

// ─── Tab Content Components ───────────────────────────────────────────────────

const Row = ({ label, value }: { label: string; value: string }) => (
    <Text style={styles.rowText}>
        <Text style={styles.rowLabel}>{label} : </Text>
        {value}
    </Text>
);

const SectionTitle = ({ title }: { title: string }) => (
    <Text style={styles.sectionTitle}>{title}</Text>
);

const Divider = () => <View style={styles.divider} />;

// Tab 1: Deskripsi
const TabDeskripsi = ({ kandidat }: { kandidat: any }) => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.kandidatName}>{kandidat.nama}</Text>
        <Row label="Nama" value={kandidat.namaLengkap} />
        <Row label="BB" value={`${kandidat.beratBadan} kg`} />
        <Row label="TB" value={`${kandidat.tinggiBadan} cm`} />
        <Row label="Asal" value={kandidat.asal} />
        <Row label="Suku" value={kandidat.suku} />
        <Row label="Agama" value={kandidat.agama} />
        <Row label="Status Pernikahan" value={kandidat.statusPernikahan} />
        <Row label="Jumlah dan Usia Anak" value={kandidat.infoAnak} />
        <Row label="Posisi Saat Ini" value={kandidat.posisiSaatIni} />

        <Divider />
        <SectionTitle title="Pengalaman Bekerja :" />
        {kandidat.pengalamanDetail.map((p: string, i: number) => (
            <Text key={i} style={styles.rowText}>{'– ' + p}</Text>
        ))}
        <Row label="Minat Bekerja" value={kandidat.minatBekerja} />

        <Divider />
        <Row label="Apakah Merokok" value={kandidat.merokok} />
        <Row label="Apakah Bertato" value={kandidat.bertato} />
        <Row label="Bisa Naik Motor" value={kandidat.bisaNaikMotor} />
        <Row label="Mabuk Kendaraan" value={kandidat.mabukKendaraan} />
        <Row label="Bisa Jaga Anak Dari Usia" value={kandidat.bisaJagaAnak} />
        <Row label="Bisa Masak Rumahan" value={kandidat.bisaMasakRumahan} />
        <Row label="Bisa Masak Makanan Anak" value={kandidat.bisaMasakAnakKecil} />
    </ScrollView>
);

// Tab 2: Perilaku
const TabPerilaku = ({ kandidat }: { kandidat: any }) => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
        <SectionTitle title="Karakter & Kepribadian" />
        <Row label="Sifat Dominan" value={kandidat.perilaku.sifatDominan} />
        <Row label="Cara Berkomunikasi" value={kandidat.perilaku.caraBerkomunikasi} />
        <Row label="Sikap Terhadap Atasan" value={kandidat.perilaku.sikapAtasan} />
        <Row label="Cara Menyelesaikan Konflik" value={kandidat.perilaku.caraMenyelesaikanKonflik} />

        <Divider />
        <SectionTitle title="Kebiasaan Sehari-hari" />
        <Row label="Jam Tidur" value={kandidat.perilaku.jamTidur} />
        <Row label="Kegiatan Waktu Luang" value={kandidat.perilaku.kegiatanLuang} />
        <Row label="Hobi" value={kandidat.perilaku.hobi} />
        <Row label="Kebiasaan Pagi" value={kandidat.perilaku.kebiasaanPagi} />

        <Divider />
        <SectionTitle title="Etos Kerja" />
        <Row label="Ketepatan Waktu" value={kandidat.perilaku.ketepatanWaktu} />
        <Row label="Kemampuan Multitasking" value={kandidat.perilaku.multitasking} />
        <Row label="Inisiatif" value={kandidat.perilaku.inisiatif} />
        <Row label="Kemampuan Belajar" value={kandidat.perilaku.kemampuanBelajar} />
        <Row label="Kepatuhan SOP" value={kandidat.perilaku.kepatuhanSOP} />
    </ScrollView>
);

// Tab 3: Analisa
const TabAnalisa = ({ kandidat }: { kandidat: any }) => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
        <SectionTitle title="Penilaian Psikologi" />
        <Row label="Stabilitas Emosi" value={kandidat.analisa.stabilitasEmosi} />
        <Row label="Tingkat Stres" value={kandidat.analisa.tingkatStres} />
        <Row label="Kemampuan Adaptasi" value={kandidat.analisa.adaptasi} />
        <Row label="Motivasi Bekerja" value={kandidat.analisa.motivasi} />

        <Divider />
        <SectionTitle title="Kompetensi" />
        <Row label="Kerapian Bekerja" value={kandidat.analisa.kerapian} />
        <Row label="Ketelitian" value={kandidat.analisa.ketelitian} />
        <Row label="Tanggung Jawab" value={kandidat.analisa.tanggungJawab} />
        <Row label="Kejujuran" value={kandidat.analisa.kejujuran} />

        <Divider />
        <SectionTitle title="Rekomendasi" />
        <Text style={[styles.rowText, { lineHeight: 22 }]}>{kandidat.analisa.rekomendasi}</Text>

        <Divider />
        <SectionTitle title="Cocok Untuk" />
        {kandidat.analisa.cocokUntuk.map((item: string, i: number) => (
            <Text key={i} style={styles.rowText}>{'✓ ' + item}</Text>
        ))}
    </ScrollView>
);

// ─── Dummy Full Kandidat Data ─────────────────────────────────────────────────
const DUMMY_DETAIL: Record<string, any> = {
    '1': {
        id: '1',
        nama: 'Siti Rahayu',
        namaLengkap: 'Siti Rahayu Ningsih',
        foto: 'https://randomuser.me/api/portraits/women/44.jpg',
        level: 'Junior',
        layanan: 'ART',
        umur: 32,
        beratBadan: 58,
        tinggiBadan: 158,
        asal: 'Lampung Selatan',
        suku: 'Jawa',
        agama: 'Islam',
        statusPernikahan: 'Menikah, tidak ada masalah keluarga',
        infoAnak: 'Anak 2, 8 tahun dan 5 tahun',
        posisiSaatIni: 'Kebayoran Lama, Jakarta Selatan, Rumah',
        pengalamanDetail: [
            '2 tahun di Kebayoran Lama tahun 2022-2024 (Beberes, Masak)',
            '1 tahun di Ciputat tahun 2021-2022 (Jaga Anak)',
        ],
        minatBekerja: 'ART Beberes Masak',
        merokok: 'Tidak',
        bertato: 'Tidak',
        bisaNaikMotor: 'Bisa, Matic',
        mabukKendaraan: 'Tidak',
        bisaJagaAnak: 'Bisa dari usia 3 tahun ke atas',
        bisaMasakRumahan: 'Masak Sederhana',
        bisaMasakAnakKecil: 'Bisa',
        gajiMin: 1500000,
        gajiMax: 2500000,
        perilaku: {
            sifatDominan: 'Teliti, sabar, dan ramah',
            caraBerkomunikasi: 'Sopan, suka mendengar arahan',
            sikapAtasan: 'Patuh dan mudah diberi instruksi',
            caraMenyelesaikanKonflik: 'Musyawarah, tidak mudah emosi',
            jamTidur: 'Pukul 21.00 – 05.00',
            kegiatanLuang: 'Membaca, berkebun kecil-kecilan',
            hobi: 'Memasak dan menjahit',
            kebiasaanPagi: 'Bangun pagi, langsung bersihkan dapur',
            ketepatanWaktu: 'Sangat disiplin',
            multitasking: 'Cukup baik, bisa handle 2-3 pekerjaan sekaligus',
            inisiatif: 'Tinggi, sering bekerja tanpa perlu diingatkan',
            kemampuanBelajar: 'Cepat belajar hal baru',
            kepatuhanSOP: 'Sangat patuh terhadap aturan rumah tangga',
        },
        analisa: {
            stabilitasEmosi: 'Stabil, jarang emosi di tempat kerja',
            tingkatStres: 'Rendah, mampu mengelola tekanan dengan baik',
            adaptasi: 'Tinggi, cepat menyesuaikan lingkungan baru',
            motivasi: 'Bekerja untuk keluarga dan anak-anak',
            kerapian: 'Sangat rapi, perhatian pada detail kebersihan',
            ketelitian: 'Teliti dalam setiap pekerjaan',
            tanggungJawab: 'Tinggi, selalu menyelesaikan tugas tepat waktu',
            kejujuran: 'Sangat jujur, track record bersih',
            rekomendasi:
                'Kandidat ini sangat direkomendasikan untuk keluarga yang membutuhkan ART dengan kemampuan masak dan beberes yang baik. Cocok untuk keluarga dengan anak kecil.',
            cocokUntuk: [
                'Keluarga dengan anak usia 3 tahun ke atas',
                'Rumah tangga yang butuh memasak harian',
                'Majikan yang aktif bekerja dari pagi hingga sore',
            ],
        },
    },
    '2': {
        id: '2',
        nama: 'Dewi Lestari',
        namaLengkap: 'Dewi Lestari Putri',
        foto: 'https://randomuser.me/api/portraits/women/68.jpg',
        level: 'Medior',
        layanan: 'Babysitter',
        umur: 28,
        beratBadan: 52,
        tinggiBadan: 155,
        asal: 'Jawa Tengah',
        suku: 'Jawa',
        agama: 'Islam',
        statusPernikahan: 'Belum menikah',
        infoAnak: 'Tidak ada',
        posisiSaatIni: 'Cilandak, Jakarta Selatan, Kos',
        pengalamanDetail: [
            '3 tahun di Cilandak tahun 2020-2023 (Jaga Bayi, Babysitter)',
            '2 tahun di Depok tahun 2018-2020 (Jaga Anak 0-3 tahun)',
        ],
        minatBekerja: 'Babysitter, Jaga Bayi',
        merokok: 'Tidak',
        bertato: 'Tidak',
        bisaNaikMotor: 'Tidak Bisa',
        mabukKendaraan: 'Tidak',
        bisaJagaAnak: 'Bisa dari usia 0 bulan',
        bisaMasakRumahan: 'Bisa Masak Sederhana',
        bisaMasakAnakKecil: 'Bisa, sudah berpengalaman MPASI',
        gajiMin: 2000000,
        gajiMax: 3500000,
        perilaku: {
            sifatDominan: 'Penyayang, sabar luar biasa, dan responsif',
            caraBerkomunikasi: 'Hangat dan penuh empati',
            sikapAtasan: 'Kooperatif dan terbuka terhadap masukan',
            caraMenyelesaikanKonflik: 'Tenang, mencari solusi win-win',
            jamTidur: 'Fleksibel, bisa siaga malam',
            kegiatanLuang: 'Bermain dengan anak asuh, menonton video parenting',
            hobi: 'Melukis dan bercerita',
            kebiasaanPagi: 'Olahraga ringan, siapkan sarapan bayi',
            ketepatanWaktu: 'Sangat disiplin',
            multitasking: 'Sangat baik dalam situasi darurat bayi',
            inisiatif: 'Tinggi dalam urusan tumbuh kembang anak',
            kemampuanBelajar: 'Aktif ikut kelas parenting online',
            kepatuhanSOP: 'Patuh pada jadwal dan rutinitas bayi',
        },
        analisa: {
            stabilitasEmosi: 'Sangat stabil, tidak mudah panik',
            tingkatStres: 'Rendah, terbiasa dengan tangisan bayi',
            adaptasi: 'Sangat tinggi, pernah kerja di 3 kota berbeda',
            motivasi: 'Panggilan jiwa untuk merawat anak-anak',
            kerapian: 'Rapi dan terorganisir dalam jadwal bayi',
            ketelitian: 'Sangat teliti dalam pemberian makan dan obat',
            tanggungJawab: 'Sangat tinggi, siaga 24 jam',
            kejujuran: 'Terpercaya, pernah dikasih kepercayaan penuh oleh majikan',
            rekomendasi:
                'Kandidat terbaik untuk keluarga dengan bayi baru lahir hingga balita. Pengalaman MPASI dan siaga malam menjadi nilai tambah besar.',
            cocokUntuk: [
                'Keluarga dengan bayi 0–3 tahun',
                'Orang tua yang keduanya bekerja full time',
                'Keluarga yang butuh babysitter siaga malam',
            ],
        },
    },
};

// Fallback data untuk kandidat yang tidak ada detail spesifik
const generateFallback = (kandidat: any) => ({
    ...kandidat,
    namaLengkap: kandidat.nama + ' Putri',
    beratBadan: 55,
    tinggiBadan: 157,
    suku: 'Jawa',
    agama: 'Islam',
    statusPernikahan: 'Menikah, tidak ada masalah keluarga',
    infoAnak: 'Anak 2, 7 tahun dan 4 tahun',
    posisiSaatIni: 'Jakarta Selatan, Rumah',
    pengalamanDetail: [
        `${kandidat.pengalaman} di Jakarta (Beberes, Masak)`,
    ],
    minatBekerja: kandidat.layanan + ' Beberes Masak',
    merokok: 'Tidak',
    bertato: 'Tidak',
    bisaNaikMotor: 'Bisa, Matic',
    mabukKendaraan: 'Tidak',
    bisaJagaAnak: 'Bisa dari usia 2 tahun ke atas',
    bisaMasakRumahan: 'Masak Sederhana',
    bisaMasakAnakKecil: 'Bisa',
    perilaku: {
        sifatDominan: 'Teliti, rajin, dan jujur',
        caraBerkomunikasi: 'Sopan dan terbuka',
        sikapAtasan: 'Patuh dan menghormati',
        caraMenyelesaikanKonflik: 'Musyawarah dan sabar',
        jamTidur: 'Pukul 22.00 – 05.00',
        kegiatanLuang: 'Membaca dan memasak',
        hobi: 'Berkebun dan memasak',
        kebiasaanPagi: 'Bangun awal, langsung bersihkan rumah',
        ketepatanWaktu: 'Disiplin',
        multitasking: 'Baik',
        inisiatif: 'Cukup tinggi',
        kemampuanBelajar: 'Cepat',
        kepatuhanSOP: 'Patuh',
    },
    analisa: {
        stabilitasEmosi: 'Stabil',
        tingkatStres: 'Rendah',
        adaptasi: 'Tinggi',
        motivasi: 'Bekerja untuk keluarga',
        kerapian: 'Rapi',
        ketelitian: 'Teliti',
        tanggungJawab: 'Tinggi',
        kejujuran: 'Jujur dan terpercaya',
        rekomendasi: 'Kandidat ini cocok untuk keluarga yang membutuhkan bantuan rumah tangga sehari-hari dengan pengalaman yang memadai.',
        cocokUntuk: [
            'Keluarga aktif bekerja',
            'Rumah tangga dengan anak kecil',
            'Pasangan muda yang membutuhkan ART handal',
        ],
    },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DetailKandidatScreen() {
    const router = useRouter();

    // Semua params dari halaman-halaman sebelumnya
    const params = useLocalSearchParams<{
        // Dari halaman 1 (ArtBabysitter)
        kategori: string;
        layanan: string;
        jobdesk: string;
        // Dari halaman 2 (DetailKontak)
        nama: string;
        email: string;
        noHp: string;
        nikKtp: string;
        lokasi: string;
        alamatLengkap: string;
        latitude: string;
        longitude: string;
        // Dari halaman 3 (Kandidat) — kandidat yang diklik
        kandidatId: string;
        kandidatNama: string;
        kandidatFoto: string;
        kandidatLevel: string;
        kandidatLayanan: string;
        kandidatUmur: string;
        kandidatAsal: string;
        kandidatPengalaman: string;
        kandidatGajiMin: string;
        kandidatGajiMax: string;
    }>();

    const [activeTab, setActiveTab] = useState<TabKey>('Deskripsi');

    // Ambil detail kandidat dari dummy, fallback ke generate
    const baseKandidat = {
        id: params.kandidatId,
        nama: params.kandidatNama,
        foto: params.kandidatFoto,
        level: params.kandidatLevel,
        layanan: params.kandidatLayanan,
        umur: parseInt(params.kandidatUmur || '0'),
        asal: params.kandidatAsal,
        pengalaman: params.kandidatPengalaman,
        gajiMin: parseInt(params.kandidatGajiMin || '0'),
        gajiMax: parseInt(params.kandidatGajiMax || '0'),
    };

    const kandidat =
        DUMMY_DETAIL[params.kandidatId] ||
        generateFallback(baseKandidat);

    const formatGaji = (num: number) =>
        (num / 1000000).toFixed(1).replace('.0', '') + 'jt';

    const handlePilih = () => {
        const finalData = {
            // Halaman 1
            order: {
                kategori: params.kategori,
                layanan: params.layanan,
                jobdesk: params.jobdesk,
            },
            // Halaman 2
            kontak: {
                nama: params.nama,
                email: params.email,
                noHp: params.noHp,
                nikKtp: params.nikKtp,
                lokasi: params.lokasi,
                alamatLengkap: params.alamatLengkap,
                latitude: params.latitude,
                longitude: params.longitude,
            },
            // Halaman 3 + 4 (kandidat lengkap)
            kandidat: {
                id: kandidat.id,
                nama: kandidat.nama,
                namaLengkap: kandidat.namaLengkap,
                foto: kandidat.foto,
                level: kandidat.level,
                layanan: kandidat.layanan,
                umur: kandidat.umur,
                beratBadan: kandidat.beratBadan,
                tinggiBadan: kandidat.tinggiBadan,
                asal: kandidat.asal,
                suku: kandidat.suku,
                agama: kandidat.agama,
                statusPernikahan: kandidat.statusPernikahan,
                minatBekerja: kandidat.minatBekerja,
                gajiMin: kandidat.gajiMin,
                gajiMax: kandidat.gajiMax,
                merokok: kandidat.merokok,
                bertato: kandidat.bertato,
                bisaNaikMotor: kandidat.bisaNaikMotor,
            },
        };

        console.log('');
        console.log('╔══════════════════════════════════════════╗');
        console.log('║         DATA LENGKAP SEMUA HALAMAN       ║');
        console.log('╚══════════════════════════════════════════╝');
        console.log('');
        console.log('📋 [HALAMAN 1] Jenis Order:');
        console.log('   Kategori    :', finalData.order.kategori);
        console.log('   Layanan     :', finalData.order.layanan);
        console.log('   Jobdesk     :', finalData.order.jobdesk);
        console.log('');
        console.log('📞 [HALAMAN 2] Kontak & Lokasi:');
        console.log('   Nama        :', finalData.kontak.nama);
        console.log('   Email       :', finalData.kontak.email);
        console.log('   No HP       :', finalData.kontak.noHp);
        console.log('   NIK KTP     :', finalData.kontak.nikKtp);
        console.log('   Lokasi      :', finalData.kontak.lokasi);
        console.log('   Alamat      :', finalData.kontak.alamatLengkap);
        console.log('   Koordinat   :', finalData.kontak.latitude, ',', finalData.kontak.longitude);
        console.log('');
        console.log('👤 [HALAMAN 3 & 4] Kandidat Dipilih:');
        console.log('   ID          :', finalData.kandidat.id);
        console.log('   Nama        :', finalData.kandidat.nama);
        console.log('   Nama Lengkap:', finalData.kandidat.namaLengkap);
        console.log('   Level       :', finalData.kandidat.level);
        console.log('   Layanan     :', finalData.kandidat.layanan);
        console.log('   Umur        :', finalData.kandidat.umur, 'tahun');
        console.log('   BB / TB     :', finalData.kandidat.beratBadan, 'kg /', finalData.kandidat.tinggiBadan, 'cm');
        console.log('   Asal        :', finalData.kandidat.asal);
        console.log('   Suku        :', finalData.kandidat.suku);
        console.log('   Agama       :', finalData.kandidat.agama);
        console.log('   Gaji        :', formatGaji(finalData.kandidat.gajiMin), '-', formatGaji(finalData.kandidat.gajiMax));
        console.log('   Merokok     :', finalData.kandidat.merokok);
        console.log('   Bertato     :', finalData.kandidat.bertato);
        console.log('   Naik Motor  :', finalData.kandidat.bisaNaikMotor);
        console.log('');
        console.log('📦 Full JSON Object:');
        console.log(JSON.stringify(finalData, null, 2));
        console.log('══════════════════════════════════════════');

        Toast.show({
            type: 'success',
            text1: 'Kandidat Dipilih!',
            text2: `${kandidat.nama} berhasil dipilih`,
            position: 'top',
        });

        // Navigasi ke halaman summary/konfirmasi
        router.push({
            pathname: '/order/summary',
            params: { payload: JSON.stringify(finalData) },
        });
    };

    const TABS: TabKey[] = ['Deskripsi', 'Perilaku', 'Analisa'];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            <StatusBar barStyle="light-content" backgroundColor="#3b5bdb" />

            {/* ── Header ─────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.6 : 1 }]}
                >
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </Pressable>
                <Text style={styles.headerTitle}>Detail Kandidat</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>

                {/* ── Hero Image ──────────────────────────────────────────── */}
                <View style={styles.heroWrapper}>
                    <Image
                        source={{ uri: kandidat.foto }}
                        style={styles.heroImage}
                        resizeMode="cover"
                    />
                    {/* Layanan badge top-left */}
                    <View style={styles.layananBadge}>
                        <Text style={styles.layananBadgeText}>{kandidat.layanan}</Text>
                    </View>
                    {/* Logo top-right */}
                    <View style={styles.logoBox}>
                        <Text style={styles.logoLetter}>C</Text>
                        <Text style={styles.logoSub}>CICANA</Text>
                    </View>
                </View>

                {/* ── Gaji & Level Strip ──────────────────────────────────── */}
                <View style={styles.infoStrip}>
                    <View style={styles.infoStripItem}>
                        <Ionicons name="cash-outline" size={14} color="#3b5bdb" />
                        <Text style={styles.infoStripText}>
                            Rp {(kandidat.gajiMin / 1000000).toFixed(1)}jt – {(kandidat.gajiMax / 1000000).toFixed(1)}jt
                        </Text>
                    </View>
                    <View style={styles.infoStripDot} />
                    <View style={styles.infoStripItem}>
                        <Ionicons name="ribbon-outline" size={14} color="#3b5bdb" />
                        <Text style={styles.infoStripText}>{kandidat.level}</Text>
                    </View>
                    <View style={styles.infoStripDot} />
                    <View style={styles.infoStripItem}>
                        <Ionicons name="time-outline" size={14} color="#3b5bdb" />
                        <Text style={styles.infoStripText}>{kandidat.pengalaman}</Text>
                    </View>
                </View>

                {/* ── Tabs ────────────────────────────────────────────────── */}
                <View style={styles.tabBar}>
                    {TABS.map((tab) => (
                        <Pressable
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            style={styles.tabItem}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                {tab}
                            </Text>
                            {activeTab === tab && <View style={styles.tabUnderline} />}
                        </Pressable>
                    ))}
                </View>

                {/* ── Tab Content ─────────────────────────────────────────── */}
                {activeTab === 'Deskripsi' && <TabDeskripsi kandidat={kandidat} />}
                {activeTab === 'Perilaku' && <TabPerilaku kandidat={kandidat} />}
                {activeTab === 'Analisa' && <TabAnalisa kandidat={kandidat} />}
            </ScrollView>

            {/* ── Bottom Button ───────────────────────────────────────────── */}
            <View style={styles.bottomBar}>
                <Pressable
                    onPress={handlePilih}
                    style={({ pressed }) => [
                        styles.btnPilih,
                        { backgroundColor: pressed ? '#2f4ec7' : '#3b5bdb' },
                    ]}
                >
                    <Text style={styles.btnPilihText}>Pilih Kandidat</Text>
                </Pressable>
            </View>

            <Toast />
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    header: {
        backgroundColor: '#3b5bdb',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    backButton: { width: 40, alignItems: 'flex-start', justifyContent: 'center' },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: '700', textAlign: 'center', flex: 1 },

    // Hero
    heroWrapper: { width: '100%', height: 280, position: 'relative', backgroundColor: '#6d28d9' },
    heroImage: { width: '100%', height: '100%' },
    layananBadge: {
        position: 'absolute', top: 16, left: 0,
        backgroundColor: '#14b8a6',
        paddingHorizontal: 16, paddingVertical: 6,
        borderTopRightRadius: 20, borderBottomRightRadius: 20,
    },
    layananBadgeText: { color: 'white', fontWeight: '700', fontSize: 13 },
    logoBox: {
        position: 'absolute', top: 12, right: 12,
        backgroundColor: 'white',
        borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
        alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
    },
    logoLetter: { fontSize: 14, fontWeight: '900', color: '#3b5bdb', lineHeight: 18 },
    logoSub: { fontSize: 7, fontWeight: '700', color: '#6b7280', letterSpacing: 1 },

    // Info strip
    infoStrip: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 10, backgroundColor: '#f8faff',
        borderBottomWidth: 1, borderBottomColor: '#e5e9f2',
    },
    infoStripItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    infoStripText: { fontSize: 12, color: '#374151', fontWeight: '600' },
    infoStripDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', marginHorizontal: 10 },

    // Tabs
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1, borderBottomColor: '#e5e9f2',
        backgroundColor: 'white',
    },
    tabItem: { flex: 1, alignItems: 'center', paddingVertical: 14, position: 'relative' },
    tabText: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },
    tabTextActive: { color: '#3b5bdb', fontWeight: '700' },
    tabUnderline: {
        position: 'absolute', bottom: 0, left: '20%', right: '20%',
        height: 3, backgroundColor: '#3b5bdb', borderRadius: 2,
    },

    // Tab content
    tabContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    kandidatName: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 8 },
    rowText: { fontSize: 13, color: '#374151', lineHeight: 22 },
    rowLabel: { fontWeight: '600', color: '#111827' },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 6, marginTop: 4 },
    divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },

    // Bottom
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 28 : 16,
        borderTopWidth: 1, borderTopColor: '#f1f5f9',
    },
    btnPilih: {
        borderRadius: 12, paddingVertical: 16, alignItems: 'center',
        shadowColor: '#3b5bdb', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
    },
    btnPilihText: { color: 'white', fontSize: 16, fontWeight: '700' },
});