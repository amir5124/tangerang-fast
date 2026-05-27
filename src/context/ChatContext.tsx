import React, { createContext, useContext, useEffect, useState } from 'react';
import API from '../utils/api';
import { storage } from '../utils/storage';

interface ChatContextType {
    unreadCount: number;
    refreshUnreadCount: () => Promise<void>;
    markAsReadAndUpdate: (chatId: string | number) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within ChatProvider');
    }
    return context;
};

interface ChatProviderProps {
    children: React.ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchUnreadCount = async () => {
        try {
            // Ambil user data dari storage
            const rawData = await storage.get('userData');
            if (!rawData) return;

            const parsedUser = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

            // Ambil notifikasi dan orders
            const [resNotif, resOrders] = await Promise.all([
                API.get(`/notifications/${parsedUser.id}`),
                API.get(`/orders/user/${parsedUser.id}`)
            ]);

            let unreadNotifs = 0;
            let unreadOrders = 0;

            // Hitung notifikasi yang belum dibaca
            if (resNotif.data.success) {
                unreadNotifs = resNotif.data.data.filter((n: any) => n.is_read === 0).length;
            }

            // Orders selalu dianggap sudah dibaca (tidak perlu dihitung)

            const totalUnread = unreadNotifs + unreadOrders;
            setUnreadCount(totalUnread);

            // Simpan ke storage untuk akses di tempat lain
            await storage.save('unreadChatCount', totalUnread.toString());
        } catch (error) {
            console.error('Gagal mengambil unread count:', error);
        }
    };

    const markAsReadAndUpdate = async (chatId: string | number) => {
        try {
            // Update status read di API (untuk notifikasi biasa)
            await API.put(`/notifications/read/${chatId}`);
            // Refresh unread count
            await fetchUnreadCount();
        } catch (error) {
            console.error('Gagal menandai sebagai dibaca:', error);
        }
    };

    const refreshUnreadCount = async () => {
        await fetchUnreadCount();
    };

    useEffect(() => {
        // Initial fetch
        fetchUnreadCount();

        // Setup interval untuk refresh setiap 30 detik
        const interval = setInterval(() => {
            fetchUnreadCount();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    return (
        <ChatContext.Provider value={{ unreadCount, refreshUnreadCount, markAsReadAndUpdate }}>
            {children}
        </ChatContext.Provider>
    );
};