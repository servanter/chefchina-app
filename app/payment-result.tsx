import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePaymentPolling } from '@/hooks/usePaymentPolling';
import { useTranslation } from 'react-i18next';

export default function PaymentResultScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { polling, result, subscription, errorMessage, pollPaymentStatus } =
    usePaymentPolling();
  const { t } = useTranslation();

  useEffect(() => {
    if (sessionId) {
      console.log('[Payment Result] Starting polling for session:', sessionId);
      pollPaymentStatus(sessionId);
    }
  }, [sessionId]);

  const handleGoHome = () => {
    router.replace('/(tabs)');
  };

  const handleRetry = () => {
    router.back();
  };

  // 轮询中
  if (polling) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.loadingTitle}>{t('payment.verifying')}</Text>
          <Text style={styles.loadingSubtitle}>{t('payment.pleaseWait')}</Text>
        </View>
      </View>
    );
  }

  // 支付成功
  if (result === 'success' && subscription) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#10b981" />
          </View>

          <Text style={styles.title}>{t('payment.success')}</Text>
          <Text style={styles.message}>{t('payment.nowPremium')}</Text>

          <View style={styles.features}>
            <Text style={styles.featuresTitle}>{t('payment.enjoy')}</Text>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.featureText}>{t('payment.feature1')}</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.featureText}>{t('payment.feature2')}</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.featureText}>{t('payment.feature3')}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.successButton} onPress={handleGoHome}>
            <Text style={styles.buttonText}>{t('payment.getStarted')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 超时
  if (result === 'timeout') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="time-outline" size={80} color="#f59e0b" />
          </View>

          <Text style={styles.title}>{t('payment.timeout')}</Text>
          <Text style={styles.message}>{errorMessage}</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleGoHome}>
              <Text style={styles.secondaryButtonText}>{t('payment.goHome')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // 支付失败
  if (result === 'error') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="close-circle" size={80} color="#ef4444" />
          </View>

          <Text style={styles.title}>{t('payment.failed')}</Text>
          <Text style={styles.message}>{errorMessage || t('payment.failedMsg')}</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleRetry}>
              <Text style={styles.buttonText}>{t('common.retry')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleGoHome}>
              <Text style={styles.secondaryButtonText}>{t('payment.goHome')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // 未知状态（不应该到这里）
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t('payment.processing')}</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleGoHome}>
          <Text style={styles.secondaryButtonText}>{t('payment.goHome')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  features: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#666',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  successButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#f97316',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});
