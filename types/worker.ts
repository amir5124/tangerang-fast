// types/worker.ts
// Tipe data ini mengikuti PERSIS struktur response dari:
// curl --location 'http://worker.cicana.co/api/worker/getAll'

export interface LabelValue<T = string> {
    label: string;
    value: T;
}

export interface IdentitasPekerja {
    id: number;
    nama: string;
    // Harus sinkron dengan KategoriType di halaman pertama (art-babysitter.tsx)
    kategori_pekerja: 'Menginap' | 'Pulang Pergi' | 'Inval' | string;
    // Harus sinkron dengan LayananType di halaman pertama
    minat_kerja: 'ART' | 'Babysitter' | string;
    tempat_tinggal: string;
}

export interface ProfilPekerja {
    nama: LabelValue;
    berat_badan: LabelValue;
    tinggi_badan: LabelValue;
    asal: LabelValue;
    suku: LabelValue;
    agama: LabelValue;
    status_pernikahan: LabelValue;
    jumlah_dan_usia_anak: LabelValue;
    posisi_saat_ini: LabelValue;
    waktu_wawancara: LabelValue;
    pengalaman_bekerja: LabelValue<string[]>;
    minat_bekerja: LabelValue;
    merokok: LabelValue;
    bertato: LabelValue;
    bisa_naik_motor: LabelValue;
    mabuk_kendaraan: LabelValue;
    usia_anak_bisa_dijaga: LabelValue;
    bisa_masak_rumahan: LabelValue;
    bisa_masak_makanan_anak: LabelValue;
    takut_anjing: LabelValue;
    takut_kucing: LabelValue;
    pegang_daging_babi_mentah: LabelValue;
    pegang_daging_babi_matang: LabelValue;
    siap_bekerja: LabelValue;
    gaji_diharapkan: LabelValue;
    vaksin_covid: LabelValue;
    pendidikan: LabelValue;
    izin_keluarga: LabelValue;
    kondisi_kehamilan: LabelValue;
    kondisi_keluarga: LabelValue;
    masalah_keluarga: LabelValue;
    pinjaman: LabelValue;
    detail_pinjaman: LabelValue;
    riwayat_penyakit: LabelValue;
    motivasi_bekerja: LabelValue;
    sedang_melamar: LabelValue;
    wilayah_kerja: LabelValue;
    ketentuan_cuti: LabelValue;
    pernah_masuk_yayasan: LabelValue;
    rencana_ke_luar_negeri: LabelValue;
    izin_3_6_bulan: LabelValue;
    request_khusus: LabelValue;
    dokumen_tersedia: LabelValue;
}

export interface PerilakuPekerja {
    deskripsi: LabelValue;
    predikat: LabelValue; // "Baik" | "Sangat Baik" | dst
    nama_pekerja: LabelValue;
    skill: LabelValue;
    kompetensi: LabelValue<string[]>;
    ringkasan: LabelValue;
    analisis: LabelValue<string[]>;
}

export interface GambarPekerja {
    jenis: string; // "Foto Profil", dst
    url: string;
}

export interface WorkerData {
    identitas_pekerja: IdentitasPekerja;
    profil_pekerja: ProfilPekerja;
    perilaku_pekerja: PerilakuPekerja;
    gambar_pekerja: GambarPekerja[];
    kategori: string[];
}

export interface GetAllWorkerResponse {
    status: boolean;
    message: string;
    data: WorkerData[];
}