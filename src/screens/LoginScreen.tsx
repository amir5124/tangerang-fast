import { AntDesign, Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
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

// Penting untuk menutup session browser setelah login selesai
WebBrowser.maybeCompleteAuthSession();

const LoginScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fcmToken, setFcmToken] = useState('');
  const [form, setForm] = useState({email: '', password: ''});

  const TARGET_ROLE = 'customer';

  // --- LOGIKA GOOGLE AUTH ---
  const [request, googleResponse, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId:
      '206607018424-vpr9bdfrk6oedfcvouf5i5e3lan7ckoh.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const {id_token} = googleResponse.params;
      handleGoogleLoginBackend(id_token);
    }
  }, [googleResponse]);

  const handleGoogleLoginBackend = async (idToken: string) => {
    setLoading(true);
    try {
      const payload = {
        idToken: idToken,
        fcm_token: fcmToken,
        targetRole: TARGET_ROLE, // Pastikan hanya role customer yang bisa masuk
        role: TARGET_ROLE,
      };

      const response = await API.post('/auth/google', payload);

      if (response.data.success) {
        const {token, user} = response.data;
        await storage.save('userToken', token);
        await storage.save('userData', JSON.stringify(user));

        // Navigasi sesuai role (meskipun targetRole sudah kita kunci ke customer)
        if (user.role === 'mitra') {
          router.replace('/(mitra)/dashboard');
        } else {
          router.replace('/(tabs)');
        }
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Gagal login dengan Google';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Login Gagal', msg);
    } finally {
      setLoading(false);
    }
  };
  // --- END LOGIKA GOOGLE AUTH ---

  const isFormValid = form.email.length > 0 && form.password.length > 0;

  useEffect(() => {
    getDeviceToken();
  }, []);

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
        setFcmToken(Platform.OS === 'web' ? 'WEB_NO_TOKEN' : 'NO_TOKEN');
      }
    } catch (error) {
      console.error('❌ Error Filter Token Login:', error);
      setFcmToken('ERROR_TOKEN');
    }
  };

  const handleLogin = async () => {
    if (!isFormValid) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
        fcm_token: fcmToken,
        targetRole: TARGET_ROLE,
      };
      const response = await API.post('/auth/login', payload);

      if (response.data.success || response.status === 200) {
        const {token, user} = response.data;
        await storage.save('userToken', token);
        await storage.save('userData', JSON.stringify(user));

        if (user.role === 'mitra') {
          router.replace('/(mitra)/dashboard');
        } else {
          router.replace('/(tabs)');
        }
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message ||
        'Login Gagal. Periksa kembali akun Anda.';
      Platform.OS === 'web'
        ? alert(errorMsg)
        : Alert.alert('Akses Ditolak', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{flex: 1}}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.logoContainer}>
          <Image
            source={{
              uri: 'https://res.cloudinary.com/dgsdmgcc7/image/upload/v1770989052/Salinan_LOGO_TF_1-removebg-preview_ybdbz0.png',
            }}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Masukkan email"
              placeholderTextColor="#A0A0A0"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              selectionColor="#633594"
              cursorColor="#633594"
              onChangeText={v =>
                setForm({...form, email: v.toLowerCase().trim()})
              }
            />
          </View>
          <Text style={styles.hint}>Contoh: nama@email.com</Text>

          <Text style={[styles.label, {marginTop: 20}]}>Kata Sandi</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Masukkan kata sandi"
              placeholderTextColor="#A0A0A0"
              secureTextEntry={!showPassword}
              value={form.password}
              selectionColor="#633594"
              cursorColor="#633594"
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

          <TouchableOpacity style={styles.forgotPassContainer}>
            <Text style={styles.forgotPassText}>Lupa Kata Sandi?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.btnMain,
              !isFormValid ? styles.btnDisabled : styles.btnActive,
            ]}
            onPress={handleLogin}
            disabled={!isFormValid || loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnMainText}>Masuk</Text>
            )}
          </TouchableOpacity>

          {/* Divider Google */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>atau masuk dengan</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.socialBtn}
            onPress={() => promptAsync()}
            disabled={!request || loading}>
            {loading ? (
              <ActivityIndicator color="#633594" />
            ) : (
              <>
                <AntDesign name="google" size={20} color="#EA4335" />
                <Text style={styles.socialBtnText}>Google</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Belum terdaftar? </Text>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/(auth)/register',
                  params: {role: TARGET_ROLE},
                })
              }>
              <Text style={styles.registerText}>Daftar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 25},
  logoContainer: {alignItems: 'center', marginTop: 50, width: '100%'},
  logoImage: {width: 200, height: 200},
  formSection: {flex: 1, marginTop: -20},
  label: {fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 8},
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
  hint: {fontSize: 12, color: '#A0A0A0', marginTop: 6},
  forgotPassContainer: {alignSelf: 'flex-end', marginTop: 15},
  forgotPassText: {color: '#633594', fontWeight: '700', fontSize: 14},
  btnMain: {
    height: 55,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  btnActive: {backgroundColor: '#633594'},
  btnDisabled: {backgroundColor: '#E0E0E0'},
  btnMainText: {color: '#FFF', fontSize: 16, fontWeight: '700'},
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  dividerLine: {flex: 1, height: 1, backgroundColor: '#EEEEEE'},
  dividerText: {marginHorizontal: 10, color: '#888', fontSize: 13},
  socialBtn: {
    height: 55,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40, // Beri jarak lebih ke footer
    gap: 12,
  },
  socialBtnText: {color: '#333', fontSize: 15, fontWeight: '600'},
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  footerText: {color: '#333', fontSize: 15},
  registerText: {color: '#00BFA5', fontSize: 15, fontWeight: 'bold'},
});

export default LoginScreen;
