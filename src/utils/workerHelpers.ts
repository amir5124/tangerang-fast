// src/utils/workerHelpers.ts
import { WorkerData } from '../../types/worker';

/** "Rp 2.200.000" -> 2200000 */
export const parseGaji = (value: string | undefined | null): number => {
    if (!value) return 0;
    const digits = value.replace(/[^0-9]/g, '');
    return digits ? parseInt(digits, 10) : 0;
};

export const formatGajiJuta = (value: string | undefined | null): string => {
    const num = parseGaji(value);
    if (!num) return '-';
    return (num / 1_000_000).toFixed(1).replace('.0', '') + 'jt';
};

/** Ambil foto profil, fallback ke gambar pertama yang ada */
export const getFotoProfil = (worker: WorkerData): string | undefined => {
    const foto = worker.gambar_pekerja?.find((g) =>
        g.jenis?.toLowerCase().includes('profil'),
    );
    return foto?.url ?? worker.gambar_pekerja?.[0]?.url;
};

/** API tidak punya field umur langsung, tapi biasanya ada di array `kategori`
 * contoh: "21-25 tahun" */
export const getUsiaFromKategori = (kategori: string[]): string => {
    const match = kategori?.find((k) => /tahun/i.test(k) && /\d/.test(k));
    return match ?? '-';
};

export const getPengalamanRingkas = (worker: WorkerData): string => {
    const list = worker.profil_pekerja?.pengalaman_bekerja?.value ?? [];
    if (list.length === 0) return 'Belum ada pengalaman';
    return `${list.length} pengalaman kerja`;
};

/** Bandingkan string case-insensitive & trim, aman untuk undefined */
export const sameText = (a?: string | null, b?: string | null): boolean =>
    !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/** true kalau tanggal "siap_bekerja" (format DD-MM-YYYY) sudah lewat/hari ini */
export const isReadyToWork = (siapBekerjaValue: string | undefined): boolean => {
    if (!siapBekerjaValue) return false;
    const [day, month, year] = siapBekerjaValue.split('-').map(Number);
    if (!day || !month || !year) return false;
    const siapDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return siapDate.getTime() <= today.getTime();
};