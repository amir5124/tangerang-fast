import { AntDesign, Ionicons } from '@expo/vector-icons';
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
} from 'react-native';
import API from '../utils/api';
import { storage } from '../utils/storage';
import { registerForPushNotificationsAsync } from '../utils/usePushNotifications';

WebBrowser.maybeCompleteAuthSession();

// Konfigurasi GoogleSignin hanya perlu dijalankan sekali (native only).
// webClientId di sini WAJIB sama dengan clientId yang dipakai backend
// untuk verifikasi idToken. androidClientId TIDAK perlu diisi manual —
// library ini otomatis membaca dari google-services.json.
if (Platform.OS !== 'web') {
  GoogleSignin.configure({
    webClientId:
      '206607018424-vpr9bdfrk6oedfcvouf5i5e3lan7ckoh.apps.googleusercontent.com',
    offlineAccess: false,
  });
}

const RegisterScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    role: (params.role as string) || 'customer',
  });

  const isFormValid =
    form.full_name.trim().length > 0 &&
    form.email.trim().includes('@') &&
    form.phone_number.length > 0 &&
    form.password.length >= 6 &&
    form.password === confirmPassword;

  // Handler Subscribe Topic
  const handleSubscribe = async (token: string, role: string) => {
    try {
      await API.post('/notifications/subscribe', { token, role });
      // console.log(`✅ Berhasil subscribe ke topik: all_${role}`);
    } catch (error: any) {
      console.error('❌ Gagal subscribe:', error.message);
    }
  };

  // Handle Redirect Google Auth untuk Web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const hash = window.location.hash;
      if (hash && hash.includes('id_token=')) {
        const paramsUrl = new URLSearchParams(hash.replace('#', '?'));
        const idToken = paramsUrl.get('id_token');
        if (idToken) {
          window.history.replaceState(
            null,
            '',
            window.location.origin + window.location.pathname,
          );
          handleGoogleLoginBackend(idToken);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onGoogleRegisterPress = async () => {
    setLoadingGoogle(true);
    const clientId =
      '206607018424-vpr9bdfrk6oedfcvouf5i5e3lan7ckoh.apps.googleusercontent.com';

    if (Platform.OS === 'web') {
      const redirectUri = window.location.origin + window.location.pathname;
      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=id_token` +
        `&scope=${encodeURIComponent('openid profile email')}` +
        `&nonce=${Math.random().toString(36).substring(7)}`;

      window.location.href = authUrl;
      return;
    }

    // --- Mobile: pakai GoogleSignin native (tidak lewat browser/redirect) ---
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();

      // idToken bisa ada di userInfo.data (versi terbaru library) atau langsung di userInfo
      const idToken =
        (userInfo as any)?.data?.idToken ?? (userInfo as any)?.idToken;

      if (!idToken) {
        throw new Error('Tidak menerima idToken dari Google');
      }

      await handleGoogleLoginBackend(idToken);
    } catch (error: any) {
      console.error('❌ Google Sign-In Error:', {
        code: error?.code,
        message: error?.message,
        raw: error,
      });

      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            // User membatalkan sendiri, tidak perlu tampilkan alert
            break;

          case statusCodes.IN_PROGRESS:
            Alert.alert(
              'Tunggu Sebentar',
              'Proses login Google sebelumnya masih berjalan.',
            );
            break;

          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            Alert.alert(
              'Google Play Services Tidak Tersedia',
              'Pastikan Google Play Services sudah terinstall dan diperbarui di perangkat Anda.',
            );
            break;

          default:
            Alert.alert(
              'Registrasi Gagal',
              `Gagal daftar dengan Google.\n\nKode: ${error.code}\n${error.message || ''
              }`,
            );
            break;
        }
      } else {
        Alert.alert(
          'Registrasi Gagal',
          error?.message || 'Terjadi kesalahan tak terduga saat daftar dengan Google.',
        );
      }

      setLoadingGoogle(false);
    }
  };

  const handleGoogleLoginBackend = async (
    idToken: string,
    tokenTerbaru?: string,
  ) => {
    setLoadingGoogle(true);
    try {
      // Ambil fresh token jika tidak dipassing lewat parameter
      const freshToken =
        tokenTerbaru || (await registerForPushNotificationsAsync());
      const currentFcmToken =
        freshToken || (Platform.OS === 'web' ? 'WEB_TOKEN' : 'NO_TOKEN');

      const response = await API.post('/auth/google', {
        idToken,
        role: form.role,
        targetRole: form.role,
        fcm_token: currentFcmToken,
      });

      if (response.data.success) {
        const { token, user } = response.data;
        await storage.save('userToken', token);
        await storage.save('userData', JSON.stringify(user));

        // Auto Subscribe
        const blacklist = [
          'NO_TOKEN',
          'ERROR_TOKEN',
          'WEB_NO_TOKEN',
          'WEB_TOKEN',
          '',
          null,
          undefined,
        ];
        if (currentFcmToken && !blacklist.includes(currentFcmToken)) {
          await handleSubscribe(currentFcmToken, user.role);
        }

        router.replace(
          user.role === 'mitra' ? '/(mitra)/dashboard' : '/(tabs)',
        );
      }
    } catch (error: any) {
      console.error(
        '❌ Google Register Backend Error:',
        error.response?.data || error.message,
      );
      const msg =
        error.response?.data?.message || 'Registrasi Google bermasalah';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Gagal', msg);
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleRegister = async () => {
    if (!isFormValid) return;
    setLoading(true);
    try {
      // Ambil fresh token
      const freshToken = await registerForPushNotificationsAsync();
      const currentFcmToken = freshToken || (Platform.OS === 'web' ? 'WEB_NO_TOKEN' : 'NO_TOKEN');

      const payload = { ...form, fcm_token: currentFcmToken };
      const response = await API.post('/auth/register', payload);

      if (response.data.success) {
        const { token, user } = response.data;
        await storage.save('userToken', token);
        await storage.save('userData', JSON.stringify(user));

        // Auto Subscribe
        const blacklist = [
          'NO_TOKEN',
          'ERROR_TOKEN',
          'WEB_NO_TOKEN',
          '',
          null,
          undefined,
        ];
        if (currentFcmToken && !blacklist.includes(currentFcmToken)) {
          await handleSubscribe(currentFcmToken, user.role);
        }

        router.replace(
          user.role === 'mitra' ? '/(mitra)/dashboard' : '/(tabs)',
        );
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message || 'Koneksi ke server bermasalah';
      Platform.OS === 'web' ? alert(errorMsg) : Alert.alert('Gagal', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}>
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daftar</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>
        <View style={styles.formSection}>
          <Text style={styles.label}>Nama Lengkap</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Masukkan nama lengkap"
              placeholderTextColor="#A0A0A0"
              autoCapitalize="words"
              value={form.full_name}
              onChangeText={v => setForm({ ...form, full_name: v })}
            />
          </View>
          <Text style={styles.hintText}>Contoh: Budi Santoso</Text>

          <Text style={styles.label}>Nomor Telepon</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Contoh: 08123xxxxx"
              placeholderTextColor="#A0A0A0"
              keyboardType="phone-pad"
              value={form.phone_number}
              onChangeText={v => setForm({ ...form, phone_number: v })}
              maxLength={15}
            />
          </View>
          <Text style={styles.hintText}>Contoh: 08123xxxxx</Text>

          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Masukkan email"
              placeholderTextColor="#A0A0A0"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={v =>
                setForm({ ...form, email: v.toLowerCase().trim() })
              }
            />
          </View>
          <Text style={styles.hintText}>Contoh: nama@email.com</Text>

          <Text style={styles.label}>Kata Sandi</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Masukkan kata sandi"
              placeholderTextColor="#A0A0A0"
              secureTextEntry={!showPassword}
              value={form.password}
              onChangeText={v => setForm({ ...form, password: v })}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={22}
                color="#888"
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.hintText}>Minimal 6 karakter</Text>

          <Text style={styles.label}>Konfirmasi Kata Sandi</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Konfirmasi kata sandi"
              placeholderTextColor="#A0A0A0"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={v => setConfirmPassword(v)}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons
                name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                size={22}
                color="#888"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.btnAction,
              isFormValid ? styles.btnActive : styles.btnDisabled,
            ]}
            onPress={handleRegister}
            disabled={!isFormValid || loading || loadingGoogle}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnActionText}>Daftar</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>Atau daftar dengan</Text>
            <View style={styles.line} />
          </View>

          <TouchableOpacity
            style={[styles.btnAction, styles.btnGoogle]}
            onPress={onGoogleRegisterPress}
            disabled={loading || loadingGoogle}>
            {loadingGoogle ? (
              <ActivityIndicator color="#0c57fe" />
            ) : (
              <>
                <AntDesign
                  name="google"
                  size={20}
                  color="#EA4335"
                  style={{ marginRight: 10 }}
                />
                <Text style={styles.btnGoogleText}>Google</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              Dengan klik{' '}
              <Text style={{ fontWeight: '700', color: '#333' }}>Daftar</Text>,
              saya menyetujui{' '}
              <Text style={styles.linkText}>kebijakan dan privasi</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 20 },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    backgroundColor: '#FFF',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  formSection: { marginTop: 10 },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 15,
    marginBottom: 8,
  },
  inputWrapper: {
    height: 55,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    backgroundColor: '#FFF',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    paddingVertical: Platform.OS === 'web' ? 0 : 8,
    ...Platform.select({
      web: { outlineWidth: 0, outlineStyle: 'none', boxShadow: 'none' } as any,
      default: {},
    }),
  } as TextStyle,
  hintText: { fontSize: 12, color: '#A0A0A0', marginTop: 5, marginLeft: 2 },
  btnAction: {
    height: 55,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  btnActive: { backgroundColor: '#0c57fe' },
  btnDisabled: { backgroundColor: '#E0E0E0' },
  btnActionText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 25 },
  line: { flex: 1, height: 1, backgroundColor: '#EEE' },
  dividerText: { marginHorizontal: 10, color: '#A0A0A0', fontSize: 12 },
  btnGoogle: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    flexDirection: 'row',
    marginTop: 0,
  },
  btnGoogleText: { color: '#333', fontWeight: '700' },
  termsContainer: { marginTop: 30, alignItems: 'center', paddingHorizontal: 10 },
  termsText: { textAlign: 'center', fontSize: 13, color: '#888', lineHeight: 20 },
  linkText: { color: '#00ACC1', textDecorationLine: 'underline' },
});

export default RegisterScreen;