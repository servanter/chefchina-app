import { useState } from 'react';
import { config } from '@/config/env';

const API_URL = config.API_URL;

interface SubscriptionData {
  planType: string;
  status: string;
  currentPeriodEnd?: string;
}

interface PaymentStatusResponse {
  success: boolean;
  data?: {
    status: 'complete' | 'pending' | 'failed';
    subscription?: SubscriptionData;
  };
  error?: string;
}

export function usePaymentPolling() {
  const [polling, setPolling] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | 'timeout' | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const pollPaymentStatus = async (sessionId: string): Promise<void> => {
    setPolling(true);
    setResult(null);
    setErrorMessage('');

    const maxAttempts = 30; // 最多轮询 30 次
    const interval = 2000; // 每 2 秒一次

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[Payment Polling] Attempt ${attempt}/${maxAttempts} for session:`, sessionId);

        const response = await fetch(
          `${API_URL}/api/checkout/status?session_id=${sessionId}`
        );

        const data: PaymentStatusResponse = await response.json();

        console.log('[Payment Polling] Response:', data);

        if (!response.ok) {
          // API 返回错误
          setResult('error');
          setErrorMessage(data.error || '支付验证失败');
          setPolling(false);
          return;
        }

        if (data.success && data.data) {
          const { status, subscription: sub } = data.data;

          if (status === 'complete' && sub) {
            // 支付成功
            console.log('[Payment Polling] Payment completed successfully');
            setResult('success');
            setSubscription(sub);
            setPolling(false);
            return;
          }

          if (status === 'failed') {
            // 支付失败
            console.log('[Payment Polling] Payment failed');
            setResult('error');
            setErrorMessage('支付失败，请重试');
            setPolling(false);
            return;
          }

          // status === 'pending'，继续轮询
          console.log('[Payment Polling] Payment still pending, will retry...');
        }

        // 等待 2 秒后继续轮询
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, interval));
        }
      } catch (error) {
        console.error('[Payment Polling] Network error:', error);
        
        // 如果不是最后一次尝试，继续轮询
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, interval));
          continue;
        }
        
        // 最后一次尝试失败
        setResult('error');
        setErrorMessage('网络错误，请检查连接后重试');
        setPolling(false);
        return;
      }
    }

    // 超时（30 次轮询后仍未完成）
    console.log('[Payment Polling] Timeout after', maxAttempts, 'attempts');
    setResult('timeout');
    setErrorMessage('支付验证超时，请稍后在个人中心查看订单状态');
    setPolling(false);
  };

  const reset = () => {
    setPolling(false);
    setResult(null);
    setSubscription(null);
    setErrorMessage('');
  };

  return {
    polling,
    result,
    subscription,
    errorMessage,
    pollPaymentStatus,
    reset,
  };
}
