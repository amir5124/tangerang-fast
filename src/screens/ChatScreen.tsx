import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const ChatScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat</Text>
        </View>

        {/* Fitur Cepat Section - Sesuai Gambar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fitur Cepat</Text>
          <View style={styles.featureRow}>
            {/* Fitur Bantuan (WhatsApp) */}
            <View style={styles.featureItemContainer}>
              <TouchableOpacity
                style={[styles.iconCircle, { backgroundColor: '#25D366' }]}>
                <FontAwesome
                  name="whatsapp"
                  size={35}
                  color="#fff"
                />
              </TouchableOpacity>
              <Text style={styles.featureLabel}>Bantuan</Text>
            </View>

            {/* Fitur FAQ */}
            <View style={styles.featureItemContainer}>
              <TouchableOpacity
                style={[styles.iconCircle, { backgroundColor: '#FFBB33' }]}>
                <Ionicons
                  name="help"
                  size={35}
                  color="#fff"
                />
              </TouchableOpacity>
              <Text style={styles.featureLabel}>FAQ</Text>
            </View>
          </View>
        </View>

        {/* Chat Kamu Section - Sesuai Gambar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chat Kamu</Text>

          {/* List Item 1 */}
          <TouchableOpacity style={styles.chatCard}>
            <View style={[styles.avatarCircle, { backgroundColor: '#633594' }]}>
              <Ionicons name="notifications" size={30} color="#fff" />
            </View>
            <View style={styles.chatContentContainer}>
              <View style={styles.chatContent}>
                <View style={styles.chatHeaderRow}>
                  <Text style={styles.chatName}>Pesanan Kamu</Text>
                  <Text style={styles.chatTime}>28/4</Text>
                </View>
                <View style={styles.chatHeaderRow}>
                  <Text style={styles.chatMessage} numberOfLines={1}>
                    Hai, Pesanan AC kamu sedang dalam perjalanan ...
                  </Text>
                  <View style={styles.dotOrange} />
                </View>
              </View>
              <View style={styles.separator} />
            </View>
          </TouchableOpacity>

          {/* List Item 2 */}
          <TouchableOpacity style={styles.chatCard}>
            <View style={[styles.avatarCircle, { backgroundColor: '#D4E12D' }]}>
              <MaterialCommunityIcons name="percent" size={35} color="#fff" />
            </View>
            <View style={styles.chatContentContainer}>
              <View style={styles.chatContent}>
                <View style={styles.chatHeaderRow}>
                  <Text style={styles.chatName}>Promo Gajian</Text>
                  <Text style={styles.chatTime}>28/4</Text>
                </View>
                <View style={styles.chatHeaderRow}>
                  <Text style={styles.chatMessage} numberOfLines={1}>
                    Lagi ada promo nih, yuk cek sekarang untuk dapet ...
                  </Text>
                  <View style={styles.dotOrange} />
                </View>
              </View>
              <View style={styles.separator} />
            </View>
          </TouchableOpacity>

          {/* List Item 3 */}
          <TouchableOpacity style={styles.chatCard}>
            <View style={[styles.avatarCircle, { backgroundColor: '#26D3B4' }]}>
              <Ionicons name="help-circle" size={35} color="#fff" />
            </View>
            <View style={styles.chatContentContainer}>
              <View style={styles.chatContent}>
                <View style={styles.chatHeaderRow}>
                  <Text style={styles.chatName}>Pesan Admin</Text>
                  <Text style={styles.chatTime}>28/4</Text>
                </View>
                <View style={styles.chatHeaderRow}>
                  <Text style={styles.chatMessage} numberOfLines={1}>
                    Mohon Maaf, Saat ini sedang terjadi kendala dala ...
                  </Text>
                </View>
              </View>
              <View style={styles.separator} />
            </View>
          </TouchableOpacity>

          {/* List Item 4 */}
          <TouchableOpacity style={styles.chatCard}>
            <View style={[styles.avatarCircle, { backgroundColor: '#7D58B5' }]}>
              <Ionicons name="notifications" size={30} color="#fff" />
            </View>
            <View style={styles.chatContentContainer}>
              <View style={styles.chatContent}>
                <View style={styles.chatHeaderRow}>
                  <Text style={styles.chatName}>Pesanan Kamu</Text>
                  <Text style={styles.chatTime}>28/4</Text>
                </View>
                <View style={styles.chatHeaderRow}>
                  <Text style={styles.chatMessage} numberOfLines={1}>
                    Hai, Pesanan AC kamu sedang dalam perjalanan ...
                  </Text>
                </View>
              </View>
              <View style={styles.separator} />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab}>
        <MaterialCommunityIcons name="message-plus" size={24} color="#fff" />
      </TouchableOpacity>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    marginTop: 10,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  featureItemContainer: {
    alignItems: 'center',
    marginRight: 30,
  },
  iconCircle: {
    width: 65,
    height: 65,
    borderRadius: 15, // Dibuat agak kotak seperti gambar
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  chatCard: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  avatarCircle: {
    width: 55,
    height: 55,
    borderRadius: 15, // Agak rounded kotak sesuai gambar
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContentContainer: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  chatContent: {
    flex: 1,
    paddingBottom: 10,
  },
  chatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  chatTime: {
    fontSize: 12,
    color: '#999',
  },
  chatMessage: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    flex: 1,
    paddingRight: 10,
  },
  dotOrange: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F39233',
    marginTop: 5,
  },
  separator: {
    height: 1,
    backgroundColor: '#EEE',
    width: '100%',
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
});

export default ChatScreen;