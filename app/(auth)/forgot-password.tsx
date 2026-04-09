import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRequestReset = async () => {
    if (!email) {
      if (Platform.OS === 'web') {
        window.alert('Masukkan email Anda');
      } else {
        Alert.alert('Error', 'Masukkan email Anda');
      }
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        'https://backend.tangerangfast.online/api/auth/request-reset',
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({email}),
        },
      );

      const result = await response.json();

      if (response.ok && result.success) {
        const msg = 'Instruksi reset password telah dikirim ke email Anda.';
        if (Platform.OS === 'web') {
          window.alert(msg);
          router.replace('/login'); // Di web lebih baik replace ke login
        } else {
          Alert.alert('Berhasil', msg, [
            {text: 'OK', onPress: () => router.back()},
          ]);
        }
      } else {
        throw new Error(result.message || 'Gagal mengirim email.');
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Terjadi kesalahan koneksi.';
      Platform.OS === 'web'
        ? window.alert(errorMsg)
        : Alert.alert('Gagal', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} bounces={false}>
      <View style={styles.card}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
          {Platform.OS === 'web' && (
            <Text style={styles.backText}>Kembali</Text>
          )}
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.title}>Lupa Password?</Text>
          <Text style={styles.subtitle}>
            Masukkan alamat email Anda untuk menerima tautan pengaturan ulang
            kata sandi.
          </Text>

          <View style={styles.inputWrapper}>
            <Ionicons
              name="mail-outline"
              size={20}
              color="#64748B"
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email@anda.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              // Menangani tombol Enter di Web
              onSubmitEditing={handleRequestReset}
              returnKeyType="send"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRequestReset}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Kirim Instruksi</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#F8FAFC', // Background abu-abu muda khas web
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFF',
    width: '100%',
    maxWidth: 450, // Membatasi lebar form agar tidak melar di layar PC
    borderRadius: 20,
    padding: 32,
    // Shadow untuk tampilan Web yang lebih elegan
    ...Platform.select({
      web: {
        boxShadow: '0px 10px 25px rgba(0, 0, 0, 0.05)',
      },
      default: {
        elevation: 4,
      },
    }),
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    alignSelf: 'flex-start',
  },
  backText: {
    marginLeft: 8,
    color: '#1E293B',
    fontWeight: '500',
  },
  content: {
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: Platform.OS === 'web' ? 'left' : 'left',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
    marginBottom: 32,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 24,
    backgroundColor: '#F8FAFC',
  },
  icon: {marginRight: 12},
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    outlineStyle: 'none', // Menghapus outline default browser di web
  } as any,
  button: {
    backgroundColor: '#633594',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    transitionProperty: 'background-color', // Smooth transition di web
    transitionDuration: '200ms',
  } as any,
  buttonDisabled: {
    backgroundColor: '#A58BBA',
  },
  buttonText: {color: '#FFF', fontSize: 16, fontWeight: '700'},
});
