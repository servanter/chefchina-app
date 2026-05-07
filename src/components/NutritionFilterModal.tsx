import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Switch,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Slider from '@react-native-community/slider'

export interface NutritionFilters {
  caloriesMin?: number
  caloriesMax?: number
  proteinMin?: number
  lowSodium: boolean
  lowSugar: boolean
}

interface NutritionFilterModalProps {
  visible: boolean
  filters: NutritionFilters
  onClose: () => void
  onApply: (filters: NutritionFilters) => void
}

export default function NutritionFilterModal({
  visible,
  filters,
  onClose,
  onApply,
}: NutritionFilterModalProps) {
  const [localFilters, setLocalFilters] = useState<NutritionFilters>(filters)

  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const handleApply = () => {
    onApply(localFilters)
    onClose()
  }

  const handleReset = () => {
    const resetFilters: NutritionFilters = {
      caloriesMin: undefined,
      caloriesMax: undefined,
      proteinMin: undefined,
      lowSodium: false,
      lowSugar: false,
    }
    setLocalFilters(resetFilters)
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* 标题栏 */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelButton}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.title}>营养筛选</Text>
            <TouchableOpacity onPress={handleReset}>
              <Text style={styles.resetButton}>重置</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* 热量范围 */}
            <View style={styles.section}>
              <Text style={styles.label}>热量范围</Text>
              <View style={styles.rangeContainer}>
                <View style={styles.rangeItem}>
                  <Text style={styles.rangeLabel}>最低</Text>
                  <View style={styles.sliderContainer}>
                    <Slider
                      style={styles.slider}
                      minimumValue={0}
                      maximumValue={1000}
                      step={50}
                      value={localFilters.caloriesMin || 0}
                      onValueChange={(val) =>
                        setLocalFilters({ ...localFilters, caloriesMin: val })
                      }
                      minimumTrackTintColor="#FF6B35"
                      maximumTrackTintColor="#E0E0E0"
                      thumbTintColor="#FF6B35"
                    />
                    <Text style={styles.valueText}>
                      {localFilters.caloriesMin || 0} kcal
                    </Text>
                  </View>
                </View>

                <View style={styles.rangeItem}>
                  <Text style={styles.rangeLabel}>最高</Text>
                  <View style={styles.sliderContainer}>
                    <Slider
                      style={styles.slider}
                      minimumValue={0}
                      maximumValue={1000}
                      step={50}
                      value={localFilters.caloriesMax || 1000}
                      onValueChange={(val) =>
                        setLocalFilters({ ...localFilters, caloriesMax: val })
                      }
                      minimumTrackTintColor="#FF6B35"
                      maximumTrackTintColor="#E0E0E0"
                      thumbTintColor="#FF6B35"
                    />
                    <Text style={styles.valueText}>
                      {localFilters.caloriesMax || 1000} kcal
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 蛋白质最低 */}
            <View style={styles.section}>
              <Text style={styles.label}>蛋白质最低</Text>
              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={50}
                  step={5}
                  value={localFilters.proteinMin || 0}
                  onValueChange={(val) =>
                    setLocalFilters({ ...localFilters, proteinMin: val })
                  }
                  minimumTrackTintColor="#4CAF50"
                  maximumTrackTintColor="#E0E0E0"
                  thumbTintColor="#4CAF50"
                />
                <Text style={styles.valueText}>
                  {localFilters.proteinMin || 0}g
                </Text>
              </View>
            </View>

            {/* 开关选项 */}
            <View style={styles.section}>
              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Text style={styles.label}>低钠</Text>
                  <Text style={styles.hint}>每份 &lt; 140mg</Text>
                </View>
                <Switch
                  value={localFilters.lowSodium}
                  onValueChange={(val) =>
                    setLocalFilters({ ...localFilters, lowSodium: val })
                  }
                  trackColor={{ false: '#E0E0E0', true: '#FFB3A0' }}
                  thumbColor={localFilters.lowSodium ? '#FF6B35' : '#F4F3F4'}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Text style={styles.label}>低糖</Text>
                  <Text style={styles.hint}>每份 &lt; 5g</Text>
                </View>
                <Switch
                  value={localFilters.lowSugar}
                  onValueChange={(val) =>
                    setLocalFilters({ ...localFilters, lowSugar: val })
                  }
                  trackColor={{ false: '#E0E0E0', true: '#FFB3A0' }}
                  thumbColor={localFilters.lowSugar ? '#FF6B35' : '#F4F3F4'}
                />
              </View>
            </View>
          </ScrollView>

          {/* 应用按钮 */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>应用筛选</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  resetButton: {
    fontSize: 16,
    color: '#FF6B35',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  rangeContainer: {
    gap: 16,
  },
  rangeItem: {
    gap: 8,
  },
  rangeLabel: {
    fontSize: 14,
    color: '#666',
  },
  sliderContainer: {
    gap: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  valueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  switchLabel: {
    flex: 1,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  applyButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
})
