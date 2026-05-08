import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { healthAPI } from '@/lib/api'
import Slider from '@react-native-community/slider'

type Goal = 'weight_loss' | 'muscle_gain' | 'maintain'

interface HealthProfile {
  goal: Goal
  dailyCalories: number
  proteinPercent: number
  fatPercent: number
  carbsPercent: number
  sodiumLimit?: number
  sugarLimit?: number
}

// Goal options moved to component body to access t()

export default function HealthProfileScreen() {
  const { t } = useTranslation()
  
  const GOAL_OPTIONS = [
    { value: 'weight_loss' as Goal, label: t('health.goals.weight_loss'), emoji: '🔥' },
    { value: 'muscle_gain' as Goal, label: t('health.goals.muscle_gain'), emoji: '💪' },
    { value: 'maintain' as Goal, label: t('health.goals.maintain'), emoji: '⚖️' },
  ]
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [goal, setGoal] = useState<Goal>('maintain')
  const [dailyCalories, setDailyCalories] = useState(2000)
  const [proteinPercent, setProteinPercent] = useState(30)
  const [fatPercent, setFatPercent] = useState(25)
  const [carbsPercent, setCarbsPercent] = useState(45)

  useEffect(() => {
    loadProfile()
  }, [])

  // 自动平衡营养比例
  useEffect(() => {
    const total = proteinPercent + fatPercent + carbsPercent
    if (Math.abs(total - 100) > 1) {
      // 如果总和不是100，按比例调整
      const scale = 100 / total
      setProteinPercent(Math.round(proteinPercent * scale))
      setFatPercent(Math.round(fatPercent * scale))
      setCarbsPercent(Math.round(carbsPercent * scale))
    }
  }, [proteinPercent, fatPercent, carbsPercent])

  const loadProfile = async () => {
    try {
      const data = await healthAPI.getProfile()
      if (data.profile) {
        setGoal(data.profile.goal)
        setDailyCalories(data.profile.dailyCalories)
        setProteinPercent(data.profile.proteinPercent)
        setFatPercent(data.profile.fatPercent)
        setCarbsPercent(data.profile.carbsPercent)
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      await healthAPI.saveProfile({
        goal,
        dailyCalories,
        proteinPercent,
        fatPercent,
        carbsPercent,
        sodiumLimit: 2300,
        sugarLimit: 50,
      })

      Toast.show({
        type: 'success',
        text1: t('health.saveSuccess'),
        text2: t('health.saveSuccessDesc'),
      })

      router.back()
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: t('health.saveFailed'),
        text2: error.message || t('common.retry'),
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('health.profile')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* 快捷入口 */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/health/daily' as any)}
          >
            <Text style={styles.quickActionEmoji}>📊</Text>
            <Text style={styles.quickActionLabel}>{t('health.dailyLog')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/health/report' as any)}
          >
            <Text style={styles.quickActionEmoji}>🤖</Text>
            <Text style={styles.quickActionLabel}>{t('health.aiReport')}</Text>
          </TouchableOpacity>
        </View>

        {/* 健康目标 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('health.goal')}</Text>
          <View style={styles.goalContainer}>
            {GOAL_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.goalButton,
                  goal === option.value && styles.goalButtonActive,
                ]}
                onPress={() => setGoal(option.value)}
              >
                <Text style={styles.goalEmoji}>{option.emoji}</Text>
                <Text
                  style={[
                    styles.goalLabel,
                    goal === option.value && styles.goalLabelActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 每日热量 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('health.dailyCalories')}</Text>
          <View style={styles.sliderContainer}>
            <Text style={styles.calorieValue}>{dailyCalories} {t('health.caloriesUnit')}</Text>
            <Slider
              style={styles.slider}
              minimumValue={1200}
              maximumValue={3000}
              step={50}
              value={dailyCalories}
              onValueChange={setDailyCalories}
              minimumTrackTintColor="#FF6B35"
              maximumTrackTintColor="#E0E0E0"
              thumbTintColor="#FF6B35"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>1200</Text>
              <Text style={styles.sliderLabel}>3000</Text>
            </View>
          </View>
        </View>

        {/* 营养比例 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('health.macroRatio')}</Text>
          
          {/* 蛋白质 */}
          <View style={styles.macroItem}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroLabel}>🥩 {t('health.protein')}</Text>
              <Text style={styles.macroValue}>{proteinPercent}%</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={10}
              maximumValue={50}
              step={5}
              value={proteinPercent}
              onValueChange={(val) => {
                const diff = val - proteinPercent
                setProteinPercent(val)
                // 从碳水中补偿
                setCarbsPercent(Math.max(20, carbsPercent - diff))
              }}
              minimumTrackTintColor="#4CAF50"
              maximumTrackTintColor="#E0E0E0"
              thumbTintColor="#4CAF50"
            />
          </View>

          {/* 脂肪 */}
          <View style={styles.macroItem}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroLabel}>🥑 {t('health.fat')}</Text>
              <Text style={styles.macroValue}>{fatPercent}%</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={15}
              maximumValue={40}
              step={5}
              value={fatPercent}
              onValueChange={(val) => {
                const diff = val - fatPercent
                setFatPercent(val)
                // 从碳水中补偿
                setCarbsPercent(Math.max(20, carbsPercent - diff))
              }}
              minimumTrackTintColor="#FFC107"
              maximumTrackTintColor="#E0E0E0"
              thumbTintColor="#FFC107"
            />
          </View>

          {/* 碳水化合物 */}
          <View style={styles.macroItem}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroLabel}>🍚 {t('health.carbs')}</Text>
              <Text style={styles.macroValue}>{carbsPercent}%</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={20}
              maximumValue={65}
              step={5}
              value={carbsPercent}
              onValueChange={(val) => {
                setCarbsPercent(val)
                // 自动调整其他两项
                const remaining = 100 - val
                const ratio = proteinPercent / (proteinPercent + fatPercent)
                setProteinPercent(Math.round(remaining * ratio / 5) * 5)
                setFatPercent(Math.round(remaining * (1 - ratio) / 5) * 5)
              }}
              minimumTrackTintColor="#2196F3"
              maximumTrackTintColor="#E0E0E0"
              thumbTintColor="#2196F3"
            />
          </View>

          {/* 总计显示 */}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>{t('common.all')}</Text>
            <Text
              style={[
                styles.totalValue,
                Math.abs(proteinPercent + fatPercent + carbsPercent - 100) <= 1
                  ? styles.totalValueValid
                  : styles.totalValueInvalid,
              ]}
            >
              {proteinPercent + fatPercent + carbsPercent}%
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* 保存按钮 */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>{t('health.save')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFF',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F2EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD4B8',
  },
  quickActionEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 13,
    color: '#FF6B35',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  goalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  goalButtonActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF5F2',
  },
  goalEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  goalLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  goalLabelActive: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  sliderContainer: {
    marginTop: 8,
  },
  calorieValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#999',
  },
  macroItem: {
    marginBottom: 20,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  macroLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6B35',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  totalValueValid: {
    color: '#4CAF50',
  },
  totalValueInvalid: {
    color: '#F44336',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  saveButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
})
