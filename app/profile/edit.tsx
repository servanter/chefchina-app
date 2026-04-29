/**
 * REQ-18.1: 个人资料编辑页面
 * REQ-18.2: 集成表单错误提示
 */

import React, { useState, useEffect } from 'react';
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/contexts/ThemeContext';
import { FieldError, FormBanner, ValidationIcon } from '../../src/components/FormError';

const COLORS = { primary: '#E85D26', background: '#FFFDF9', text: '#1A1A1A', textSecondary: '#666', inputBg: '#F5F2EE', border: '#E8E4DF', card: '#FFF', tint: '#E85D26' };

interface FormErrors {
  nickname?: string;
  bio?: string;
  location?: string;
  form?: string;
}

interface ValidationStatus {
  nickname?: 'valid' | 'invalid';
  bio?: 'valid' | 'invalid';
}

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const { colors } = useTheme();

  const COLORS = {
    primary: colors.tint,
    background: colors.bg,
    text: colors.text,
    textSecondary: colors.subText,
    inputBg: colors.inputBg,
    border: colors.border,
  };

  // 表单状态
  const [nickname, setNickname] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [location, setLocation] = useState(''); // 新增字段
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | 'PRIVATE'>('PRIVATE'); // 新增字段
  const [avatar, setAvatar] = useState(user?.avatar ?? '');
  const [avatarFile, setAvatarFile] = useState<string | null>(null);

  // 错误和验证状态
  const [errors, setErrors] = useState<FormErrors>({});
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // REQ-18.2: 实时验证 - 昵称
  const validateNickname = (value: string): string | undefined => {
    if (!value.trim()) {
      return t('validation.required', { field: t('profile.nickname') });
    }
    if (value.length < 2) {
      return '昵称长度需在 2-20 字符之间';
    }
    if (value.length > 20) {
      return '昵称长度需在 2-20 字符之间';
    }
    return undefined;
  };

  // REQ-18.2: 实时验证 - 简介
  const validateBio = (value: string): string | undefined => {
    if (value.length > 500) {
      return '简介最多 500 字符';
    }
    return undefined;
  };

  // REQ-18.2: 失焦时触发验证
  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });

    if (field === 'nickname') {
      const error = validateNickname(nickname);
      setErrors({ ...errors, nickname: error });
      setValidationStatus({ 
        ...validationStatus, 
        nickname: error ? 'invalid' : 'valid' 
      });
    } else if (field === 'bio') {
      const error = validateBio(bio);
      setErrors({ ...errors, bio: error });
      setValidationStatus({ 
        ...validationStatus, 
        bio: error ? 'invalid' : 'valid' 
      });
    }
  };

  // REQ-18.1: 头像上传
  const handlePickAvatar = async () => {
    try {
      // 请求权限
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ 
          type: 'error', 
          text1: '需要相册权限才能上传头像' 
        });
        return;
      }

      // 选择图片
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingAvatar(true);
        const asset = result.assets[0];

        // 压缩和裁剪
        const manipResult = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 500, height: 500 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        setAvatarFile(manipResult.uri);
        setAvatar(manipResult.uri);
        setUploadingAvatar(false);

        Toast.show({ 
          type: 'success', 
          text1: '头像已选择，保存后生效' 
        });
      }
    } catch (error) {
      setUploadingAvatar(false);
      Toast.show({ 
        type: 'error', 
        text1: '头像上传失败，请重试' 
      });
    }
  };

  // REQ-18.1: 保存个人资料
  const handleSave = async () => {
    // 完整验证
    const nicknameError = validateNickname(nickname);
    const bioError = validateBio(bio);

    if (nicknameError || bioError) {
      setErrors({
        nickname: nicknameError,
        bio: bioError,
        form: '请修正表单错误后再提交',
      });
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      // 1. 如果有新头像，先上传
      let avatarUrl = avatar;
      if (avatarFile) {
        // TODO: 调用头像上传 API
        // const formData = new FormData();
        // formData.append('avatar', {
        //   uri: avatarFile,
        //   name: 'avatar.jpg',
        //   type: 'image/jpeg',
        // } as any);
        // const uploadRes = await fetch('/api/users/me/avatar', {
        //   method: 'POST',
        //   body: formData,
        // });
        // const uploadData = await uploadRes.json();
        // avatarUrl = uploadData.avatar;
      }

      // 2. 更新个人资料
      await updateProfile({
        name: nickname.trim(),
        bio: bio.trim(),
        // location: location.trim() || undefined,
        // gender,
        // avatar: avatarUrl,
      });

      Toast.show({ 
        type: 'success', 
        text1: '个人资料已更新', 
        visibilityTime: 1800 
      });
      router.back();
    } catch (error: any) {
      const errorMessage = error?.message || '保存失败，请重试';
      setErrors({ form: errorMessage });
      Toast.show({ 
        type: 'error', 
        text1: errorMessage, 
        visibilityTime: 2000 
      });
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = !errors.nickname && !errors.bio && nickname.trim().length >= 2;

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
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('profile.editProfile')}</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* REQ-18.2: 表单级错误提示 */}
          <FormBanner 
            message={errors.form} 
            type="error"
            onDismiss={() => setErrors({ ...errors, form: undefined })}
          />

          {/* REQ-18.1: 头像上传 */}
          <View style={styles.avatarSection}>
            <TouchableOpacity 
              style={styles.avatarCircle} 
              onPress={handlePickAvatar}
              disabled={uploadingAvatar}
            >
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarEmoji}>👨‍🍳</Text>
              )}
              {uploadingAvatar && (
                <View style={styles.avatarLoading}>
                  <ActivityIndicator color="#FFF" />
                </View>
              )}
              <View style={styles.avatarBadge}>
                <Ionicons name="camera" size={16} color="#FFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>点击上传头像</Text>
          </View>

          {/* REQ-18.1: 昵称 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t('profile.nickname')} <Text style={styles.required}>*</Text>
            </Text>
            <View style={[
              styles.inputWrap,
              touched.nickname && errors.nickname && styles.inputWrapError,
            ]}>
              <Ionicons name="person-outline" size={18} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="请输入昵称 (2-20字符)"
                placeholderTextColor="#BBB"
                value={nickname}
                onChangeText={(text) => {
                  setNickname(text);
                  if (touched.nickname) {
                    const error = validateNickname(text);
                    setErrors({ ...errors, nickname: error });
                    setValidationStatus({ 
                      ...validationStatus, 
                      nickname: error ? 'invalid' : 'valid' 
                    });
                  }
                }}
                onBlur={() => handleBlur('nickname')}
                autoCapitalize="none"
                returnKeyType="next"
                maxLength={20}
              />
              {touched.nickname && (
                <ValidationIcon status={validationStatus.nickname} />
              )}
            </View>
            {touched.nickname && <FieldError message={errors.nickname} />}
          </View>

          {/* REQ-18.1: 简介 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.bioLabel')}</Text>
            <View style={[
              styles.inputWrap, 
              styles.textAreaWrap,
              touched.bio && errors.bio && styles.inputWrapError,
            ]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="介绍一下自己吧~"
                placeholderTextColor="#BBB"
                value={bio}
                onChangeText={(text) => {
                  setBio(text);
                  if (touched.bio) {
                    const error = validateBio(text);
                    setErrors({ ...errors, bio: error });
                    setValidationStatus({ 
                      ...validationStatus, 
                      bio: error ? 'invalid' : 'valid' 
                    });
                  }
                }}
                onBlur={() => handleBlur('bio')}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.charCountRow}>
              {touched.bio && <FieldError message={errors.bio} />}
              <Text style={styles.charCount}>{bio.length}/500</Text>
            </View>
          </View>

          {/* REQ-18.1: 所在地 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>所在地</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="location-outline" size={18} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="选填"
                placeholderTextColor="#BBB"
                value={location}
                onChangeText={setLocation}
                returnKeyType="done"
                maxLength={100}
              />
            </View>
          </View>

          {/* REQ-18.1: 性别 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>性别</Text>
            <View style={styles.genderRow}>
              {[
                { value: 'MALE' as const, label: '男', icon: 'male' },
                { value: 'FEMALE' as const, label: '女', icon: 'female' },
                { value: 'OTHER' as const, label: '其他', icon: 'transgender' },
                { value: 'PRIVATE' as const, label: '保密', icon: 'eye-off' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.genderButton,
                    gender === option.value && styles.genderButtonActive,
                  ]}
                  onPress={() => setGender(option.value)}
                >
                  <Ionicons 
                    name={option.icon as any} 
                    size={16} 
                    color={gender === option.value ? COLORS.primary : '#999'} 
                  />
                  <Text style={[
                    styles.genderText,
                    gender === option.value && styles.genderTextActive,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 保存按钮 */}
          <TouchableOpacity
            style={[styles.saveBtn, (!isFormValid || saving) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!isFormValid || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.saveBtnText}>{t('common.save')}</Text>
              </>
            )}
          </TouchableOpacity>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F2EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFD4B8',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  avatarEmoji: {
    fontSize: 40,
  },
  avatarLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  avatarHint: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
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
  inputWrapError: {
    borderColor: '#EF4444',
  },
  textAreaWrap: {
    alignItems: 'flex-start',
    paddingTop: 13,
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
  textArea: {
    minHeight: 100,
    lineHeight: 22,
  },
  charCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  charCount: {
    fontSize: 11,
    color: '#AAA',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  genderButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF0E8',
  },
  genderText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#999',
  },
  genderTextActive: {
    color: COLORS.primary,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
