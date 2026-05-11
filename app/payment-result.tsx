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

export default function PaymentResultScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { polling, result, subscription, errorMessage, pollPaymentStatus } =
    usePaymentPolling();

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
          <Text style={styles.loadingTitle}>正在确认支付...</Text>
          <Text style={styles.loadingSubtitle}>请稍候，这可能需要几秒钟</Text>
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

          <Text style={styles.title}>支付成功！</Text>
          <Text style={styles.message}>您现在是 Premium 会员了</Text>

          <View style={styles.features}>
            <Text style={styles.featuresTitle}>您现在可以享受：</Text>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.featureText}>AI 个性化营养建议</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.featureText}>无限收藏菜谱</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.featureText}>永久数据保留</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.successButton} onPress={handleGoHome}>
            <Text style={styles.buttonText}>开始使用</Text>
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

          <Text style={styles.title}>验证超时</Text>
          <Text style={styles.message}>{errorMessage}</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleGoHome}>
              <Text style={styles.secondaryButtonText}>返回首页</Text>
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

          <Text style={styles.title}>支付失败</Text>
          <Text style={styles.message}>{errorMessage || '支付未成功，请重试'}</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleRetry}>
              <Text style={styles.buttonText}>重试</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleGoHome}>
              <Text style={styles.secondaryButtonText}>返回首页</Text>
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
        <Text style={styles.title}>处理中...</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleGoHome}>
          <Text style={styles.secondaryButtonText}>返回首页</Text>
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
