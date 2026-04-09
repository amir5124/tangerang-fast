import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ResetPasswordScreen() {
  const {token} = useLocalSearchParams(); // Menangkap ?token=xyz
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const router = useRouter();

  const handleUpdatePassword = async () => {
    if (password !== confirmPassword) {
      const msg = 'Konfirmasi password tidak cocok!';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      return;
    }

    try {
      const response = await fetch(
        'https://backend.tangerangfast.online/api/auth/reset-password',
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({token, newPassword: password}),
        },
      );

      const result = await response.json();

      if (response.ok && result.success) {
        window.alert('Password berhasil diperbarui!');
        router.replace('/login');
      } else {
        window.alert(result.message || 'Gagal memperbarui password.');
      }
    } catch (error) {
      window.alert('Terjadi kesalahan koneksi.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Password Baru</Text>
      <Text style={styles.subtitle}>
        Silakan buat kata sandi baru yang kuat untuk akun Anda.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Password Baru"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TextInput
        style={styles.input}
        placeholder="Konfirmasi Password Baru"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleUpdatePassword}>
        <Text style={styles.buttonText}>Perbarui Password</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 24,
    justifyContent: 'center',
  },
  title: {fontSize: 24, fontWeight: '800', color: '#1E293B', marginBottom: 10},
  subtitle: {fontSize: 15, color: '#64748B', marginBottom: 30},
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#633594',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {color: '#FFF', fontSize: 16, fontWeight: '700'},
});
