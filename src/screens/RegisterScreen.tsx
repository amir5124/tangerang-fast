import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
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
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import API from '../utils/api';
import { storage } from '../utils/storage';
import { registerForPushNotificationsAsync } from '../utils/usePushNotifications';

// Penting untuk menutup session browser setelah auth selesai
WebBrowser.maybeCompleteAuthSession();

const RegisterScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fcmToken, setFcmToken] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    role: 'customer', // Default role untuk aplikasi ini
  });

  // Konfigurasi Google Auth Request
  const [request, googleResponse, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId:
      '206607018424-vpr9bdfrk6oedfcvouf5i5e3lan7ckoh.apps.googleusercontent.com',
    iosClientId: 'CLIENT_ID_IOS.apps.googleusercontent.com', // Ganti dengan ID iOS Anda
    androidClientId: 'CLIENT_ID_ANDROID.apps.googleusercontent.com', // Ganti dengan ID Android Anda
  });

  const isFormValid =
    form.full_name.trim().length > 0 &&
    form.email.trim().includes('@') &&
    form.phone_number.length > 0 &&
    form.password.length >= 6 &&
    form.password === confirmPassword;

  useEffect(() => {
    getDeviceToken();
  }, []);

  // Listener untuk response dari Google
  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const {id_token} = googleResponse.params;
      handleGoogleLoginBackend(id_token);
    }
  }, [googleResponse]);

  const getDeviceToken = async () => {
    try {
      const result = await registerForPushNotificationsAsync();

      if (result) {
        let finalToken = '';
        if (typeof result === 'object') {
          const rawToken = result.token || result.endpoint || '';
          if (rawToken.includes('/send/')) {
            finalToken = rawToken.split('/send/')[1];
          } else {
            finalToken =
              typeof result === 'object' ? JSON.stringify(result) : result;
          }
        } else {
          finalToken = result.includes('/send/')
            ? result.split('/send/')[1]
            : result;
        }
        setFcmToken(finalToken);
      } else {
        setFcmToken('NO_TOKEN');
      }
    } catch (error) {
      console.error('❌ Error Filter Token:', error);
      setFcmToken('ERROR_TOKEN');
    }
  };

  const handleGoogleLoginBackend = async (idToken: string) => {
    setLoading(true);
    try {
      const response = await API.post('/auth/google', {
        idToken,
        role: 'customer', // Jika user baru, otomatis jadi customer
        targetRole: 'customer', // Validasi agar admin tidak bisa masuk ke app customer
        fcm_token: fcmToken,
      });

      if (response.data.token) {
        await storage.save('userToken', response.data.token);
        await storage.save('userData', JSON.stringify(response.data.user));
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Login Google bermasalah';
      Alert.alert('Gagal', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!isFormValid) return;
    setLoading(true);

    const payload = {
      ...form,
      fcm_token: fcmToken,
    };

    try {
      const response = await API.post('/auth/register', payload);
      if (response.status === 201 || response.status === 200) {
        const {token, user} = response.data;
        await Promise.all([
          storage.save('userToken', token),
          storage.save('userData', JSON.stringify(user)),
        ]);
        router.replace('/(tabs)');
      }
    } catch (error) {
      const errorMsg = 'Koneksi ke server bermasalah';
      if (Platform.OS === 'android') {
        ToastAndroid.show(errorMsg, ToastAndroid.LONG);
      } else {
        Alert.alert('Gagal', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{flex: 1}}>
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daftar</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{paddingBottom: 40}}
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
              onChangeText={v => setForm({...form, full_name: v})}
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
              onChangeText={v => setForm({...form, phone_number: v})}
              maxLength={15}
              returnKeyType="done"
              textContentType="telephoneNumber"
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
                setForm({...form, email: v.toLowerCase().trim()})
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
              onChangeText={v => setForm({...form, password: v})}
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
          <Text style={styles.hintText}>Pastikan kata sandi anda sesuai</Text>

          <TouchableOpacity
            style={[
              styles.btnAction,
              isFormValid ? styles.btnActive : styles.btnDisabled,
            ]}
            onPress={handleRegister}
            disabled={!isFormValid || loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnActionText}>Daftar</Text>
            )}
          </TouchableOpacity>

          {/* Divider atau Pemisah */}
          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>Atau daftar dengan</Text>
            <View style={styles.line} />
          </View>

          {/* Tombol Google */}
          <TouchableOpacity
            style={[styles.btnAction, styles.btnGoogle]}
            onPress={() => promptAsync()}
            disabled={!request || loading}>
            <Ionicons
              name="logo-google"
              size={20}
              color="#DB4437"
              style={{marginRight: 10}}
            />
            <Text style={styles.btnGoogleText}>Daftar dengan Google</Text>
          </TouchableOpacity>

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              Dengan klik{' '}
              <Text style={{fontWeight: '700', color: '#333'}}>Daftar</Text>,
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
  container: {flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 20},
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    backgroundColor: '#FFF',
  },
  headerTitle: {fontSize: 18, fontWeight: '700', color: '#333'},
  formSection: {marginTop: 10},
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
      web: {outlineWidth: 0, outlineStyle: 'none', boxShadow: 'none'} as any,
      default: {},
    }),
  } as TextStyle,
  hintText: {fontSize: 12, color: '#A0A0A0', marginTop: 5, marginLeft: 2},
  btnAction: {
    height: 55,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  btnActive: {backgroundColor: '#633594'},
  btnDisabled: {backgroundColor: '#E0E0E0'},
  btnActionText: {color: '#FFF', fontSize: 16, fontWeight: '700'},
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 25,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#EEE',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#A0A0A0',
    fontSize: 12,
  },
  btnGoogle: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    flexDirection: 'row',
    marginTop: 0, // Sudah diatur margin oleh divider
  },
  btnGoogleText: {color: '#333', fontWeight: '700'},
  termsContainer: {marginTop: 30, alignItems: 'center', paddingHorizontal: 10},
  termsText: {textAlign: 'center', fontSize: 13, color: '#888', lineHeight: 20},
  linkText: {color: '#00ACC1', textDecorationLine: 'underline'},
});

export default RegisterScreen;
