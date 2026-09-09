import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────
type KategoriType = "Menginap" | "Pulang Pergi" | "Inval";
type LayananType = "ART" | "Babysitter";

interface FormState {
    kategori: KategoriType;
    layanan: LayananType;
    jobdesk: string;
}

// ─── T&C Content ───────────────────────────────────────────────────────────
interface TncPoint {
    text: string;
}
interface TncSection {
    no: string | number;
    title: string;
    points: string[];
}

const GENERAL_TERMS: TncSection[] = [
    {
        no: 1,
        title: "Pendahuluan",
        points: [
            "Persetujuan Mengikat: Dengan mendaftar dan menggunakan platform CICANA (PT. Cicana Indonesia Corp), Anda otomatis terikat dan menyetujui seluruh syarat dan ketentuan yang berlaku.",
            "Syarat Pengguna: Pengguna diwajibkan berusia minimal 18 tahun dan bertanggung jawab penuh atas segala aktivitas atau keputusan di dalam platform.",
            "Batas Tanggung Jawab: Perusahaan tidak bertanggung jawab atas transaksi apa pun yang dilakukan di luar sepengetahuan platform resmi CICANA.",
        ],
    },
    {
        no: 2,
        title: "Pembukaan dan Pengaksesan Akun Cicana",
        points: [
            'Pendaftaran Wajib: Anda harus menyetujui Ketentuan Penggunaan pada menu "Registrasi".',
            "Pembaruan Data: Informasi profil dapat diubah kapan saja melalui menu pengaturan.",
            "Proses Login: Jika keluar akun (logout), Anda bisa masuk kembali menggunakan email; sistem akan otomatis mengirimkan verifikasi/akses ke nomor HP terdaftar Anda.",
        ],
    },
    {
        no: 3,
        title: "Pemesanan, Biaya dan Pembayaran",
        points: [
            "Sistem Berlangganan & Tarif: Akses layanan mewajibkan Anda berlangganan. Tarif tertera di website, dibayar secara elektronik, dan dapat berubah sewaktu-waktu menyesuaikan kondisi atau regulasi.",
            "Penolakan Transaksi: Cicana berhak menolak atau menunda proses pembayaran jika terindikasi adanya kecurangan, penipuan, atau pelanggaran hukum.",
            "Sanksi Keterlambatan: Apabila pembayaran melewati batas waktu, Cicana berhak menagih secara paksa dan menarik kembali layanan yang sedang atau telah diberikan.",
        ],
    },
    {
        no: 4,
        title: "Konten, Informasi, Promosi",
        points: [
            "Ketentuan Khusus: Penggunaan setiap promo atau voucher tunduk pada syarat dan ketentuannya masing-masing. Pengguna diharapkan periksa rincian sebelum menggunakan.",
            "Tidak Bisa Diuangkan: Semua bentuk penawaran/voucher tidak dapat ditukarkan dengan uang tunai.",
            "Batas Waktu: Setiap penawaran memiliki masa berlaku yang terbatas sesuai ketentuan promo tersebut.",
        ],
    },
    {
        no: 5,
        title: "Informasi Pribadi atau Data Pelanggan",
        points: [
            "Pengumpulan, penyimpanan, pengolahan, penggunaan dan pembagian informasi pribadi Anda, seperti data identitas, data kontak, dan data lokasi Anda yang Anda berikan ketika Anda membuka Akun tunduk pada Syarat dan Ketentuan Penggunaan ini.",
        ],
    },
    {
        no: 6,
        title: "Instrumen Layanan",
        points: [
            "Kanal Resmi: Layanan CICANA hanya beroperasi melalui aplikasi Tangfast mitra resmi Cicana, website resmi (cicana.co), dan nomor-nomor WhatsApp yang tertera di website tersebut (untuk CS, pengaduan, dll).",
            "Batas Tanggung Jawab: Perusahaan tidak bertanggung jawab atas kejadian apa pun apabila Anda berinteraksi dengan nomor WhatsApp tidak resmi yang mengatasnamakan CICANA.",
        ],
    },
    {
        no: 7,
        title: "Akun Pengguna",
        points: [
            "Kepemilikan Pribadi: Akun tidak boleh dipindahtangankan atau dipinjamkan. Kami berhak menolak transaksi jika hal ini dilanggar.",
            "Kerahasiaan Data Pekerja: Pengguna dilarang keras menyebarluaskan data pribadi mitra pekerja (identitas, kontak) kepada pihak luar.",
            "Tanggung Jawab Keamanan: Anda bertanggung jawab penuh atas keamanan data akun Anda. Segala kerugian yang timbul akibat kelalaian Anda akan ditanggung sendiri.",
        ],
    },
    {
        no: 8,
        title: "Batasan Tanggung Jawab",
        points: [
            "Fungsi Sebatas Platform: CICANA hanya beroperasi sebagai portal penghubung digital (disediakan as is) dan tidak menjamin layanan akan 100% sempurna sesuai ekspektasi setiap pengguna.",
            "Lepas Tanggung Jawab Kerugian: CICANA tidak menanggung kerugian atau kerusakan yang diakibatkan oleh kelalaian pekerja maupun pelanggaran pengguna terhadap Syarat & Ketentuan.",
            "Peran Mediasi: Jika terjadi masalah, CICANA hanya akan memfasilitasi penyelesaian sengketa sewajarnya, namun tidak wajib mengambil langkah hukum apa pun.",
            "Pembebasan Tuntutan: Pengguna setuju untuk melepaskan CICANA dari segala macam klaim, tuntutan hukum, atau ganti rugi jika terjadi perselisihan antara pengguna dan pekerja.",
        ],
    },
    {
        no: 9,
        title: "Pilihan Hukum dan Penyelesaian",
        points: [
            "Hukum & Musyawarah: Perjanjian ini sepenuhnya tunduk pada hukum Republik Indonesia, di mana setiap perselisihan harus diselesaikan terlebih dahulu melalui jalur musyawarah untuk mencapai mufakat.",
            "Penyelesaian Lanjutan & Kewajiban: Apabila musyawarah tidak mencapai kesepakatan dalam 30 hari, sengketa akan diselesaikan di Pengadilan Negeri Jakarta Selatan. Selama proses penyelesaian sengketa berlangsung, kedua belah pihak tetap wajib menjalankan kewajibannya masing-masing.",
        ],
    },
    {
        no: 10,
        title: "Ketentuan Lain",
        points: [
            "Persetujuan Syarat & Kebijakan: Dengan menggunakan layanan, Anda secara otomatis menyatakan paham, menyetujui, dan tunduk pada seluruh syarat, ketentuan (baik khusus maupun umum), serta kebijakan yang ditetapkan oleh CICANA.",
            "Penanganan Kendala Pekerja: Apabila terjadi masalah kesepakatan dengan pekerja, komunikasi akan dilakukan bersama; pengguna setuju untuk membebaskan CICANA dari segala tuntutan ganti rugi terkait kendala tersebut, dan segala bentuk intimidasi, ancaman, maupun kekerasan akan ditolak dengan tegas.",
        ],
    },
    {
        no: 11,
        title: "Pembaharuan",
        points: [
            "Perubahan Sepihak: Syarat dan Ketentuan dapat diubah sewaktu-waktu tanpa pemberitahuan sebelumnya.",
            "Persetujuan Otomatis: Dengan tetap menggunakan layanan, Anda secara otomatis dianggap telah menyetujui setiap perubahan yang ada.",
        ],
    },
];

