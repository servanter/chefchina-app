import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { useTheme } from '../src/contexts/ThemeContext';
import { useFontScale } from '../src/hooks/useFontScale';
import { apiClient } from '../src/lib/api';

export default function FeedbackScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { scaled } = useFontScale();
  const isZh = i18n.language === 'zh';

  const [content, setContent] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      Toast.show({
        type: 'error',
        text1: isZh ? '请输入反馈内容' : 'Please enter feedback content',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/feedback', {
        content: content.trim(),
        email: email.trim() || undefined,
      });

      Toast.show({
        type: 'success',
        text1: isZh ? '反馈已提交' : 'Feedback submitted',
        text2: isZh ? '感谢您的反馈！' : 'Thank you for your feedback!',
      });

      router.back();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: isZh ? '提交失败，请稍后重试' : 'Failed to submit, please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaled(17) }]}>
            {isZh ? '意见反馈' : 'Feedback'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: scaled(16) }]}>
              {isZh ? '反馈内容' : 'Feedback Content'}
              <Text style={{ color: '#dc2626' }}> *</Text>
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.text,
                  fontSize: scaled(14),
                },
              ]}
              placeholder={
                isZh
                  ? '请描述您遇到的问题或建议...'
                  : 'Please describe the problem or suggestion...'
              }
              placeholderTextColor={colors.subText}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={8}
              maxLength={2000}
              textAlignVertical="top"
            />
            <Text style={[styles.charCount, { color: colors.subText, fontSize: scaled(12) }]}>
              {content.length} / 2000
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: scaled(16) }]}>
              {isZh ? '联系方式（可选）' : 'Contact Email (Optional)'}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.text,
                  fontSize: scaled(14),
                },
              ]}
              placeholder={isZh ? '如需回复请留下邮箱' : 'Leave your email for reply'}
              placeholderTextColor={colors.subText}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.tipBox}>
            <Ionicons name="information-circle-outline" size={20} color={colors.subText} />
            <Text style={[styles.tipText, { color: colors.subText, fontSize: scaled(13) }]}>
              {isZh
                ? '您的反馈对我们非常重要，我们会尽快处理并改进产品。'
                : 'Your feedback is very important to us. We will process it as soon as possible.'}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: colors.tint },
              isSubmitting && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || !content.trim()}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={[styles.submitBtnText, { fontSize: scaled(16) }]}>
                {isZh ? '提交反馈' : 'Submit Feedback'}
              </Text>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    minHeight: 180,
    maxHeight: 300,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    height: 48,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 6,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 16,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderRadius: 12,
    marginBottom: 24,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
