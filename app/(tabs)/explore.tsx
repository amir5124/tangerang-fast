import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const ExploreScreen: React.FC = () => {
    const router = useRouter();
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.customHeader}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#000" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Chat</Text>
                        <View style={{ width: 40 }} />
                    </View>
                </View>

                {/* Pilihan Fitur Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Pilihan fitur</Text>
                    <View style={styles.featureRow}>
                        {/* Fitur Inbox */}


                        {/* Fitur Bantuan */}
                        <View style={styles.featureItemContainer}>
                            <TouchableOpacity style={[styles.iconCircle, { backgroundColor: '#00AA13' }]}>
                                <Ionicons name="chatbubble-ellipses-outline" size={25} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.featureLabel}>Bantuan</Text>
                        </View>
                    </View>
                </View>


            </ScrollView>


        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 15,
    },

    section: {
        marginTop: 20,
        paddingHorizontal: 30,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1C1C1C',
        marginBottom: 15,
    },
    featureRow: {
        flexDirection: 'row',
    },
    featureItemContainer: {
        alignItems: 'center',
        marginRight: 30,
    },
    iconCircle: {
        width: 50,
        height: 50,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    featureLabel: {
        fontSize: 14,
        color: '#4A4A4A',
    },
    badgeTopRight: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 2,
    },
    dotRed: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#EE2737',
    },
    chatCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatarPlaceholder: {
        width: 55,
        height: 55,
        borderRadius: 27.5,
        backgroundColor: '#00AA13',
        justifyContent: 'center',
        alignItems: 'center',
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#fff',
        borderRadius: 10,
    },
    chatContent: {
        flex: 1,
        marginLeft: 15,
    },
    chatHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    chatName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1C1C1C',
    },
    chatTime: {
        fontSize: 12,
        color: '#7C7C7C',
    },
    chatMessage: {
        fontSize: 14,
        color: '#7C7C7C',
        flex: 1,
    },
    unreadBadge: {
        backgroundColor: '#EE2737',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    unreadText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#008917',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 2 },
    },
    customHeader: {
        backgroundColor: '#FFF',
        // --- BORDER (Work on Android & iOS) ---
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9', // Warna abu-abu sangat muda agar elegan

        // --- SHADOW UNTUK IOS ---
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,

        // --- SHADOW UNTUK ANDROID ---
        elevation: 3,
    },
    headerContent: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, justifyContent: 'space-between' },
    backButton: { padding: 5 },
    headerTitle: { color: '#000', fontSize: 18, fontWeight: 'bold', textAlign: 'center', flex: 1, marginRight: 10 },

});

export default ExploreScreen;