const SPECIFIC_TERMS: TncSection[] = [
    {
        no: 1,
        title: "Pendahuluan",
        points: [
            "Definisi Entitas: CICANA adalah platform digital penyedia jasa pekerja rumah tangga, di mana seluruh hak dan kewajiban antara perusahaan, pemberi kerja, dan pekerja diatur dalam Syarat dan Ketentuan yang mengikat.",
            'Proses Kesepakatan: Tahap "Deal" terjadi ketika pemberi kerja dan pekerja saling cocok. Proses ini dilanjutkan dengan conference call yang dimoderatori CICANA atau Panduan tertulis yang bertujuan untuk mencegah miskomunikasi.',
            "Kategori Pekerja: Status pekerja dibagi menjadi tiga, yaitu Live in (menginap), Live out (pulang-pergi), dan Inval (pekerja sementara dengan durasi 4 hari hingga 1 bulan).",
            "Keterlibatan Mitra: CICANA bekerja sama dengan entitas terpisah, yakni Partner Cicana (penyedia kandidat pekerja) dan Agen Transportasi (pengurus akomodasi keberangkatan pekerja).",
        ],
    },
    {
        no: 2,
        title: "Informasi Pekerja Cicana",
        points: [
            "Identitas & Aturan Dokumen: Pekerja CICANA berusia 18-46 tahun dan memiliki identitas resmi terdaftar. Dokumen pribadi pekerja (seperti KTP/KK) tidak boleh ditahan oleh Pemberi Kerja, kecuali ada kesepakatan bersama saat wawancara, dan wajib dikembalikan saat masa kerja berakhir.",
            "Hak Lembur & Tes Kesehatan: Pekerja berhak mendapatkan upah lembur atau inval apabila bekerja pada hari raya keagamaan. Selain itu, terdapat opsi layanan tes kesehatan umum dari CICANA bagi pekerja jika Pemberi Kerja menghendaki layanan tersebut.",
        ],
    },
    {
        no: 3,
        title: "Pelatihan School of ART oleh Pekerja",
        points: [
            "Akses Akun: Setelah membayar biaya administrasi, Pemberi Kerja akan mendapatkan akses penuh ke akun School of ART yang dapat diakses berulang kali sesuai batas masa aktif yang ditentukan.",
            "Kewajiban Pelatihan: Pekerja wajib mengikuti kelas pelatihan online dengan batas waktu tertentu. Pemberi Kerja sangat dianjurkan untuk ikut serta dalam briefing awal, mendampingi proses belajar, dan memegang tanggung jawab penuh apabila pekerja tidak mengikuti kelas.",
            "Sertifikasi Kelulusan: Pekerja yang dinyatakan lulus berhak mendapatkan sertifikat, dengan syarat telah bekerja lebih dari 6 (enam) bulan dan memiliki catatan kelakuan baik di tempat Pemberi Kerja.",
        ],
    },
    {
        no: 4,
        title: "Alur Proses Order",
        points: [
            "Pendaftaran dan Pembayaran: Proses dimulai dengan membuat akun, mengisi kriteria pekerja yang dibutuhkan, dan melunasi biaya pemesanan (sistem harga dinamis) untuk mendapatkan akses unlimited profil kandidat selama 1 bulan.",
            "Proses Matching: Anda akan direkomendasikan profil kandidat sesuai dengan kebutuhan yang diisi, Anda memilih kandidat yang ingin dihire dan tim Cicana akan membantu proses matching dengan pekerja dalam kurun waktu 1-3 jam. Status terdiri atas: (a) mencari — proses matching sedang berlangsung, (b) disetujui — Anda deal dengan pekerja, (c) ditolak — Anda belum deal dengan pekerja.",
            "Kesepakatan & Persiapan Keberangkatan: Jika kedua belah pihak sudah sepakat atau status \"Disetujui\", akan dilakukan conference call atau panduan sesuai jadwal yang dimoderatori oleh Tim Cicana. Setelah itu, CICANA akan mengatur jadwal, transportasi keberangkatan, dan Anda dapat mendapatkan layanan tambahan berupa cek kesehatan pekerja di klinik mitra sebelum pekerja tiba di rumah Anda.",
            "Klaim Garansi: Terdapat 3 kali penggantian selama 6 bulan untuk pekerja menginap/live-in dan pulang pergi/live-out.",
            "Apabila Bapak/Ibu ingin mengajukan garansi, maka Bapak/Ibu dapat langsung order kembali melalui Aplikasi tanpa dikenakan biaya kembali kecuali pelayanan manajemen pengantaran pekerja selama masih berada pada ketentuan klaim garansi.",
        ],
    },
    {
        no: 5,
        title: "Rincian Biaya Administrasi",
        points: [
            "Biaya administrasi untuk semua jenis pekerja (Live in, Live out, maupun Inval) sudah mencakup biaya layanan platform, konsultasi, garansi, serta program edukasi dan kelas e-learning (Attitude & Manner) untuk membekali pekerja.",
            "Fasilitas Transportasi & Kesehatan: Khusus untuk pekerja Live in dan Inval, biaya admin tersebut juga sudah termasuk layanan manajemen pengantaran pekerja sampai ke rumah Anda (biaya administrasi belum termasuk biaya transportasi pekerja), dan sudah termasuk layanan cek kesehatan standar (basic).",
            "Biaya di Luar Tanggungan: Biaya administrasi belum menanggung ongkos transportasi asli keberangkatan pekerja ke rumah Anda.",
            "Biaya administrasi yang telah dibayarkan tidak dapat dikembalikan (non-refundable). Segala bentuk keluhan atau penyelesaian masalah akan diproses sesuai dengan Standar Operasional Prosedur (SOP) yang berlaku.",
        ],
    },
    {
        no: 6,
        title: "Mekanisme Keberangkatan dan Cek Kesehatan",
        points: [
            "Alur Keberangkatan Terpusat: Pekerja akan diberangkatkan dari rumah masing-masing menuju kantor Cicana terlebih dahulu. Di kantor Cicana, pekerja wajib menjalani proses cek kesehatan dan Pelatihan School of ART. Setelah seluruh pemeriksaan kesehatan dan pelatihan selesai, keberangkatan pekerja dilakukan maksimal 2 jam kemudian pada jam kerja Cicana yakni 10.00–16.00 langsung dari kantor Cicana menuju rumah Pemberi Kerja.",
            'Pembayaran Biaya Transportasi ke "Transportasi Pengantar Pekerja" melalui komunikasi via WhatsApp Cicana. Seluruh biaya keberangkatan merupakan tanggung jawab Pemberi Kerja dan wajib ditransfer di akhir, ketika status pada aplikasi adalah "pekerja sudah sampai di Klinik untuk Cek Kesehatan" atau "pekerja sudah sampai di Kantor Cicana". Pemberi Kerja dilarang memberikan uang transportasi secara langsung kepada pihak pekerja sebelum pekerja sampai pada titik tertentu berdasarkan konfirmasi dari tim Cicana.',
            'Pemesanan Transportasi dan Notifikasi Aplikasi: Dana keberangkatan diterima oleh "Transportasi Pengantar Pekerja" pada titik-titik pengantaran tertentu sesuai dengan informasi dari Pihak Transportasi kepada Tim Cicana.',
            "Ketentuan Layanan Cek Kesehatan: Cek kesehatan Basic dilakukan di Klinik terdekat dari Kantor Cicana. Seluruh biaya layanan medis ini bersifat final dan tidak dapat dikembalikan (non-refundable).",
        ],
    },
    {
        no: 7,
        title: "Pemesanan dan Pembatalan",
        points: [
            "Aturan Pembayaran (Wajib via Sistem): Tagihan \"administrasi\" wajib dibayar melalui Aplikasi TangfestxCicana dan tagihan \"transportasi\" dibayarkan berdasarkan informasi dan konfirmasi dari Tim Cicana pada Pemberi Kerja. Anda dilarang memberi uang dalam bentuk apa pun kepada pekerja sebelum mereka tiba di rumah; transaksi di luar rekening resmi bukan tanggung jawab Tangfast dan Cicana.",
            'Denda Pembatalan Sepihak: Pembatalan saat status "mencari" — biaya admin dapat dikembalikan namun dipotong 10%. Pembatalan setelah status "disetujui" — biaya admin tidak dapat dikembalikan namun masih bisa dipakai untuk pemesanan selanjutnya dengan masa simpan 1 tahun (sesuai ketentuan Hak Garansi). Apabila Pekerja mengajukan pembatalan, akun pekerja dibekukan dan Pemberi Kerja diberikan rekomendasi kandidat lainnya.',
        ],
    },
    {
        no: 8,
        title: "Kewajiban Pekerja pada Pemberi Kerja",
        points: [
            "Pekerja wajib mengerjakan tugas dan tanggung jawab yang diberikan Pemberi Kerja yang sudah disepakati bersama.",
            "Pekerja wajib mengikuti satu kelas pilihan School of ART by CICANA dan dinyatakan lulus.",
            "Pekerja wajib menerapkan nilai-nilai tata krama dan sopan santun kepada Pemberi Kerja.",
        ],
    },
    {
        no: 9,
        title: "Ketentuan Rekrut Pekerja Live-In",
        points: [
            "Ketentuan & Penyesuaian Gaji: Gaji dihitung mulai hari pertama tiba dan dibayarkan tepat waktu setiap bulannya. Pekerja yang sudah bekerja selama 1 tahun berhak mendapatkan kenaikan gaji sesuai kesepakatan bersama.",
            "Tunjangan Hari Raya (THR): Pekerja dengan masa kerja minimal 1 tahun wajib menerima THR sebesar 1 bulan penuh gaji. Bagi yang masa kerjanya di bawah 1 tahun, nominal THR dihitung secara proporsional sesuai lama bekerja.",
            "Fasilitas Hidup & Hak Istirahat: Pemberi Kerja wajib memfasilitasi makan 3 kali sehari, perlengkapan mandi standar, jam istirahat di sela kerja dengan tidur 8 jam sehari, serta menjamin kerahasiaan data pribadi pekerja.",
            "Aturan Cuti & Kompensasi Hari Libur: Jatah cuti Housekeeper 1 hari/bulan (berlaku setelah bulan ke-3); Babysitter/Caregiver 2 hari/bulan (berlaku sejak bulan pertama). Jika tidak diambil, cuti dapat diakumulasi atau diuangkan sebesar Rp150.000/hari. Pekerja berhak libur pada Hari Raya; jika tetap diminta bekerja, wajib dibayarkan kompensasi lembur (tarif inval).",
        ],
    },
    {
        no: "9a",
        title: "Keberangkatan Pekerja Live-In",
        points: [
            "Informasi Estimasi Keberangkatan: Pada H-1 keberangkatan, CICANA akan memberitahukan estimasi ongkos kepada Pemberi Kerja. Pengantaran langsung menggunakan mobil Travel/Transportasi online dari rumah Pekerja menuju Kantor Cicana. Pemberi Kerja dapat memilih pemesanan transportasi via tim Cicana, atau menjemput pekerja langsung ke Kantor Cicana sesuai jam operasional yang berlaku.",
        ],
    },
    {
        no: "9b",
        title: "Mekanisme Garansi Pekerja Live-In",
        points: [
            "Hak Garansi Penggantian Pekerja: Pemberi Kerja berhak mendapatkan garansi pergantian pekerja maksimal 3 kali dalam jangka waktu 6 bulan, berlaku efektif secara langsung (tanpa masa adaptasi), baik akibat pekerja mengundurkan diri maupun diberhentikan oleh Pemberi Kerja.",
            "Ketentuan Sanksi Pekerja — Denda Resign: kerja < 2 minggu, seluruh gaji berjalan hangus; kerja < 3 bulan, uang jaminan Rp350.000 hangus; kerja < 6 bulan, denda penalti Rp200.000. Aturan Masa Tunggu: pekerja resign wajib menunggu pengganti maksimal 2 minggu (gaji dibayar prorata); jika langsung pergi tanpa menunggu, dipotong denda Rp250.000. Pelanggaran Data: bila terbukti memalsukan profil atau melanggar aturan berat, denda Rp200.000.",
        ],
    },
    {
        no: 10,
        title: "Ketentuan Rekrut Pekerja Live-Out",
        points: [
            "Sistem Penggajian & Lembur: Gaji dihitung sejak hari pertama kedatangan dan dibayarkan bulanan tepat waktu, atau melalui opsi prorata mingguan dengan penahanan deposit Rp150.000 pada minggu pertama. Pekerja berhak atas uang lembur jika bekerja melebihi jam kesepakatan, serta peninjauan kenaikan gaji setelah masa kerja mencapai 1 tahun.",
            "Waktu Kerja, Konsumsi, & Libur Mingguan: Pekerja berhak mendapatkan jatah makan harian (pagi/siang/sore), waktu istirahat yang layak untuk makan dan beribadah, serta hak libur rutin minimal 1 kali seminggu.",
            "Ketentuan THR & Kompensasi Hari Raya: Pekerja dengan masa kerja minimal 1 tahun wajib mendapatkan THR sebesar 1 bulan gaji (proporsional jika di bawah 1 tahun). Pekerja berhak libur Hari Raya sesuai kalender pemerintah; jika tetap diminta bekerja, Pemberi Kerja wajib membayar kompensasi tambahan (tarif inval).",
            "Jaminan Privasi Data Kandidat: Pemberi Kerja wajib menjaga kerahasiaan seluruh data profil kandidat Pekerja yang dikirimkan oleh CICANA dan dilarang keras menyebarluaskannya untuk kepentingan yang tidak etis.",
        ],
    },
    {
        no: "10a",
        title: "Mekanisme Garansi Pekerja Live-Out",
        points: [
            "Hak Garansi Penggantian Pekerja: Pemberi Kerja berhak mendapatkan garansi pergantian pekerja maksimal 3 kali dalam jangka waktu 6 bulan, berlaku efektif secara langsung (tanpa masa adaptasi), baik akibat pekerja mengundurkan diri maupun diberhentikan oleh Pemberi Kerja.",
            "Ketentuan Denda Pekerja: resign < 3 bulan, simpanan gaji bulan pertama (15%) hangus dan denda Rp200.000; menolak masa tunggu (2 minggu), potong gaji Rp250.000; memalsukan data atau melanggar aturan berat, denda Rp200.000 per pemalsuan data; cek kesehatan ditanggung 100% oleh Pemberi Kerja dalam kondisi apa pun.",
        ],
    },
    {
        no: 11,
        title: "Ketentuan Rekrut Inval",
        points: [
            "Sistem Perhitungan & Pembayaran Gaji: Gaji dihitung sejak hari pertama Pekerja tiba di lokasi kerja dan dibayarkan secara penuh langsung kepada Pekerja setelah masa kontrak yang disepakati berakhir.",
            "Fasilitas Pekerja Inval Live In: Pekerja berhak mendapatkan fasilitas makan 3 kali sehari, waktu istirahat di sela jam kerja, serta hak tidur layak selama 8 jam per hari.",
            "Fasilitas & Transportasi Pekerja Inval Live Out: Pekerja berhak atas makan harian (pagi/siang/sore) dan waktu ISHOMA di sela jam kerja. Jika Pemberi Kerja memesankan transportasi online setiap hari, biaya ongkos dipotong dari gaji Pekerja dengan batas maksimal potongan Rp250.000 selama bekerja; sisa kelebihannya wajib ditanggung oleh Pemberi Kerja.",
            "Kerahasiaan Data Kandidat: Pemberi Kerja wajib menjaga privasi seluruh data profil kandidat yang diberikan oleh CICANA dan dilarang menyebarluaskannya untuk hal-hal yang merugikan.",
        ],
    },
    {
        no: "11a",
        title: "Keberangkatan Pekerja Inval Live-In",
        points: [
            "Informasi Estimasi Keberangkatan: Pada H-1 keberangkatan, CICANA akan memberitahukan estimasi ongkos kepada Pemberi Kerja. Pengantaran langsung menggunakan mobil Travel/Transportasi online dari rumah Pekerja menuju Kantor Cicana. Pemberi Kerja dapat memilih pengantaran langsung via tim Cicana/pemesanan sendiri, atau menjemput pekerja langsung ke Kantor Cicana sesuai jam operasional yang berlaku.",
        ],
    },
    {
        no: "11b",
        title: "Mekanisme Garansi Pekerja Inval Live-In",
        points: [
            "Hak Garansi Penggantian Pekerja: Pemberi Kerja berhak mendapatkan garansi pergantian pekerja 1 kali sesuai masa inval yang berlaku efektif secara langsung (tanpa masa adaptasi), baik akibat pekerja mengundurkan diri maupun diberhentikan oleh Pemberi Kerja.",
            "Ketentuan Denda Pekerja: keluar sebelum selesainya masa inval yang disepakati, dikenakan sanksi berupa pemotongan gaji senilai uang transportasi kedatangan pekerja atau minimal Rp250.000; memalsukan data atau melanggar aturan berat, denda Rp200.000 per pemalsuan data; cek kesehatan ditanggung 100% oleh Pemberi Kerja dalam kondisi apa pun.",
        ],
    },
    {
        no: 12,
        title: "Ketentuan Umum Pekerja",
        points: [
            "Jika Pekerja yang masih dalam masa garansi berencana untuk izin keluar rumah Pemberi Kerja (lebih dari 6 jam), maka Pemberi Kerja wajib menginformasikan kepada CICANA terlebih dahulu (khusus pekerja kategori menginap).",
            "Kami sangat menyarankan Pekerja tidak diberikan kasbon selama masa kerja. Jika Pekerja tetap ingin kasbon, Pemberi Kerja bisa menginformasikan pada kami terlebih dahulu agar kami telusuri maksud dan tujuan Pekerja tersebut.",
            "CICANA tidak bertanggung jawab jika terdapat kerugian materiil dan non materiil apabila Pemberi Kerja tidak menginformasikan kepada CICANA terlebih dahulu sebagaimana yang tertera pada poin nomor 1 dan 2.",
        ],
    },
];

