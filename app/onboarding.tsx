import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { setOnboardingDone } from '../src/lib/storage';
import { changeLanguage } from '../src/lib/i18n';
import { useTheme } from '../src/contexts/ThemeContext';

const { width } = Dimensions.get('window');
const EFFECTIVE_WIDTH = Math.min(width, 390);

type Step = 1 | 2 | 3;

const STEP_ICONS: Record<Step, string> = {
  1: '🍜',
  2: '🌐',
  3: '🚀',
};

const COLORS = { primary: '#E85D26', background: '#FFFDF9', text: '#1A1A1A', textSecondary: '#666', inputBg: '#F5F2EE', border: '#E8E4DF', card: '#FFF', tint: '#E85D26' };
const STEP_BG_COLORS: Record<Step, string> = {
  1: '#FFF0E8',
  2: '#E8F4FF',
  3: '#E8FFF0',
};

const STEP_ACCENT: Record<Step, string> = {
  1: '#E85D26',
  2: '#2980B9',
  3: '#27AE60',
};

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const [step, setStep] = useState<Step>(1);
  const [selectedLang, setSelectedLang] = useState<'en' | 'zh' | null>(null);

  const handleLanguageSelect = async (lang: 'en' | 'zh') => {
    setSelectedLang(lang);
    await changeLanguage(lang);
  };

  const handleNext = () => {
    if (step < 3) setStep((step + 1) as Step);
  };

  const handleGetStarted = async () => {
    await setOnboardingDone();
    router.replace('/(tabs)');
  };

  const handleSkip = async () => {
    await setOnboardingDone();
    router.replace('/(tabs)');
  };

  const accent = STEP_ACCENT[step];
  const bgColor = STEP_BG_COLORS[step];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      {/* Skip button */}
      {step < 3 && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={[styles.skipText, { color: colors.subText }]}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      )}

      {/* Main content */}
      <View style={styles.content}>
        {/* Big illustration circle */}
        <View style={[styles.illustrationCircle, { backgroundColor: bgColor }]}>
          <Text style={styles.illustrationEmoji}>{STEP_ICONS[step]}</Text>
        </View>

        {/* Step content */}
        {step === 1 && (
          <View style={styles.textBlock}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>{t('onboarding.step1Title')}</Text>
            <Text style={[styles.stepSubtitle, { color: colors.subText }]}>{t('onboarding.step1Subtitle')}</Text>

            {/* Feature pills */}
            <View style={styles.featureList}>
              {[
                { icon: 'restaurant-outline' as const, text: '500+ authentic recipes' },
                { icon: 'language-outline' as const, text: 'Chinese & English bilingual' },
                { icon: 'people-outline' as const, text: 'Global community' },
              ].map((f, i) => (
                <View key={i} style={[styles.featurePill, { backgroundColor: colors.inputBg }]}>
                  <Ionicons name={f.icon} size={16} color={accent} />
                  <Text style={[styles.featurePillText, { color: colors.text }]}>{f.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.textBlock}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>{t('onboarding.step2Title')}</Text>
            <Text style={[styles.stepSubtitle, { color: colors.subText }]}>{t('onboarding.step2Subtitle')}</Text>

            {/* Language selection */}
            <View style={styles.langRow}>
              <TouchableOpacity
                style={[
                  styles.langBtn,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  selectedLang === 'en' && { backgroundColor: accent, borderColor: accent },
                ]}
                onPress={() => handleLanguageSelect('en')}
                activeOpacity={0.8}
              >
                <Text style={styles.langBtnFlag}>🇺🇸</Text>
                <Text style={[styles.langBtnText, { color: colors.text }, selectedLang === 'en' && { color: '#FFF' }]}>
                  {t('onboarding.selectEnglish')}
                </Text>
                {selectedLang === 'en' && (
                  <Ionicons name="checkmark-circle" size={18} color="#FFF" style={{ marginLeft: 6 }} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.langBtn,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  selectedLang === 'zh' && { backgroundColor: accent, borderColor: accent },
                ]}
                onPress={() => handleLanguageSelect('zh')}
                activeOpacity={0.8}
              >
                <Text style={styles.langBtnFlag}>🇨🇳</Text>
                <Text style={[styles.langBtnText, { color: colors.text }, selectedLang === 'zh' && { color: '#FFF' }]}>
                  {t('onboarding.selectChinese')}
                </Text>
                {selectedLang === 'zh' && (
                  <Ionicons name="checkmark-circle" size={18} color="#FFF" style={{ marginLeft: 6 }} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.textBlock}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>{t('onboarding.step3Title')}</Text>
            <Text style={[styles.stepSubtitle, { color: colors.subText }]}>{t('onboarding.step3Subtitle')}</Text>
          </View>
        )}
      </View>

      {/* Bottom section */}
      <View style={styles.bottomSection}>
        {/* Dot indicators */}
        <View style={styles.dotsRow}>
          {([1, 2, 3] as Step[]).map((s) => (
            <View
              key={s}
              style={[
                styles.dot,
                step === s ? { backgroundColor: accent, width: 20 } : { backgroundColor: '#E0DDD8' },
              ]}
            />
          ))}
        </View>

        {/* Action button */}
        {step < 3 ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: accent }]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnText}>{t('onboarding.next')}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: accent }]}
            onPress={handleGetStarted}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnText}>{t('onboarding.getStarted')}</Text>
            <Ionicons name="rocket-outline" size={18} color="#FFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  skipBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    width: '100%',
    maxWidth: EFFECTIVE_WIDTH,
  },
  illustrationCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  illustrationEmoji: {
    fontSize: 64,
  },
  textBlock: {
    alignItems: 'center',
    width: '100%',
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  stepSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  featureList: {
    alignSelf: 'stretch',
    gap: 10,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F5F2EE',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  featurePillText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  langRow: {
    flexDirection: 'column',
    gap: 12,
    alignSelf: 'stretch',
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#E8E4DF',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  langBtnFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  langBtnText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  bottomSection: {
    width: '100%',
    maxWidth: EFFECTIVE_WIDTH,
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 16 : 24,
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 24,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    width: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
