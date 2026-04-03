import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const storage = {
    // Fungsi untuk menyimpan data
    save: async (key, value) => {
        if (Platform.OS === 'web') {
            try {
                localStorage.setItem(key, value);
            } catch (e) {
                console.error('Error saving to localStorage', e);
            }
        } else {
            await SecureStore.setItemAsync(key, value);
        }
    },

    // Fungsi untuk mengambil data
    get: async (key) => {
        if (Platform.OS === 'web') {
            return localStorage.getItem(key);
        } else {
            return await SecureStore.getItemAsync(key);
        }
    },

    // Fungsi untuk menghapus data
    delete: async (key) => {
        if (Platform.OS === 'web') {
            localStorage.removeItem(key);
        } else {
            await SecureStore.deleteItemAsync(key);
        }
    },

    // Alias 'remove'
    remove: async (key) => {
        if (Platform.OS === 'web') {
            localStorage.removeItem(key);
        } else {
            await SecureStore.deleteItemAsync(key);
        }
    }
};