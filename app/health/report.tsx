import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { healthAPI } from '@/lib/api'
import Svg, { Line, Circle, Polyline } from 'react-native-svg'

interface WeeklyReport {
  summary: {
    daysOnTrack: number
    avgCalories: number
    avgProtein: number
    bestDay: string
    worstDay: string
  }
  dailyData: Array<{
    date: string
    calories: number
    protein: number
    onTrack: boolean
  }>
  aiSuggestions: string[]
}

export default function WeeklyReportScreen() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [report, setReport] = useState<WeeklyReport | null>(null)

  useEffect(() => {
    loadReport()
  }, [])

  const loadReport = async () => {
    try {
      const data = await healthAPI.getWeeklyReport()
      setReport(data)
    } catch (error) {
      console.error('Failed to load report:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadReport()
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    )
  }

  if (!report) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>暂无数据</Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => router.push('/health/daily')}
        >
          <Text style={styles.emptyButtonText}>开始记录</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const { summary, dailyData, aiSuggestions } = report

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* 概览卡片 */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>本周概览</Text>
          
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{summary.daysOnTrack}/7</Text>
              <Text style={styles.statLabel}>达标天数</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round(summary.avgCalories)}</Text>
              <Text style={styles.statLabel}>平均热量(kcal)</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round(summary.avgProtein)}g</Text>
              <Text style={styles.statLabel}>平均蛋白质</Text>
            </View>
          </View>

          <View style={styles.bestWorst}>
            <View style={styles.dayBadge}>
              <Text style={styles.dayBadgeLabel}>最佳</Text>
              <Text style={styles.dayBadgeValue}>
                {formatDate(summary.bestDay)}
              </Text>
            </View>
            <View style={[styles.dayBadge, styles.worstBadge]}>
              <Text style={styles.dayBadgeLabel}>需改进</Text>
              <Text style={styles.dayBadgeValue}>
                {formatDate(summary.worstDay)}
              </Text>
            </View>
          </View>
        </View>

        {/* 趋势图 */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>7天趋势</Text>
          <WeeklyChart data={dailyData} />
        </View>

        {/* AI 建议 */}
        <View style={styles.suggestionsCard}>
          <Text style={styles.cardTitle}>💡 AI 建议</Text>
          {aiSuggestions.map((suggestion, index) => (
            <View key={index} style={styles.suggestionItem}>
              <Text style={styles.suggestionBullet}>•</Text>
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

// 简单的折线图组件
interface WeeklyChartProps {
  data: Array<{
    date: string
    calories: number
    protein: number
    onTrack: boolean
  }>
}

function WeeklyChart({ data }: WeeklyChartProps) {
  const width = 350
  const height = 200
  const padding = 40

  const maxCalories = Math.max(...data.map((d) => d.calories), 2000)
  const scaleY = (val: number) =>
    height - padding - ((val / maxCalories) * (height - 2 * padding))

  const points = data.map((d, i) => ({
    x: padding + (i * (width - 2 * padding)) / (data.length - 1),
    y: scaleY(d.calories),
  }))

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <View style={styles.chartContainer}>
      <Svg width={width} height={height}>
        {/* Y轴刻度线 */}
        {[0, 500, 1000, 1500, 2000].map((val) => {
          const y = scaleY(val)
          return (
            <Line
              key={val}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="#E0E0E0"
              strokeWidth="1"
            />
          )
        })}

        {/* 折线 */}
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke="#FF6B35"
          strokeWidth="3"
        />

        {/* 数据点 */}
        {points.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="5"
            fill={data[i].onTrack ? '#4CAF50' : '#F44336'}
            stroke="#FFF"
            strokeWidth="2"
          />
        ))}
      </Svg>

      {/* X轴标签 */}
      <View style={styles.chartLabels}>
        {data.map((d, i) => (
          <Text key={i} style={styles.chartLabel}>
            {new Date(d.date).getDate()}
          </Text>
        ))}
      </View>
    </View>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${weekdays[date.getDay()]} ${date.getMonth() + 1}/${date.getDate()}`
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF6B35',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
  },
  bestWorst: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dayBadge: {
    flex: 1,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  worstBadge: {
    backgroundColor: '#FFEBEE',
  },
  dayBadgeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  dayBadgeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  chartCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  chartContainer: {
    marginTop: 8,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  chartLabel: {
    fontSize: 12,
    color: '#666',
  },
  suggestionsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  suggestionItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  suggestionBullet: {
    fontSize: 16,
    color: '#FF6B35',
    marginRight: 8,
    marginTop: 2,
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
})
