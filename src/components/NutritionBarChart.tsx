import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Rect, Text as SvgText } from 'react-native-svg'

interface NutritionBarChartProps {
  current: { protein: number; fat: number; carbs: number }
  target: { protein: number; fat: number; carbs: number }
  width?: number
  height?: number
}

export default function NutritionBarChart({
  current,
  target,
  width = 350,
  height = 200,
}: NutritionBarChartProps) {
  const padding = 40
  const barWidth = (width - 2 * padding - 40) / 3
  const maxValue = Math.max(
    target.protein,
    target.fat,
    target.carbs,
    current.protein,
    current.fat,
    current.carbs
  )

  const scaleY = (val: number) => ((height - 2 * padding) * val) / maxValue

  const bars = [
    {
      label: '蛋白质',
      currentVal: current.protein,
      targetVal: target.protein,
      color: '#4CAF50',
      x: padding,
    },
    {
      label: '脂肪',
      currentVal: current.fat,
      targetVal: target.fat,
      color: '#FFC107',
      x: padding + barWidth + 20,
    },
    {
      label: '碳水',
      currentVal: current.carbs,
      targetVal: target.carbs,
      color: '#2196F3',
      x: padding + 2 * barWidth + 40,
    },
  ]

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        {bars.map((bar) => {
          const currentHeight = scaleY(bar.currentVal)
          const targetHeight = scaleY(bar.targetVal)
          const currentY = height - padding - currentHeight
          const targetY = height - padding - targetHeight

          return (
            <React.Fragment key={bar.label}>
              {/* 目标值（浅色背景） */}
              <Rect
                x={bar.x}
                y={targetY}
                width={barWidth}
                height={targetHeight}
                fill={bar.color}
                opacity={0.3}
              />
              {/* 当前值（实色） */}
              <Rect
                x={bar.x}
                y={currentY}
                width={barWidth}
                height={currentHeight}
                fill={bar.color}
              />
              {/* 当前值标签 */}
              <SvgText
                x={bar.x + barWidth / 2}
                y={currentY - 10}
                fontSize="14"
                fontWeight="600"
                fill={bar.color}
                textAnchor="middle"
              >
                {Math.round(bar.currentVal)}g
              </SvgText>
              {/* 目标值标签 */}
              <SvgText
                x={bar.x + barWidth / 2}
                y={targetY - 10}
                fontSize="12"
                fill="#999"
                textAnchor="middle"
              >
                目标 {Math.round(bar.targetVal)}g
              </SvgText>
            </React.Fragment>
          )
        })}
      </Svg>

      {/* X轴标签 */}
      <View style={styles.labels}>
        {bars.map((bar) => (
          <Text key={bar.label} style={styles.label}>
            {bar.label}
          </Text>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 40,
    marginTop: 8,
  },
  label: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
})
