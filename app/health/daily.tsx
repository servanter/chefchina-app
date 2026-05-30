import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle, Text as SvgText } from 'react-native-svg'
import { healthAPI, type IntakeRecord } from '@/lib/api'
import MealLogger from '@/components/MealLogger'
import { useTheme } from '@/contexts/ThemeContext'

interface NutritionProgress {
  calories: { current: number; target: number }
  protein: { current: number; target: number }
  sodium: { current: number; target: number }
}

export default function DailyNutritionScreen() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showLogger, setShowLogger] = useState(false)
  
  const [nutrition, setNutrition] = useState<NutritionProgress>({
    calories: { current: 0, target: 2000 },
    protein: { current: 0, target: 150 },
    sodium: { current: 0, target: 2300 },
  })
  
  const [intakes, setIntakes] = useState<IntakeRecord[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const data = await healthAPI.getDailyNutrition()
      
      // 直接使用 API 返回的 nutrition 结构
      if (data.nutrition) {
        setNutrition(data.nutrition)
      }
      setIntakes(data.intakes || [])
    } catch (error) {
      console.error('Failed to load nutrition data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  const handleLogMeal = () => {
    setShowLogger(true)
  }

  const handleMealLogged = () => {
    setShowLogger(false)
    loadData() // 重新加载数据
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header with Back Button */}
      <View style={[styles.headerRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.inputBg }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('health.dailyLog')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.tint} />
        }
      >
        {/* 营养进度环 */}
        <View style={[styles.progressSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('health.todayProgress')}</Text>
          <View style={styles.progressContainer}>
            <CircularProgress
              current={nutrition.calories.current}
              target={nutrition.calories.target}
              label={t('health.calories')}
              unit="kcal"
              color="#FF6B35"
              size={120}
              subTextColor={colors.subText}
            />
            <CircularProgress
              current={nutrition.protein.current}
              target={nutrition.protein.target}
              label={t('health.protein')}
              unit="g"
              color="#4CAF50"
              size={100}
              subTextColor={colors.subText}
            />
            <CircularProgress
              current={nutrition.sodium.current}
              target={nutrition.sodium.target}
              label={t('health.sodium')}
              unit="mg"
              color="#2196F3"
              size={100}
              subTextColor={colors.subText}
            />
          </View>
        </View>

        {/* 摄入记录列表 */}
        <View style={[styles.listSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('health.mealHistory')}</Text>
          {intakes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.subText }]}>{t('health.noData')}</Text>
              <Text style={[styles.emptyHint, { color: colors.subText }]}>{t('health.startLogging')}</Text>
            </View>
          ) : (
            intakes.map((intake) => (
              <View key={intake.id} style={[styles.intakeItem, { borderBottomColor: colors.border }]}>
                <View style={styles.intakeHeader}>
                  <Text style={[styles.recipeName, { color: colors.text }]}>
                    {intake.recipeName}
                  </Text>
                  <Text style={styles.mealType}>{getMealTypeLabel(intake.mealType)}</Text>
                </View>
                <View style={styles.intakeStats}>
                  <Text style={[styles.intakeStat, { color: colors.subText }]}>
                    {intake.calories} kcal
                  </Text>
                  <Text style={[styles.intakeStat, { color: colors.subText }]}>
                    {t('health.protein')} {intake.protein}g
                  </Text>
                  <Text style={[styles.intakeStat, { color: colors.subText }]}>
                    {intake.servings}{t('common.servings', { defaultValue: '份' })}
                  </Text>
                </View>
                <Text style={[styles.intakeTime, { color: colors.subText }]}>
                  {new Date(intake.createdAt).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* 记录按钮 */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.logButton} onPress={handleLogMeal}>
          <Text style={styles.logButtonText}>+ {t('health.logMeal')}</Text>
        </TouchableOpacity>
      </View>

      {/* 摄入记录模态框 */}
      {showLogger && (
        <MealLogger
          visible={showLogger}
          onClose={() => setShowLogger(false)}
          onSuccess={handleMealLogged}
        />
      )}
    </View>
  )
}

// 环形进度条组件
interface CircularProgressProps {
  current: number
  target: number
  label: string
  unit: string
  color: string
  size: number
  subTextColor: string
}

function CircularProgress({
  current,
  target,
  label,
  unit,
  color,
  size,
  subTextColor,
}: CircularProgressProps) {
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(current / target, 1)
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <View style={[styles.circularProgress, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* 背景圈 */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E0E0E0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* 进度圈 */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.progressInfo}>
        <Text style={[styles.progressValue, { color }]}>
          {Math.round(current)}
        </Text>
        <Text style={[styles.progressTarget, { color: subTextColor }]}>/ {target}</Text>
        <Text style={[styles.progressLabel, { color: subTextColor }]}>{label}</Text>
      </View>
    </View>
  )
}

function getMealTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐',
    snack: '加餐',
  }
  return labels[type] || type
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  progressSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  circularProgress: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressInfo: {
    position: 'absolute',
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  progressTarget: {
    fontSize: 12,
  },
  progressLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  listSection: {
    borderRadius: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
  },
  intakeItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  intakeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  mealType: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '500',
  },
  intakeStats: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  intakeStat: {
    fontSize: 14,
    marginRight: 16,
  },
  intakeTime: {
    fontSize: 12,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  logButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  logButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
})
