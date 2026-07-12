// src/utils/workerApi.ts
import { GetAllWorkerResponse, WorkerData } from '../../types/worker';

// Sesuaikan kalau nanti pindah ke https / env var
const BASE_URL = 'https://worker.cicana.co/api/worker';

/**
 * Ambil semua data pekerja dari API.
 * Melempar Error kalau network gagal atau status backend false,
 * supaya bisa ditangkap try/catch di komponen (untuk state error).
 */
export async function getAllWorkers(): Promise<WorkerData[]> {
    const res = await fetch(`${BASE_URL}/getAll`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
        throw new Error(`Gagal mengambil data pekerja (HTTP ${res.status})`);
    }

    const json: GetAllWorkerResponse = await res.json();

    if (!json.status) {
        throw new Error(json.message || 'Gagal mengambil data pekerja');
    }

    return json.data ?? [];
}