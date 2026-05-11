import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { config } from '@/config/env';

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

const plans: PricingPlan[] = [
  {
    id: 'first-month',
    name: 'Premium (首月)',
    price: '$2.99',
    period: '首月',
    popular: true,
    trial: '立即开始，无需绑卡',
  },
  {
    id: 'monthly',
    name: 'Premium (月付)',
    price: '$4.99',
    period: '每月',
    trial: '14 天免费试用',
  },
  {
    id: 'yearly',
    name: 'Premium (年付)',
    price: '$49.99',
    period: '每年',
    savings: '节省 $10',
    trial: '14 天免费试用',
  },
];

const features = {
  free: [
    { text: '基础菜谱浏览', included: true },
    { text: '收藏上限 20 条', included: true },
    { text: '历史数据保留 30 天', included: true },
    { text: 'AI 营养建议', included: false },
    { text: '无限收藏', included: false },
    { text: '永久数据保留', included: false },
  ],
  premium: [
    { text: '所有免费功能', included: true },
    { text: 'AI 个性化营养建议', included: true },
    { text: '无限收藏菜谱', included: true },
    { text: '永久数据保留', included: true },
    { text: '优先客服支持', included: true },
    { text: '更多功能持续更新', included: true },
  ],
};

export default function PricingScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<PlanType | null>(null);

  const handleSubscribe = async (planType: PlanType) => {
    if (!user) {
      Alert.alert('提示', '请先登录', [
        {
          text: '去登录',
          onPress: () => router.push('/auth/login'),
        },
        { text: '取消', style: 'cancel' },
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

      // 使用 WebView 打开 Stripe Checkout
      if (data.url && data.sessionId) {
        router.push({
          pathname: '/stripe-checkout',
          params: {
            url: data.url,
            sessionId: data.sessionId,
          },
        });
      } else {
        Alert.alert('错误', '支付链接无效');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      Alert.alert('错误', '创建订阅失败，请稍后再试');
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
          <Text style={styles.title}>升级 Premium</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>解锁全部功能</Text>
          <Text style={styles.heroSubtitle}>
            获得 AI 营养师的专业建议，无限收藏你喜欢的菜谱
          </Text>
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
                  <Text style={styles.popularText}>最受欢迎</Text>
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
                    开始试用
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Feature Comparison */}
        <View style={styles.comparisonContainer}>
          <Text style={styles.comparisonTitle}>功能对比</Text>

          <View style={styles.comparisonTable}>
            <View style={styles.comparisonHeader}>
              <Text style={styles.comparisonHeaderText}>免费版</Text>
              <Text style={styles.comparisonHeaderText}>Premium</Text>
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
          <Text style={styles.faqTitle}>常见问题</Text>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>如何取消订阅？</Text>
            <Text style={styles.faqAnswer}>
              您可以随时在账户设置中取消订阅，取消后将在当前计费周期结束时生效。
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>14 天免费试用如何工作？</Text>
            <Text style={styles.faqAnswer}>
              订阅后的前 14
              天完全免费，试用期结束前会收到提醒。如果不想继续，可以随时取消。
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>支持哪些支付方式？</Text>
            <Text style={styles.faqAnswer}>
              我们支持所有主流信用卡、借记卡，以及 Apple Pay 等支付方式。
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            订阅即表示您同意我们的服务条款和隐私政策
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
