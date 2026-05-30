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
import { useTheme } from '../../src/contexts/ThemeContext';
import { forgotPassword, resetPassword } from '../../src/lib/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = 'email' | 'reset';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();

  const COLORS = {
    primary: colors.tint,
    background: colors.bg,
    text: colors.text,
    textSecondary: colors.subText,
    inputBg: colors.inputBg,
    border: colors.border,
  };

  // ─── State ────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('email');
  const [isLoading, setIsLoading] = useState(false);

  // Step 1
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  // Step 2
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // ─── Step 1: 请求验证码 ────────────────────────────────────────────────────
  const validateEmail = (): boolean => {
    if (!email.trim()) {
      setEmailError(t('auth.errorEmpty'));
      return false;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError(t('auth.errorInvalid'));
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSendCode = async () => {
    if (!validateEmail()) return;
    setIsLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      Toast.show({
        type: 'success',
        text1: t('forgotPassword.codeSentTitle'),
        text2: t('forgotPassword.codeSentMsg'),
        visibilityTime: 3000,
      });
      setStep('reset');
    } catch {
      Toast.show({
        type: 'error',
        text1: t('auth.serverError'),
        visibilityTime: 2500,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Step 2: 提交验证码 + 新密码 ─────────────────────────────────────────
  const validateReset = (): boolean => {
    let ok = true;
    if (!code.trim() || !/^\d{6}$/.test(code.trim())) {
      setCodeError(t('forgotPassword.codeError'));
      ok = false;
    } else {
      setCodeError('');
    }
    if (!newPassword || newPassword.length < 8) {
      setNewPasswordError(t('auth.passwordTooShort'));
      ok = false;
    } else if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setNewPasswordError(t('auth.passwordWeak'));
      ok = false;
    } else {
      setNewPasswordError('');
    }
    if (!confirmPassword) {
      setConfirmPasswordError(t('forgotPassword.confirmPasswordRequired'));
      ok = false;
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError(t('forgotPassword.passwordMismatch'));
      ok = false;
    } else {
      setConfirmPasswordError('');
    }
    return ok;
  };

  const handleResetPassword = async () => {
    if (!validateReset()) return;
    setIsLoading(true);
    try {
      await resetPassword(email.trim().toLowerCase(), code.trim(), newPassword);
      Toast.show({
        type: 'success',
        text1: t('forgotPassword.resetSuccessTitle'),
        text2: t('forgotPassword.resetSuccessMsg'),
        visibilityTime: 2500,
      });
      router.replace('/auth/login');
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { code?: string } };
      };
      const code_ = err?.response?.data?.code;
      const msg =
        code_ === 'BAD_REQUEST'
          ? t('forgotPassword.invalidCode')
          : t('auth.serverError');
      Toast.show({ type: 'error', text1: msg, visibilityTime: 2500 });
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Render: Step 1 ────────────────────────────────────────────────────────
  const renderEmailStep = () => (
    <>
      <Text style={[styles.stepDesc, { color: COLORS.textSecondary }]}>
        {t('forgotPassword.step1Desc')}
      </Text>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: COLORS.text }]}>
          {t('auth.emailLabel')}
        </Text>
        <View
          style={[
            styles.inputWrap,
            { backgroundColor: COLORS.inputBg, borderColor: COLORS.border },
            emailError ? styles.inputError : null,
          ]}
        >
          <Ionicons name="mail-outline" size={18} color="#999" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: COLORS.text }]}
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
            returnKeyType="done"
            onSubmitEditing={handleSendCode}
          />
        </View>
        {emailError ? (
          <Text style={styles.errorText}>{emailError}</Text>
        ) : null}
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: COLORS.primary }, isLoading && styles.btnDisabled]}
        onPress={handleSendCode}
        disabled={isLoading}
        activeOpacity={0.85}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.primaryBtnText}>{t('forgotPassword.sendCode')}</Text>
        )}
      </TouchableOpacity>
    </>
  );

  // ─── Render: Step 2 ────────────────────────────────────────────────────────
  const renderResetStep = () => (
    <>
      <Text style={[styles.stepDesc, { color: COLORS.textSecondary }]}>
        {t('forgotPassword.step2Desc', { email: email.trim() })}
      </Text>

      {/* 验证码 */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: COLORS.text }]}>
          {t('forgotPassword.codeLabel')}
        </Text>
        <View
          style={[
            styles.inputWrap,
            { backgroundColor: COLORS.inputBg, borderColor: COLORS.border },
            codeError ? styles.inputError : null,
          ]}
        >
          <Ionicons name="key-outline" size={18} color="#999" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: COLORS.text }]}
            placeholder={t('forgotPassword.codePlaceholder')}
            placeholderTextColor="#BBB"
            value={code}
            onChangeText={(v) => {
              setCode(v.replace(/\D/g, '').slice(0, 6));
              if (codeError) setCodeError('');
            }}
            keyboardType="number-pad"
            maxLength={6}
            returnKeyType="next"
          />
        </View>
        {codeError ? <Text style={styles.errorText}>{codeError}</Text> : null}
      </View>

      {/* 新密码 */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: COLORS.text }]}>
          {t('forgotPassword.newPasswordLabel')}
        </Text>
        <View
          style={[
            styles.inputWrap,
            { backgroundColor: COLORS.inputBg, borderColor: COLORS.border },
            newPasswordError ? styles.inputError : null,
          ]}
        >
          <Ionicons name="lock-closed-outline" size={18} color="#999" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: COLORS.text }]}
            placeholder={t('forgotPassword.newPasswordPlaceholder')}
            placeholderTextColor="#BBB"
            value={newPassword}
            onChangeText={(v) => {
              setNewPassword(v);
              if (newPasswordError) setNewPasswordError('');
            }}
            secureTextEntry={!showNewPassword}
            maxLength={72}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
          <TouchableOpacity
            onPress={() => setShowNewPassword((p) => !p)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#999"
            />
          </TouchableOpacity>
        </View>
        {newPasswordError ? (
          <Text style={styles.errorText}>{newPasswordError}</Text>
        ) : null}
      </View>

      {/* 确认密码 */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: COLORS.text }]}>
          {t('forgotPassword.confirmPasswordLabel')}
        </Text>
        <View
          style={[
            styles.inputWrap,
            { backgroundColor: COLORS.inputBg, borderColor: COLORS.border },
            confirmPasswordError ? styles.inputError : null,
          ]}
        >
          <Ionicons name="lock-closed-outline" size={18} color="#999" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: COLORS.text }]}
            placeholder={t('forgotPassword.confirmPasswordPlaceholder')}
            placeholderTextColor="#BBB"
            value={confirmPassword}
            onChangeText={(v) => {
              setConfirmPassword(v);
              if (confirmPasswordError) setConfirmPasswordError('');
            }}
            secureTextEntry={!showConfirmPassword}
            maxLength={72}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleResetPassword}
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword((p) => !p)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#999"
            />
          </TouchableOpacity>
        </View>
        {confirmPasswordError ? (
          <Text style={styles.errorText}>{confirmPasswordError}</Text>
        ) : null}
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: COLORS.primary }, isLoading && styles.btnDisabled]}
        onPress={handleResetPassword}
        disabled={isLoading}
        activeOpacity={0.85}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.primaryBtnText}>{t('forgotPassword.resetButton')}</Text>
        )}
      </TouchableOpacity>

      {/* 重新发送 */}
      <TouchableOpacity
        style={styles.resendBtn}
        onPress={() => setStep('email')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[styles.resendText, { color: COLORS.primary }]}>
          {t('forgotPassword.resendCode')}
        </Text>
      </TouchableOpacity>
    </>
  );

  // ─── Main render ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: COLORS.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.inputBg }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.headerWrap}>
            <View style={[styles.iconCircle, { backgroundColor: '#FFF0E8', borderColor: '#FFD4B8' }]}>
              <Text style={styles.headerEmoji}>🔑</Text>
            </View>
            <Text style={[styles.title, { color: COLORS.text }]}>
              {t('forgotPassword.title')}
            </Text>
            {/* Step indicator */}
            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, step === 'email' ? { backgroundColor: COLORS.primary } : { backgroundColor: '#4CAF50' }]} />
              <View style={[styles.stepLine, { backgroundColor: COLORS.border }]} />
              <View style={[styles.stepDot, step === 'reset' ? { backgroundColor: COLORS.primary } : { backgroundColor: COLORS.border }]} />
            </View>
          </View>

          {step === 'email' ? renderEmailStep() : renderResetStep()}

          {/* Back to login */}
          <View style={styles.loginRow}>
            <Text style={[styles.loginText, { color: COLORS.textSecondary }]}>
              {t('forgotPassword.rememberPassword')}
            </Text>
            <TouchableOpacity
              onPress={() => router.replace('/auth/login')}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={[styles.loginLink, { color: COLORS.primary }]}>
                {t('auth.login')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  headerWrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    marginBottom: 16,
  },
  headerEmoji: {
    fontSize: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepLine: {
    width: 32,
    height: 2,
    borderRadius: 1,
  },
  stepDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
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
    padding: 0,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 6,
    marginLeft: 4,
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#E85D26',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginTop: 4,
    marginBottom: 16,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  resendBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  resendText: {
    fontSize: 13,
    fontWeight: '500',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  loginText: {
    fontSize: 13,
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '700',
  },
});
