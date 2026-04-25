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
// 密码至少 8 位，且同时包含字母和数字
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { register, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');

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

    if (!PASSWORD_REGEX.test(password)) {
      setPasswordError(t('auth.passwordRequirements'));
      ok = false;
    } else {
      setPasswordError('');
    }

    if (confirm !== password) {
      setConfirmError(t('auth.confirmMismatch'));
      ok = false;
    } else {
      setConfirmError('');
    }
    return ok;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    try {
      await register(email.trim().toLowerCase(), password);
      Toast.show({
        type: 'success',
        text1: t('auth.registerSuccess'),
        visibilityTime: 1800,
      });
      router.replace('/(tabs)');
    } catch (e: unknown) {
      // BUG-20260422-04 修复：按后端 error code 映射 i18n，不再靠
      // message.includes('already') 判断（锁定 / 限流 / validation 都漏）。
      const err = e as {
        code?: string;
        response?: { data?: { code?: string; retryAfter?: number } };
        message?: string;
      };
      const code = err?.code ?? err?.response?.data?.code;
      let msg: string;
      switch (code) {
        case 'EMAIL_TAKEN':
          msg = t('auth.emailTaken');
          break;
        case 'VALIDATION_FAILED':
          msg = t('auth.validationFailed');
          break;
        case 'RATE_LIMITED':
          msg = t('auth.rateLimited', {
            seconds: err?.response?.data?.retryAfter ?? 60,
          });
          break;
        default:
          msg = t('auth.serverError');
      }
      Toast.show({ type: 'error', text1: msg, visibilityTime: 2500 });
    }
  };

  const goLogin = () => {
    router.back();
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

          {/* Logo */}
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🥢</Text>
            </View>
          </View>

          <Text style={styles.title}>{t('auth.registerTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.registerSubtitle')}</Text>

          {/* Email */}
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

          {/* Password */}
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
                  if (confirmError && confirm === v) setConfirmError('');
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
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
            <Text style={styles.hint}>{t('auth.passwordRequirements')}</Text>
            {/* Password strength indicator */}
            {password.length > 0 && (() => {
              const hasLetter = /[A-Za-z]/.test(password);
              const hasDigit = /[0-9]/.test(password);
              const hasSpecial = /[^A-Za-z0-9]/.test(password);
              const len = password.length;
              let score = 0;
              if (len >= 8) score++;
              if (hasLetter && hasDigit) score++;
              if (len >= 12) score++;
              if (hasSpecial) score++;
              const level = score <= 1 ? 0 : score <= 2 ? 1 : 2;
              const labels = [t('auth.strengthWeak'), t('auth.strengthMedium'), t('auth.strengthStrong')];
              const colors = ['#E25C5C', '#F5A623', '#4CAF50'];
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= level ? colors[level] : '#E8E4DF' }} />
                  ))}
                  <Text style={{ fontSize: 11, color: colors[level], marginLeft: 4 }}>{labels[level]}</Text>
                </View>
              );
            })()}
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          </View>

          {/* Confirm password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.confirmPasswordLabel')}</Text>
            <View style={[styles.inputWrap, confirmError ? styles.inputError : null]}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                placeholderTextColor="#BBB"
                value={confirm}
                onChangeText={(v) => {
                  setConfirm(v);
                  if (confirmError) setConfirmError('');
                }}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
              <TouchableOpacity
                onPress={() => setShowConfirm((p) => !p)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            </View>
            {confirmError ? <Text style={styles.errorText}>{confirmError}</Text> : null}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.submitBtnText}>{t('auth.register')}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Login link */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>{t('auth.haveAccount')}</Text>
            <TouchableOpacity onPress={goLogin} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Text style={styles.switchLink}>{t('auth.login')}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.terms}>{t('auth.termsNote')}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
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
  logoWrap: { alignItems: 'center', marginBottom: 20 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFD4B8',
  },
  logoEmoji: { fontSize: 32 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  inputGroup: { marginBottom: 14 },
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
  inputError: { borderColor: '#F44336' },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: COLORS.text, padding: 0 },
  hint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 6,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 6,
    marginLeft: 4,
  },
  submitBtn: {
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
    marginTop: 8,
    marginBottom: 18,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18,
  },
  switchText: { fontSize: 13, color: COLORS.textSecondary },
  switchLink: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  terms: {
    fontSize: 11,
    color: '#BBB',
    textAlign: 'center',
    lineHeight: 16,
  },
});
