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

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), bio: bio.trim() });
      Toast.show({ type: 'success', text1: t('profile.saveSuccess'), visibilityTime: 1800 });
      router.back();
    } catch {
      Toast.show({ type: 'error', text1: t('common.error'), visibilityTime: 2000 });
    } finally {
      setSaving(false);
    }
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
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('profile.editProfile')}</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Avatar placeholder */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarEmoji}>👨‍🍳</Text>
            </View>
          </View>

          {/* Name input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.nameLabel')}</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('profile.namePlaceholder')}
                placeholderTextColor="#BBB"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="next"
                maxLength={50}
              />
            </View>
          </View>

          {/* Bio input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.bioLabel')}</Text>
            <View style={[styles.inputWrap, styles.textAreaWrap]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t('profile.bioPlaceholder')}
                placeholderTextColor="#BBB"
                value={bio}
                onChangeText={setBio}
                multiline
                maxLength={200}
                textAlignVertical="top"
              />
            </View>
            <Text style={styles.charCount}>{bio.length}/200</Text>
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, (saving || !name.trim()) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving || !name.trim()}
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
    marginBottom: 28,
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
    marginBottom: 32,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFD4B8',
  },
  avatarEmoji: {
    fontSize: 36,
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
  charCount: {
    fontSize: 11,
    color: '#AAA',
    textAlign: 'right',
    marginTop: 4,
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