// ─── Step Card Component ──────────────────────────────────────────────────────
const StepCard = ({
    color,
    icon,
    title,
    description,
}: {
    color: string;
    icon: React.ReactNode;
    title: string;
    description: string;
}) => (
    <View
        style={{
            flex: 1,
            backgroundColor: color,
            borderRadius: 12,
            padding: 12,
            marginHorizontal: 3,
        }}
    >
        <View style={{ marginBottom: 8 }}>{icon}</View>
        <Text style={{ color: "white", fontWeight: "700", fontSize: 13, marginBottom: 4 }}>
            {title}
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 10, lineHeight: 14 }}>
            {description}
        </Text>
    </View>
);

// ─── Radio Option Component ───────────────────────────────────────────────────
const RadioOption = ({
    label,
    selected,
    onPress,
}: {
    label: string;
    selected: boolean;
    onPress: () => void;
}) => (
    <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: "#e5e7eb",
            opacity: pressed ? 0.7 : 1,
        })}
    >
        <Text style={{ fontSize: 15, color: "#1f2937", fontWeight: selected ? "600" : "400" }}>
            {label}
        </Text>
        <View
            style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: 2,
                borderColor: selected ? "#3b5bdb" : "#d1d5db",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "white",
            }}
        >
            {selected && (
                <View
                    style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: "#3b5bdb",
                    }}
                />
            )}
        </View>
    </Pressable>
);

