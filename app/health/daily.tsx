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
import Svg, { Circle, Text as SvgText } from 'react-native-svg'
import { healthAPI } from '@/lib/api'
import MealLogger from '@/components/MealLogger'

interface NutritionProgress {
  calories: { current: number; target: number }
  protein: { current: number; target: number }
  sodium: { current: number; target: number }
}

interface IntakeRecord {
  id: number
  recipeName: string
  mealType: string
  servings: number
  calories: number
  protein: number
  createdAt: string
}

export default function DailyNutritionScreen() {
  const { t } = useTranslation()
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
      setNutrition(data.nutrition)
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* 营养进度环 */}
        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>今日营养摄入</Text>
          <View style={styles.progressContainer}>
            <CircularProgress
              current={nutrition.calories.current}
              target={nutrition.calories.target}
              label="热量"
              unit="kcal"
              color="#FF6B35"
              size={120}
            />
            <CircularProgress
              current={nutrition.protein.current}
              target={nutrition.protein.target}
              label="蛋白质"
              unit="g"
              color="#4CAF50"
              size={100}
            />
            <CircularProgress
              current={nutrition.sodium.current}
              target={nutrition.sodium.target}
              label="钠"
              unit="mg"
              color="#2196F3"
              size={100}
            />
          </View>
        </View>

        {/* 摄入记录列表 */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>今日摄入</Text>
          {intakes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>还没有记录哦</Text>
              <Text style={styles.emptyHint}>点击下方按钮记录你的饮食</Text>
            </View>
          ) : (
            intakes.map((intake) => (
              <View key={intake.id} style={styles.intakeItem}>
                <View style={styles.intakeHeader}>
                  <Text style={styles.recipeName}>{intake.recipeName}</Text>
                  <Text style={styles.mealType}>{getMealTypeLabel(intake.mealType)}</Text>
                </View>
                <View style={styles.intakeStats}>
                  <Text style={styles.intakeStat}>
                    {intake.calories} kcal
                  </Text>
                  <Text style={styles.intakeStat}>
                    蛋白质 {intake.protein}g
                  </Text>
                  <Text style={styles.intakeStat}>
                    {intake.servings}份
                  </Text>
                </View>
                <Text style={styles.intakeTime}>
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
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logButton} onPress={handleLogMeal}>
          <Text style={styles.logButtonText}>+ 记录摄入</Text>
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
}

function CircularProgress({
  current,
  target,
  label,
  unit,
  color,
  size,
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
        <Text style={styles.progressTarget}>/ {target}</Text>
        <Text style={styles.progressLabel}>{label}</Text>
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
    backgroundColor: '#F5F5F5',
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
  progressSection: {
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
    color: '#999',
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  listSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: '#BBB',
  },
  intakeItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
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
    color: '#333',
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
    color: '#666',
    marginRight: 16,
  },
  intakeTime: {
    fontSize: 12,
    color: '#999',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
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
