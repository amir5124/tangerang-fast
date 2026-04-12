import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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

        {/* Pilihan Fitur Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pilihan fitur</Text>
          <View style={styles.featureRow}>
            {/* Fitur Inbox */}
            <View style={styles.featureItemContainer}>
              <TouchableOpacity
                style={[styles.iconCircle, {backgroundColor: '#FF7F27'}]}>
                <MaterialCommunityIcons
                  name="email-outline"
                  size={30}
                  color="#fff"
                />
                <View style={styles.badgeTopRight}>
                  <View style={styles.dotRed} />
                </View>
              </TouchableOpacity>
              <Text style={styles.featureLabel}>Inbox</Text>
            </View>

            {/* Fitur Bantuan */}
            <View style={styles.featureItemContainer}>
              <TouchableOpacity
                style={[styles.iconCircle, {backgroundColor: '#00AA13'}]}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={30}
                  color="#fff"
                />
              </TouchableOpacity>
              <Text style={styles.featureLabel}>Bantuan</Text>
            </View>
          </View>
        </View>

        {/* Chat Kamu Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chat kamu</Text>

          <TouchableOpacity style={styles.chatCard}>
            <View style={styles.avatarContainer}>
              {/* Simulasi Gambar Profil Jeklin */}
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={30} color="#fff" />
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={18} color="#00AA13" />
                </View>
              </View>
            </View>

            <View style={styles.chatContent}>
              <View style={styles.chatHeaderRow}>
                <Text style={styles.chatName}>Jeklin</Text>
                <Text style={styles.chatTime}>28/03/22</Text>
              </View>
              <View style={styles.chatHeaderRow}>
                <Text style={styles.chatMessage} numberOfLines={1}>
                  Kamu punya pesan
                </Text>
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>5</Text>
                </View>
              </View>
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1C',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
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
    width: 60,
    height: 60,
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
    shadowOffset: {width: 0, height: 2},
  },
});

export default ChatScreen;
