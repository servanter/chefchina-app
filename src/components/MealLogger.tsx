import React, { useState, useEffect, useRef } from 'react'
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
  id: string  // recipe id 是 string（rec_xxx），不要转 Number
  title: string
  titleEn?: string
  titleZh?: string
  calories?: number
  protein?: number
  fat?: number
  carbs?: number
  coverImage?: string
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
  // 控制下拉浮层是否显示
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    if (visible) {
      const hour = new Date().getHours()
      if (hour < 10) setMealType('breakfast')
      else if (hour < 14) setMealType('lunch')
      else if (hour < 19) setMealType('dinner')
      else setMealType('snack')
      // 打开时重置
      setSearchQuery('')
      setRecipes([])
      setSelectedRecipe(null)
      setShowDropdown(false)
    }
  }, [visible])

  useEffect(() => {
    if (searchQuery.length >= 1) {
      searchRecipes()
    } else {
      setRecipes([])
      setShowDropdown(false)
    }
  }, [searchQuery])

  const searchRecipes = async () => {
    try {
      setLoading(true)
      const data = await recipeAPI.searchRecipes({ keyword: searchQuery, limit: 10 })
      setRecipes(data.recipes as Recipe[] || [])
      setShowDropdown(true)
    } catch (error) {
      console.error('Failed to search recipes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedRecipe) {
      Toast.show({ type: 'error', text1: t('health.pleaseSelectRecipe', { defaultValue: '请选择菜谱' }) })
      return
    }

    try {
      setSubmitting(true)

      // ✅ 直接传 string id，不做 Number() 转换（后端接受 string）
      await healthAPI.logIntake({
        recipeId: selectedRecipe.id as unknown as number, // api.ts 类型是 number 但后端转 toString()
        mealType,
        servings,
      })

      Toast.show({ type: 'success', text1: t('health.logSuccess', { defaultValue: '记录成功' }) })
      onSuccess()
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: t('health.logFailed', { defaultValue: '记录失败' }),
        text2: error.message || t('common.tryAgain', { defaultValue: '请稍后重试' }),
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSelectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe)
    setSearchQuery('')
    setRecipes([])
    setShowDropdown(false)
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
              <Text style={styles.cancelButton}>{t('common.cancel', { defaultValue: '取消' })}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{t('health.logMeal', { defaultValue: '记录摄入' })}</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={submitting}>
              <Text style={[styles.doneButton, submitting && styles.doneButtonDisabled]}>
                {submitting
                  ? t('common.saving', { defaultValue: '保存中...' })
                  : t('common.done', { defaultValue: '完成' })}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {/* 菜谱选择 */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('health.selectRecipe', { defaultValue: '选择菜谱' })}</Text>

              {/* 搜索输入框 + 下拉浮层 */}
              <View style={styles.searchWrapper}>
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('health.searchRecipePlaceholder', { defaultValue: '搜索菜谱名称...' })}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onFocus={() => {
                    if (recipes.length > 0) setShowDropdown(true)
                  }}
                />

                {loading && (
                  <View style={styles.loadingInline}>
                    <ActivityIndicator size="small" color="#FF6B35" />
                  </View>
                )}

                {/* ✅ 绝对定位浮层，覆盖在下方内容之上 */}
                {showDropdown && recipes.length > 0 && (
                  <View style={styles.dropdown}>
                    <ScrollView
                      style={styles.dropdownScroll}
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled
                    >
                      {recipes.map((recipe) => (
                        <TouchableOpacity
                          key={recipe.id}
                          style={styles.dropdownItem}
                          onPress={() => handleSelectRecipe(recipe)}
                        >
                          <Text style={styles.dropdownItemName}>{recipe.title}</Text>
                          <Text style={styles.dropdownItemCal}>
                            {recipe.calories || 0} kcal
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* 已选中的菜谱 */}
              {selectedRecipe && (
                <View style={styles.selectedRecipe}>
                  <View style={styles.recipeInfo}>
                    <Text style={styles.recipeName}>{selectedRecipe.title}</Text>
                    <Text style={styles.recipeNutrition}>
                      {selectedRecipe.calories || 0} kcal · {t('health.protein', { defaultValue: '蛋白质' })} {selectedRecipe.protein || 0}g
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedRecipe(null)}>
                    <Text style={styles.clearButton}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 餐次选择 */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('health.mealType', { defaultValue: '餐次' })}</Text>
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
              <Text style={styles.label}>{t('health.servings', { defaultValue: '份数' })}</Text>
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
                      {option}{t('common.servings', { defaultValue: '份' })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 预览 */}
            {selectedRecipe && (
              <View style={styles.preview}>
                <Text style={styles.previewTitle}>{t('health.thisIntake', { defaultValue: '本次摄入' })}</Text>
                <View style={styles.previewStats}>
                  <View style={styles.previewStat}>
                    <Text style={styles.previewLabel}>{t('health.calories', { defaultValue: '热量' })}</Text>
                    <Text style={styles.previewValue}>
                      {Math.round((selectedRecipe.calories || 0) * servings)} kcal
                    </Text>
                  </View>
                  <View style={styles.previewStat}>
                    <Text style={styles.previewLabel}>{t('health.protein', { defaultValue: '蛋白质' })}</Text>
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
  // ✅ 搜索框容器，relative 定位，让下拉浮层相对于它定位
  searchWrapper: {
    position: 'relative',
    zIndex: 100,
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  loadingInline: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  // ✅ 绝对定位下拉浮层
  dropdown: {
    position: 'absolute',
    top: 52, // searchInput height ≈ 48 + gap
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 999,
  },
  dropdownScroll: {
    maxHeight: 220,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  dropdownItemName: {
    fontSize: 15,
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  dropdownItemCal: {
    fontSize: 13,
    color: '#FF6B35',
    fontWeight: '500',
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
    marginTop: 12,
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
