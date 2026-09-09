// utils/orderStatusConfig.ts

// ============================================================
// 🔥 SUMBER KEBENARAN TUNGGAL UNTUK STATUS PESANAN ART
// Persis sesuai enum kolom `status` & `matching_status` di database.
// Semua file (MenuGrid, checkActiveArtOrder, status-pesanan, dll)
// WAJIB import dari sini — jangan bikin mapping status baru di file lain.
// ============================================================

// enum `status` di tabel pesanan
export type OrderStatus =
    | 'pending'
    | 'paid'
    | 'matching'
    | 'calling'
    | 'working'
    | 'approved'
    | 'rejected'
    | 'rejected_searching'
    | 'berangkat_dari_cicana'
    | 'berangkat_cek_kesehatan'
    | 'berangkat_siap_diantar'
    | 'completed'
    | 'cancelled';

// enum `matching_status` di tabel pesanan
export type MatchingStatus =
    | 'pending'
    | 'matching'
    | 'calling'
    | 'working'
    | 'approved'
    | 'rejected'
    | 'rejected_searching';

// ============================================================
// URUTAN ALUR BISNIS (bukan urutan enum di DB, tapi urutan proses
// nyata yang dialami user):
// pending/paid → matching → approved → calling →
// berangkat_dari_cicana → berangkat_cek_kesehatan → berangkat_siap_diantar →
// working → completed
// (rejected / rejected_searching / cancelled = jalur keluar, bukan step normal)
// ============================================================

export const STEPS = [
    { id: 1, key: 'payment', label: 'Pembayaran & Verifikasi', sub: 'Pesanan kamu telah dikonfirmasi' },
    { id: 2, key: 'matching', label: 'Mencari Kandidat', sub: 'Kami sedang mencari kandidat terbaik' },
    { id: 3, key: 'approved', label: 'Kandidat Disetujui', sub: 'Kandidat telah disetujui, menunggu conference call' },
    { id: 4, key: 'calling', label: 'Conference Call', sub: 'Wawancara dengan kandidat' },
    { id: 5, key: 'berangkat', label: 'Proses Keberangkatan', sub: 'Persiapan & keberangkatan kandidat' },
    { id: 6, key: 'working', label: 'Bekerja & Selesai', sub: 'Kandidat siap bekerja' },
] as const;

// Index step untuk tiap status (dipakai timeline progress)
export const STATUS_STEP_MAP: Record<OrderStatus, number> = {
    pending: 0,
    paid: 0,
    matching: 1,
    rejected_searching: 1,
    approved: 2,
    calling: 3,
    berangkat_dari_cicana: 4,
    berangkat_cek_kesehatan: 4,
    berangkat_siap_diantar: 4,
    working: 5,
    completed: 5,
    rejected: -1,
    cancelled: -1,
};

// Label ramah-user untuk kolom `status`
export const STATUS_LABEL_MAP: Record<OrderStatus, string> = {
    pending: 'Menunggu Pembayaran',
    paid: 'Pembayaran Berhasil',
    matching: 'Mencari Kandidat',
    rejected_searching: 'Mencari Kandidat Lain',
    approved: 'Kandidat Disetujui',
    calling: 'Conference Call',
    berangkat_dari_cicana: 'Berangkat dari Cicana',
    berangkat_cek_kesehatan: 'Proses Cek Kesehatan',
    berangkat_siap_diantar: 'Siap Diantar/Dijemput',
    working: 'Bekerja',
    completed: 'Selesai',
    rejected: 'Ditolak',
    cancelled: 'Dibatalkan',
};

// Label ramah-user untuk kolom `matching_status`
export const MATCHING_STATUS_LABEL_MAP: Record<MatchingStatus, string> = {
    pending: 'Menunggu',
    matching: 'Sedang Dicarikan',
    calling: 'Proses Wawancara',
    working: 'Bekerja',
    approved: 'Disetujui',
    rejected: 'Ditolak',
    rejected_searching: 'Dicarikan Pengganti',
};

// Status yang bikin polling BERHENTI (proses sudah tuntas / keluar alur)
export const FINAL_STATUSES: OrderStatus[] = ['completed', 'rejected', 'cancelled'];

// Status yang dianggap "Selesai" (tampilan sukses/hijau)
export const DONE_STATUSES: OrderStatus[] = ['completed'];

// ============================================================
// GROUPING UNTUK REDIRECT DI MenuGrid.tsx
// ============================================================

// Masih tahap pencarian mitra → MatchingScreen
export const MATCHING_GROUP_STATUSES: OrderStatus[] = ['matching', 'rejected_searching'];

// Sudah disetujui & seterusnya → halaman Status Pesanan
export const STATUS_PESANAN_GROUP_STATUSES: OrderStatus[] = [
    'approved',
    'calling',
    'berangkat_dari_cicana',
    'berangkat_cek_kesehatan',
    'berangkat_siap_diantar',
    'working',
];

// Status akhir yang TIDAK AKTIF → user boleh buat pesanan baru
export const INACTIVE_STATUSES: OrderStatus[] = ['rejected', 'cancelled', 'completed'];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export const getActiveStep = (status: string): number => {
    return STATUS_STEP_MAP[status as OrderStatus] ?? 0;
};

export const getStatusLabel = (status: string): string => {
    return STATUS_LABEL_MAP[status as OrderStatus] || status;
};

export const getMatchingStatusLabel = (matchingStatus?: string): string => {
    if (!matchingStatus) return '-';
    return MATCHING_STATUS_LABEL_MAP[matchingStatus as MatchingStatus] || matchingStatus;
};

export const isFinalStatus = (status: string): boolean => {
    return FINAL_STATUSES.includes(status as OrderStatus);
};

export const isDoneStatus = (status: string): boolean => {
    return DONE_STATUSES.includes(status as OrderStatus);
};

export const getDepartureMethodLabel = (method?: string): string => {
    const map: Record<string, string> = {
        driver_online: 'Diantar Driver Online',
        dijemput_user: 'Dijemput Sendiri oleh Pengguna',
    };
    return method ? map[method] || method : '-';
};

export const formatTanggalID = (dateStr?: string): string => {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    } catch {
        return dateStr;
    }
};

export const formatRupiah = (angka: number): string =>
    'Rp' + Number(angka || 0).toLocaleString('id-ID');

export const formatRupiahShort = (angka: number): string => {
    const n = Number(angka || 0);
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'jt';
    if (n >= 1_000) return (n / 1_000).toFixed(0) + 'rb';
    return String(n);
};