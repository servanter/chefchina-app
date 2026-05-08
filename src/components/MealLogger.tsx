import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import Toast from 'react-native-toast-message'
import { healthAPI, recipeAPI } from '@/lib/api'

interface MealLoggerProps {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}

interface Recipe {
  id: number
  title: string
  calories?: number
  protein?: number
}

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
type Servings = 0.5 | 1 | 2

const MEAL_TYPES: { value: MealType; label: string; emoji: string }[] = [
  { value: 'breakfast', label: '早餐', emoji: '🌅' },
  { value: 'lunch', label: '午餐', emoji: '🌞' },
  { value: 'dinner', label: '晚餐', emoji: '🌙' },
  { value: 'snack', label: '加餐', emoji: '🍎' },
]

const SERVINGS_OPTIONS: Servings[] = [0.5, 1, 2]

export default function MealLogger({ visible, onClose, onSuccess }: MealLoggerProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [mealType, setMealType] = useState<MealType>('lunch')
  const [servings, setServings] = useState<Servings>(1)

  useEffect(() => {
    if (visible) {
      // 自动推荐当前餐次
      const hour = new Date().getHours()
      if (hour < 10) setMealType('breakfast')
      else if (hour < 14) setMealType('lunch')
      else if (hour < 19) setMealType('dinner')
      else setMealType('snack')
    }
  }, [visible])

  useEffect(() => {
    if (searchQuery.length > 1) {
      searchRecipes()
    } else {
      setRecipes([])
    }
  }, [searchQuery])

  const searchRecipes = async () => {
    try {
      setLoading(true)
      const data = await recipeAPI.searchRecipes({ keyword: searchQuery, limit: 10 })
      setRecipes(data.recipes || [])
    } catch (error) {
      console.error('Failed to search recipes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedRecipe) {
      Toast.show({
        type: 'error',
        text1: '请选择菜谱',
      })
      return
    }

    try {
      setSubmitting(true)

      await healthAPI.logIntake({
        recipeId: selectedRecipe.id,
        mealType,
        servings,
      })

      Toast.show({
        type: 'success',
        text1: '记录成功',
      })

      onSuccess()
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: '记录失败',
        text2: error.message || '请稍后重试',
      })
    } finally {
      setSubmitting(false)
    }
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
            <Text style={styles.title}>记录摄入</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={submitting}>
              <Text
                style={[
                  styles.doneButton,
                  submitting && styles.doneButtonDisabled,
                ]}
              >
                {submitting ? '保存中...' : '完成'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* 菜谱选择 */}
            <View style={styles.section}>
              <Text style={styles.label}>选择菜谱</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="搜索菜谱名称..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              
              {loading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#FF6B35" />
                </View>
              )}

              {selectedRecipe ? (
                <View style={styles.selectedRecipe}>
                  <View style={styles.recipeInfo}>
                    <Text style={styles.recipeName}>{selectedRecipe.title}</Text>
                    <Text style={styles.recipeNutrition}>
                      {selectedRecipe.calories || 0} kcal · 蛋白质 {selectedRecipe.protein || 0}g
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedRecipe(null)}>
                    <Text style={styles.clearButton}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.recipeList}>
                  {recipes.map((recipe) => (
                    <TouchableOpacity
                      key={recipe.id}
                      style={styles.recipeItem}
                      onPress={() => {
                        setSelectedRecipe(recipe)
                        setSearchQuery('')
                      }}
                    >
                      <Text style={styles.recipeName}>{recipe.title}</Text>
                      <Text style={styles.recipeNutrition}>
                        {recipe.calories || 0} kcal
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* 餐次选择 */}
            <View style={styles.section}>
              <Text style={styles.label}>餐次</Text>
              <View style={styles.mealTypeContainer}>
                {MEAL_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.mealTypeButton,
                      mealType === type.value && styles.mealTypeButtonActive,
                    ]}
                    onPress={() => setMealType(type.value)}
                  >
                    <Text style={styles.mealTypeEmoji}>{type.emoji}</Text>
                    <Text
                      style={[
                        styles.mealTypeLabel,
                        mealType === type.value && styles.mealTypeLabelActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 份数调整 */}
            <View style={styles.section}>
              <Text style={styles.label}>份数</Text>
              <View style={styles.servingsContainer}>
                {SERVINGS_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.servingsButton,
                      servings === option && styles.servingsButtonActive,
                    ]}
                    onPress={() => setServings(option)}
                  >
                    <Text
                      style={[
                        styles.servingsText,
                        servings === option && styles.servingsTextActive,
                      ]}
                    >
                      {option}份
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 预览 */}
            {selectedRecipe && (
              <View style={styles.preview}>
                <Text style={styles.previewTitle}>本次摄入</Text>
                <View style={styles.previewStats}>
                  <View style={styles.previewStat}>
                    <Text style={styles.previewLabel}>热量</Text>
                    <Text style={styles.previewValue}>
                      {Math.round((selectedRecipe.calories || 0) * servings)} kcal
                    </Text>
                  </View>
                  <View style={styles.previewStat}>
                    <Text style={styles.previewLabel}>蛋白质</Text>
                    <Text style={styles.previewValue}>
                      {Math.round((selectedRecipe.protein || 0) * servings)}g
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
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
    height: '80%',
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
  doneButton: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '600',
  },
  doneButtonDisabled: {
    opacity: 0.5,
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
  searchInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  selectedRecipe: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF5F2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  recipeInfo: {
    flex: 1,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  recipeNutrition: {
    fontSize: 14,
    color: '#666',
  },
  clearButton: {
    fontSize: 20,
    color: '#999',
    padding: 4,
  },
  recipeList: {
    maxHeight: 200,
  },
  recipeItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  mealTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mealTypeButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  mealTypeButtonActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF5F2',
  },
  mealTypeEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  mealTypeLabel: {
    fontSize: 14,
    color: '#666',
  },
  mealTypeLabelActive: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  servingsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  servingsButton: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  servingsButtonActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF5F2',
  },
  servingsText: {
    fontSize: 16,
    color: '#666',
  },
  servingsTextActive: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  preview: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  previewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  previewStat: {
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF6B35',
  },
})