// ─── T&C Section Renderer ─────────────────────────────────────────────────────
const TncSectionBlock = ({ section }: { section: TncSection }) => (
    <View style={{ marginBottom: 18 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 6 }}>
            {section.no}. {section.title}
        </Text>
        {section.points.map((p, idx) => (
            <Text
                key={idx}
                style={{
                    fontSize: 12.5,
                    color: "#374151",
                    lineHeight: 19,
                    marginBottom: 6,
                }}
            >
                • {p}
            </Text>
        ))}
    </View>
);

// ─── Terms & Conditions Modal ──────────────────────────────────────────────────
const TermsModal = ({
    visible,
    agreed,
    onToggleAgree,
    onConfirm,
    onClose,
}: {
    visible: boolean;
    agreed: boolean;
    onToggleAgree: () => void;
    onConfirm: () => void;
    onClose: () => void;
}) => {
    const scrollRef = useRef<ScrollView>(null);
    const [showScrollBtn, setShowScrollBtn] = useState(true);

    const handleScroll = (e: any) => {
        const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
        const isNearBottom =
            layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
        setShowScrollBtn(!isNearBottom);
    };

    const scrollToBottom = () => {
        scrollRef.current?.scrollToEnd({ animated: true });
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
                <StatusBar barStyle="light-content" backgroundColor="#3b5bdb" />

                {/* Header */}
                <View style={styles.header}>
                    <Pressable
                        onPress={onClose}
                        style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.6 : 1 }]}
                    >
                        <Ionicons name="close" size={24} color="#fff" />
                    </Pressable>
                    <Text style={styles.headerTitle}>Syarat & Ketentuan</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={{ flex: 1 }}>
                    <ScrollView
                        ref={scrollRef}
                        style={{ flex: 1 }}
                        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                        showsVerticalScrollIndicator={true}
                    >
                        <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 12 }}>
                            General Term and Condition
                        </Text>
                        {GENERAL_TERMS.map((section) => (
                            <TncSectionBlock key={`g-${section.no}`} section={section} />
                        ))}

                        <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827", marginTop: 8, marginBottom: 12 }}>
                            Specific Term and Condition
                        </Text>
                        {SPECIFIC_TERMS.map((section) => (
                            <TncSectionBlock key={`s-${section.no}`} section={section} />
                        ))}
                    </ScrollView>

                    {/* Floating scroll-to-bottom button */}
                    {showScrollBtn && (
                        <Pressable
                            onPress={scrollToBottom}
                            style={({ pressed }) => ({
                                position: "absolute",
                                right: 16,
                                bottom: 100,
                                width: 44,
                                height: 44,
                                borderRadius: 22,
                                backgroundColor: pressed ? "#2f4ec7" : "#3b5bdb",
                                alignItems: "center",
                                justifyContent: "center",
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.25,
                                shadowRadius: 4,
                                elevation: 5,
                            })}
                        >
                            <Ionicons name="chevron-down" size={24} color="#fff" />
                        </Pressable>
                    )}
                </View>

                {/* Footer: checkbox + confirm */}
                <View
                    style={{
                        borderTopWidth: 1,
                        borderTopColor: "#f3f4f6",
                        paddingHorizontal: 16,
                        paddingTop: 12,
                        paddingBottom: Platform.OS === "ios" ? 28 : 16,
                        backgroundColor: "white",
                    }}
                >
                    <Pressable
                        onPress={onToggleAgree}
                        style={({ pressed }) => ({
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 14,
                            opacity: pressed ? 0.7 : 1,
                        })}
                    >
                        <View
                            style={{
                                width: 22,
                                height: 22,
                                borderRadius: 5,
                                borderWidth: 2,
                                borderColor: agreed ? "#3b5bdb" : "#9ca3af",
                                backgroundColor: agreed ? "#3b5bdb" : "white",
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: 10,
                            }}
                        >
                            {agreed && <Ionicons name="checkmark" size={16} color="#fff" />}
                        </View>
                        <Text style={{ fontSize: 13.5, color: "#1f2937", flex: 1 }}>
                            Saya sudah membaca dan menyetujui Syarat & Ketentuan di atas
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={agreed ? onConfirm : undefined}
                        disabled={!agreed}
                        style={({ pressed }) => ({
                            backgroundColor: !agreed ? "#c7ccd6" : pressed ? "#2f4ec7" : "#3b5bdb",
                            borderRadius: 12,
                            paddingVertical: 16,
                            alignItems: "center",
                        })}
                    >
                        <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
                            Setuju & Lanjutkan
                        </Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function ArtBabysitterScreen() {
    const router = useRouter();

    const [form, setForm] = useState<FormState>({
        kategori: "Menginap",
        layanan: "ART",
        jobdesk: "",
    });

    const [tncVisible, setTncVisible] = useState(false);
    const [agreed, setAgreed] = useState(false);

    const KATEGORI_OPTIONS: KategoriType[] = ["Menginap", "Pulang Pergi", "Inval"];
    const LAYANAN_OPTIONS: LayananType[] = ["ART", "Babysitter"];

    // Tombol "Selanjutnya" di halaman utama -> buka modal T&C
    const handleNextPress = () => {
        setTncVisible(true);
    };

    // Setelah user centang setuju dan menekan "Setuju & Lanjutkan" di dalam modal
    const handleConfirmTnc = () => {
        setTncVisible(false);
        router.push({
            pathname: "/art/detail-kontak", // sesuaikan dengan route Anda
            params: {
                kategori: form.kategori,
                layanan: form.layanan,
                jobdesk: form.jobdesk,
            },
        });
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#f0f4ff" }}>
            <StatusBar barStyle="light-content" backgroundColor="#3b5bdb" />

            <View style={styles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.6 : 1 }]}
                >
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </Pressable>
                <Text style={styles.headerTitle}>ART & Baby Sitter</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Cara Untuk Order ────────────────────────────────────────── */}
                <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 12 }}>
                        Cara Untuk Order
                    </Text>
                    <View style={{ flexDirection: "row" }}>
                        <StepCard
                            color="#5c3bbb"
                            title="Registrasi & Request"
                            description="Lengkapi data untuk menetukan kriteria pekerja"
                            icon={<Text style={{ fontSize: 20, color: "white" }}>☰</Text>}
                        />
                        <StepCard
                            color="#3a9c3c"
                            title="Pilih Kandidat"
                            description="cek langsung daftar pekerja siap kerja"
                            icon={<Text style={{ fontSize: 20, color: "white" }}>👤</Text>}
                        />
                        <StepCard
                            color="#b94040"
                            title="Dapat Pekerja"
                            description="Kandidat atau pekerja tiba di rumah Anda"
                            icon={<Text style={{ fontSize: 20, color: "white" }}>☆</Text>}
                        />
                    </View>
                </View>

                {/* ── White Card Container ─────────────────────────────────────── */}
                <View
                    style={{
                        backgroundColor: "white",
                        marginHorizontal: 16,
                        marginTop: 16,
                        borderRadius: 16,
                        paddingHorizontal: 16,
                        paddingTop: 4,
                        paddingBottom: 8,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.06,
                        shadowRadius: 6,
                        elevation: 2,
                    }}
                >
                    {/* Kategori */}
                    <Text
                        style={{
                            fontSize: 15,
                            fontWeight: "700",
                            color: "#111827",
                            paddingTop: 16,
                            paddingBottom: 4,
                        }}
                    >
                        Kategori
                    </Text>
                    {KATEGORI_OPTIONS.map((opt) => (
                        <RadioOption
                            key={opt}
                            label={opt}
                            selected={form.kategori === opt}
                            onPress={() => setForm((prev) => ({ ...prev, kategori: opt }))}
                        />
                    ))}

                    {/* Layanan yang anda butuhkan */}
                    <Text
                        style={{
                            fontSize: 15,
                            fontWeight: "700",
                            color: "#111827",
                            paddingTop: 20,
                            paddingBottom: 4,
                        }}
                    >
                        Layanan yang anda butuhkan
                    </Text>
                    {LAYANAN_OPTIONS.map((opt) => (
                        <RadioOption
                            key={opt}
                            label={opt}
                            selected={form.layanan === opt}
                            onPress={() => setForm((prev) => ({ ...prev, layanan: opt }))}
                        />
                    ))}

                    {/* Detail Pekerjaan */}
                    <Text
                        style={{
                            fontSize: 15,
                            fontWeight: "700",
                            color: "#111827",
                            paddingTop: 20,
                            paddingBottom: 8,
                        }}
                    >
                        Detail Pekerjaan yang akan di lakukan
                    </Text>
                    <TextInput
                        multiline
                        numberOfLines={5}
                        placeholder="Jobdesk .."
                        placeholderTextColor="#9ca3af"
                        value={form.jobdesk}
                        onChangeText={(t) => setForm((prev) => ({ ...prev, jobdesk: t }))}
                        style={{
                            borderWidth: 1,
                            borderColor: "#e5e7eb",
                            borderRadius: 10,
                            padding: 12,
                            fontSize: 14,
                            color: "#1f2937",
                            textAlignVertical: "top",
                            minHeight: 100,
                            backgroundColor: "#fafafa",
                            marginBottom: 8,
                        }}
                    />
                </View>
            </ScrollView>

            {/* ── Fixed Bottom Button ──────────────────────────────────────────── */}
            <View
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: "white",
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: Platform.OS === "ios" ? 28 : 16,
                    borderTopWidth: 1,
                    borderTopColor: "#f3f4f6",
                }}
            >
                <Pressable
                    onPress={handleNextPress}
                    style={({ pressed }) => ({
                        backgroundColor: pressed ? "#2f4ec7" : "#3b5bdb",
                        borderRadius: 12,
                        paddingVertical: 16,
                        alignItems: "center",
                        shadowColor: "#3b5bdb",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 4,
                    })}
                >
                    <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
                        Selanjutnya
                    </Text>
                </Pressable>
            </View>

            {/* ── Terms & Conditions Modal ──────────────────────────────────────── */}
            <TermsModal
                visible={tncVisible}
                agreed={agreed}
                onToggleAgree={() => setAgreed((v) => !v)}
                onConfirm={handleConfirmTnc}
                onClose={() => setTncVisible(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        backgroundColor: '#3b5bdb',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    backButton: {
        width: 40,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
        flex: 1,
    }
});