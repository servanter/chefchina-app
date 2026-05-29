import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { config } from '@/config/env';
import { useTranslation } from 'react-i18next';

const API_URL = config.API_URL;

export default function CheckoutSuccessScreen() {
  const { session_id } = useLocalSearchParams<{ session_id: string }>();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'success' | 'error'>('success');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (session_id) {
      verifyCheckout();
    }
  }, [session_id]);

  const verifyCheckout = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/checkout/success?session_id=${session_id}`
      );
      const data = await response.json();

      if (response.ok && data.status === 'complete') {
        setStatus('success');
        setMessage(t('payment.subscribeSuccess'));
      } else {
        setStatus('error');
        setMessage(t('payment.verifyFailed'));
      }
    } catch (error) {
      console.error('Verify checkout error:', error);
      setStatus('error');
      setMessage(t('payment.verifyError'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoHome = () => {
    router.replace('/(tabs)');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.loadingText}>{t('payment.verifying')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View
          style={[
            styles.iconContainer,
            status === 'success' ? styles.successIcon : styles.errorIcon,
          ]}
        >
          <Ionicons
            name={status === 'success' ? 'checkmark-circle' : 'close-circle'}
            size={80}
            color={status === 'success' ? '#10b981' : '#ef4444'}
          />
        </View>

        <Text style={styles.title}>
          {status === 'success' ? t('payment.success') : t('payment.failed')}
        </Text>
        <Text style={styles.message}>{message}</Text>

        {status === 'success' && (
          <View style={styles.features}>
            <Text style={styles.featuresTitle}>{t('payment.enjoy')}</Text>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />

            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.featureText}>{t('payment.feature1')}</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
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
        )}

        <TouchableOpacity style={styles.button} onPress={handleGoHome}>
          <Text style={styles.buttonText}>
            {status === 'success' ? t('payment.getStarted') : t('payment.goHome')}
          </Text>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  iconContainer: {
    marginBottom: 24,
  },
  successIcon: {},
  errorIcon: {},
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
  button: {
    backgroundColor: '#f97316',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
