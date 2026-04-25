import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { submitReport, ReportTargetType, ReportReasonType } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';

const REPORT_REASONS: ReportReasonType[] = [
  'SPAM',
  'INAPPROPRIATE',
  'COPYRIGHT',
  'HARMFUL',
  'OTHER',
];

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
}

export function ReportModal({ visible, onClose, targetType, targetId }: ReportModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [reason, setReason] = useState<ReportReasonType | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;

    setSubmitting(true);
    try {
      await submitReport({
        targetType,
        targetId,
        reason,
        description: description.trim() || undefined,
      });
      Toast.show({
        type: 'success',
        text1: t('report.success'),
        text2: t('report.successHint'),
      });
      onClose();
      // Reset state
      setReason(null);
      setDescription('');
    } catch (error: any) {
      const msg = error?.message?.includes('already')
        ? t('report.success') // Already reported, treat as success
        : t('report.failed');
      Toast.show({ type: 'error', text1: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason(null);
    setDescription('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>
              {targetType === 'RECIPE' ? t('report.recipe') : t('report.comment')}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Reason selection */}
            <Text style={[styles.label, { color: colors.text }]}>{t('report.selectReason')}</Text>
            {REPORT_REASONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.reasonRow, reason === r && { backgroundColor: colors.chipBg }]}
                onPress={() => setReason(r)}
              >
                <Ionicons
                  name={reason === r ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={reason === r ? colors.tint : colors.subText}
                />
                <Text style={[styles.reasonText, { color: colors.text }, reason === r && { color: colors.tint }]}>
                  {t(`report.reasons.${r}`)}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Additional info */}
            <Text style={[styles.label, { marginTop: 16, color: colors.text }]}>{t('report.additionalInfo')}</Text>
            <TextInput
              style={[styles.textArea, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
              placeholder={t('report.additionalPlaceholder')}
              placeholderTextColor={colors.subText}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
            />

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.tint }, (!reason || submitting) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!reason || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>{t('report.submit')}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E4DF',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  reasonRowSelected: {
    backgroundColor: '#FFF5F0',
  },
  reasonText: {
    fontSize: 15,
    color: '#333',
  },
  reasonTextSelected: {
    color: '#E85D26',
    fontWeight: '600',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E8E4DF',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: '#F9F8F6',
  },
  submitBtn: {
    backgroundColor: '#E85D26',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
