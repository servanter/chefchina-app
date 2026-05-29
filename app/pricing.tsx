import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { config } from '@/config/env';
import { useTranslation } from 'react-i18next';

const API_URL = config.API_URL;

type PlanType = 'first-month' | 'monthly' | 'yearly';

interface PricingPlan {
  id: PlanType;
  name: string;
  price: string;
  period: string;
  popular?: boolean;
  savings?: string;
  trial: string;
}


export default function PricingScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<PlanType | null>(null);
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';

  const plans: PricingPlan[] = [
    {
      id: 'first-month',
      name: t('pricing.firstMonthName'),
      price: '$2.99',
      period: t('pricing.firstMonth'),
      popular: true,
      trial: t('pricing.trialInfo'),
    },
    {
      id: 'monthly',
      name: t('pricing.monthlyName'),
      price: '$4.99',
      period: t('pricing.monthly'),
      trial: t('pricing.trialInfo'),
    },
    {
      id: 'yearly',
      name: t('pricing.yearlyName'),
      price: '$49.99',
      period: t('pricing.yearly'),
      savings: isZh ? '节省 $10' : 'Save $10',
      trial: t('pricing.trialInfo'),
    },
  ];

  const features = {
    free: [
      { text: isZh ? '基础菜谱浏览' : 'Basic recipe browsing', included: true },
      { text: isZh ? '收藏上限 20 条' : 'Up to 20 saved recipes', included: true },
      { text: isZh ? '历史数据保留 30 天' : '30-day data retention', included: true },
      { text: isZh ? 'AI 营养建议' : 'AI nutrition advice', included: false },
      { text: isZh ? '无限收藏' : 'Unlimited saves', included: false },
      { text: isZh ? '永久数据保留' : 'Permanent data retention', included: false },
    ],
    premium: [
      { text: isZh ? '所有免费功能' : 'All free features', included: true },
      { text: isZh ? 'AI 个性化营养建议' : 'AI-powered nutrition advice', included: true },
      { text: isZh ? '无限收藏菜谱' : 'Unlimited recipe saves', included: true },
      { text: isZh ? '永久数据保留' : 'Permanent data retention', included: true },
      { text: isZh ? '优先客服支持' : 'Priority support', included: true },
      { text: isZh ? '更多功能持续更新' : 'Continuous new features', included: true },
    ],
  };

  const handleSubscribe = async (planType: PlanType) => {
    if (!user) {
      Alert.alert(t('common.error'), t('pricing.loginRequired'), [
        {
          text: t('pricing.goLogin'),
          onPress: () => router.push('/auth/login'),
        },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
      return;
    }

    setLoading(planType);

    try {
      const response = await fetch(`${API_URL}/api/checkout/create-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          planType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // 根据平台选择不同的支付方式
      if (data.url && data.sessionId) {
        if (Platform.OS === 'web') {
          // Web 环境：保存 sessionId 到 localStorage 并自动检测窗口关闭
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('pendingSessionId', data.sessionId);
          }
          
          const win = window.open(data.url, '_blank');
          if (!win) {
            Alert.alert(t('common.error'), t('pricing.errorOpenPayment'));
            // 清理 localStorage
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem('pendingSessionId');
            }
          } else {
            // 轮询检测支付窗口关闭
            const checkClosed = setInterval(() => {
              if (win?.closed) {
                clearInterval(checkClosed);
                // 从 localStorage 读取 sessionId
                const sessionId = typeof window !== 'undefined' 
                  ? window.localStorage.getItem('pendingSessionId')
                  : null;
                
                if (sessionId) {
                  window.localStorage.removeItem('pendingSessionId');
                  // 自动跳转到支付结果页面，开始轮询
                  router.push({
                    pathname: '/payment-result',
                    params: { sessionId },
                  });
                }
              }
            }, 1000); // 每秒检测一次
          }
        } else {
          // iOS/Android：使用 WebView + 轮询（原方案）
          router.push({
            pathname: '/stripe-checkout',
            params: {
              url: data.url,
              sessionId: data.sessionId,
            },
          });
        }
      } else {
        Alert.alert(t('common.error'), t('pricing.errorInvalidLink'));
      }
    } catch (error) {
      console.error('Subscription error:', error);
      Alert.alert(t('common.error'), t('pricing.errorCreateFailed'));
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>{t('pricing.title')}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>{t('pricing.heroTitle')}</Text>
          <Text style={styles.heroSubtitle}>{t('pricing.heroSubtitle')}</Text>
        </View>

        {/* Pricing Plans */}
        <View style={styles.plansContainer}>
          {plans.map((plan) => (
            <View
              key={plan.id}
              style={[styles.planCard, plan.popular && styles.popularPlan]}
            >
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>{t('pricing.popular')}</Text>
                </View>
              )}
              <Text style={styles.planName}>{plan.name}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>{plan.price}</Text>
                <Text style={styles.period}>/{plan.period}</Text>
              </View>
              {plan.savings && (
                <Text style={styles.savings}>{plan.savings}</Text>
              )}
              <Text style={styles.trial}>{plan.trial}</Text>
              <TouchableOpacity
                style={[
                  styles.subscribeButton,
                  plan.popular && styles.subscribeButtonPrimary,
                ]}
                onPress={() => handleSubscribe(plan.id)}
                disabled={loading !== null}
              >
                {loading === plan.id ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.subscribeButtonText,
                      plan.popular && styles.subscribeButtonTextPrimary,
                    ]}
                  >
                    {t('pricing.startTrial')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Feature Comparison */}
        <View style={styles.comparisonContainer}>
          <Text style={styles.comparisonTitle}>{t('pricing.comparison')}</Text>

          <View style={styles.comparisonTable}>
            <View style={styles.comparisonHeader}>
              <Text style={styles.comparisonHeaderText}>{t('pricing.free')}</Text>
              <Text style={styles.comparisonHeaderText}>{t('pricing.premium')}</Text>
            </View>

            {features.free.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <Text style={styles.featureText}>{feature.text}</Text>
                <View style={styles.featureIcons}>
                  <Ionicons
                    name={feature.included ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={feature.included ? '#10b981' : '#ef4444'}
                  />
                  <Ionicons
                    name={
                      features.premium[index]?.included
                        ? 'checkmark-circle'
                        : 'close-circle'
                    }
                    size={20}
                    color={
                      features.premium[index]?.included ? '#10b981' : '#ef4444'
                    }
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* FAQ */}
        <View style={styles.faqContainer}>
          <Text style={styles.faqTitle}>{t('pricing.faq')}</Text>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>{t('pricing.cancelSubscription')}</Text>
            <Text style={styles.faqAnswer}>{t('pricing.cancelAnswer')}</Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>{t('pricing.faqTrialTitle')}</Text>
            <Text style={styles.faqAnswer}>{t('pricing.faqTrialAnswer')}</Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>{t('pricing.faqPaymentTitle')}</Text>
            <Text style={styles.faqAnswer}>{t('pricing.faqPaymentAnswer')}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('pricing.footerNote')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  hero: {
    padding: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  plansContainer: {
    padding: 16,
    gap: 16,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    position: 'relative',
  },
  popularPlan: {
    borderColor: '#f97316',
    borderWidth: 3,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: '#f97316',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  planName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  price: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#f97316',
  },
  period: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  savings: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
    marginBottom: 8,
  },
  trial: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  subscribeButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  subscribeButtonPrimary: {
    backgroundColor: '#f97316',
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  subscribeButtonTextPrimary: {
    color: '#fff',
  },
  comparisonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  comparisonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  comparisonTable: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
  },
  comparisonHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    width: 100,
    textAlign: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  featureIcons: {
    flexDirection: 'row',
    gap: 40,
    width: 200,
    justifyContent: 'space-around',
  },
  faqContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  faqTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  faqItem: {
    marginBottom: 16,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
