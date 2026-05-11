import React, { useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePaymentPolling } from '@/hooks/usePaymentPolling';

export default function StripeCheckoutScreen() {
  const { url, sessionId } = useLocalSearchParams<{ url: string; sessionId: string }>();
  const webViewRef = useRef<WebView>(null);
  const { pollPaymentStatus } = usePaymentPolling();

  const handleNavigationStateChange = (navState: any) => {
    const currentUrl = navState.url;
    console.log('[Stripe WebView] URL changed:', currentUrl);

    // 检测是否跳转到成功页面
    if (currentUrl.includes('/checkout/success')) {
      console.log('[Stripe WebView] Detected success URL, closing WebView');
      
      // 提取 session_id（虽然我们已经有了，但为了保险起见）
      let extractedSessionId = sessionId;
      try {
        const urlObj = new URL(currentUrl);
        const paramSessionId = urlObj.searchParams.get('session_id');
        if (paramSessionId) {
          extractedSessionId = paramSessionId;
        }
      } catch (e) {
        console.error('[Stripe WebView] Failed to parse URL:', e);
      }

      // 导航到支付结果页面并开始轮询
      router.replace({
        pathname: '/payment-result',
        params: { sessionId: extractedSessionId },
      });
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  if (!url) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>缺少支付链接</Text>
        <TouchableOpacity style={styles.button} onPress={handleGoBack}>
          <Text style={styles.buttonText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="close" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>安全支付</Text>
        <View style={styles.placeholder} />
      </View>

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f97316" />
            <Text style={styles.loadingText}>正在加载支付页面...</Text>
          </View>
        )}
        // 允许 JavaScript
        javaScriptEnabled={true}
        // 允许第三方 cookies（Stripe 需要）
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
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
    width: 44,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  errorText: {
    fontSize: 18,
    color: '#333',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#f97316',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
