import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../src/hooks/useAuth';

const COLORS = {
  primary: '#E85D26',
  background: '#FFFDF9',
  text: '#1A1A1A',
  textSecondary: '#666',
  inputBg: '#F5F2EE',
  border: '#E8E4DF',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const router = useRouter();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validate = () => {
    let ok = true;
    if (!email.trim()) {
      setEmailError(t('auth.errorEmpty'));
      ok = false;
    } else if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError(t('auth.errorInvalid'));
      ok = false;
    } else {
      setEmailError('');
    }

    if (!password) {
      setPasswordError(t('auth.passwordRequired'));
      ok = false;
    } else {
      setPasswordError('');
    }
    return ok;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    try {
      await login(email.trim().toLowerCase(), password);
      // BUG-20260422-11 顺手修：去掉硬编码 "🎉 Welcome!"，走 i18n
      Toast.show({
        type: 'success',
        text1: t('auth.loginSuccess'),
        text2: email.trim(),
        visibilityTime: 1800,
      });
      router.replace('/(tabs)');
    } catch (e: unknown) {
      // BUG-20260422-04 修复：按后端 error code 映射 i18n，不再靠 message 里
      // 捕获 "invalid email" / "password" 关键字（锁定消息、限流消息、zod
      // validation 都匹配不到就会原样把英文塞进 Toast）。
      const err = e as {
        code?: string;
        response?: { data?: { code?: string; retryAfter?: number } };
        message?: string;
      };
      const code = err?.code ?? err?.response?.data?.code;
      let msg: string;
      switch (code) {
        case 'ACCOUNT_LOCKED':
          msg = t('auth.accountLocked');
          break;
        case 'INVALID_CREDENTIALS':
          msg = t('auth.invalidCredentials');
          break;
        case 'RATE_LIMITED':
          msg = t('auth.rateLimited', {
            seconds: err?.response?.data?.retryAfter ?? 60,
          });
          break;
        case 'VALIDATION_FAILED':
          msg = t('auth.validationFailed');
          break;
        default:
          msg = t('auth.serverError');
      }
      Toast.show({ type: 'error', text1: msg, visibilityTime: 2500 });
    }
  };

  const handleGuest = () => {
    router.replace('/(tabs)');
  };

  const goRegister = () => {
    router.push('/auth/register');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color={COLORS.text} />
          </TouchableOpacity>

          {/* Logo / illustration */}
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🍜</Text>
            </View>
          </View>

          {/* Heading */}
          <Text style={styles.title}>{t('auth.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>

          {/* Feature highlights */}
          <View style={styles.features}>
            {[
              { icon: '📖', text: isZh ? '发现500+正宗中国菜谱' : 'Discover 500+ authentic recipes' },
              { icon: '❤️', text: isZh ? '收藏并管理你的最爱' : 'Save & manage your favorites' },
              { icon: '💬', text: isZh ? '与全球美食爱好者互动' : 'Connect with food lovers worldwide' },
            ].map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>

          {/* Email input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.emailLabel')}</Text>
            <View style={[styles.inputWrap, emailError ? styles.inputError : null]}>
              <Ionicons name="mail-outline" size={18} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor="#BBB"
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (emailError) setEmailError('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          </View>

          {/* Password input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.passwordLabel')}</Text>
            <View style={[styles.inputWrap, passwordError ? styles.inputError : null]}>
              <Ionicons name="lock-closed-outline" size={18} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('auth.passwordPlaceholder')}
                placeholderTextColor="#BBB"
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  if (passwordError) setPasswordError('');
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((p) => !p)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            </View>
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          </View>

          {/* Login button */}
          <TouchableOpacity
            style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.loginBtnText}>{t('auth.login')}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Register link */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>{t('auth.noAccount')}</Text>
            <TouchableOpacity onPress={goRegister} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Text style={styles.switchLink}>{t('auth.register')}</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('auth.orContinue')}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Guest button */}
          <TouchableOpacity style={styles.guestBtn} onPress={handleGuest} activeOpacity={0.7}>
            <Text style={styles.guestBtnText}>{t('auth.guestButton')}</Text>
          </TouchableOpacity>

          {/* Terms */}
          <Text style={styles.terms}>{t('auth.termsNote')}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F2EE',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFD4B8',
  },
  logoEmoji: {
    fontSize: 36,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
  },
  features: {
    backgroundColor: '#F5F2EE',
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    fontSize: 18,
    width: 26,
    textAlign: 'center',
  },
  featureText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#F44336',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    padding: 0,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 6,
    marginLeft: 4,
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginTop: 4,
    marginBottom: 16,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18,
  },
  switchText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  switchLink: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: 12,
    color: '#AAA',
  },
  guestBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 24,
  },
  guestBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  terms: {
    fontSize: 11,
    color: '#BBB',
    textAlign: 'center',
    lineHeight: 16,
  },
});
