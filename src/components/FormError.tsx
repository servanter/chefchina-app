/**
 * REQ-18.2: 统一表单错误提示组件
 * 
 * 功能：
 * - 字段级错误显示（红色文本 + 图标）
 * - 表单级错误显示（顶部 Banner）
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

// 字段级错误提示
export function FieldError({ message }: { message?: string }) {
  if (!message) return null

  return (
    <View style={styles.fieldErrorContainer}>
      <Ionicons name="alert-circle" size={16} color="#EF4444" />
      <Text style={styles.fieldErrorText}>{message}</Text>
    </View>
  )
}

// 表单级错误提示（顶部 Banner）
export function FormBanner({ 
  message, 
  type = 'error',
  onDismiss 
}: { 
  message?: string
  type?: 'error' | 'success' | 'warning'
  onDismiss?: () => void
}) {
  if (!message) return null

  const backgroundColor = {
    error: '#FEE2E2',
    success: '#D1FAE5',
    warning: '#FEF3C7',
  }[type]

  const textColor = {
    error: '#991B1B',
    success: '#065F46',
    warning: '#92400E',
  }[type]

  const iconName = {
    error: 'alert-circle',
    success: 'checkmark-circle',
    warning: 'warning',
  }[type] as keyof typeof Ionicons.glyphMap

  const iconColor = {
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
  }[type]

  return (
    <View style={[styles.bannerContainer, { backgroundColor }]}>
      <Ionicons name={iconName} size={20} color={iconColor} />
      <Text style={[styles.bannerText, { color: textColor }]}>{message}</Text>
      {onDismiss && (
        <Ionicons 
          name="close" 
          size={20} 
          color={textColor} 
          onPress={onDismiss}
          style={styles.closeIcon}
        />
      )}
    </View>
  )
}

// 验证状态图标
export function ValidationIcon({ status }: { status?: 'valid' | 'invalid' }) {
  if (!status) return null

  return status === 'valid' ? (
    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
  ) : (
    <Ionicons name="close-circle" size={20} color="#EF4444" />
  )
}

const styles = StyleSheet.create({
  fieldErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  fieldErrorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  bannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  closeIcon: {
    padding: 4,
  },
})
