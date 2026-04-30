import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { createRecipe, updateRecipe, fetchRecipeById, syncRecipeTags } from '@/lib/api'
import { useCategories, useTags } from '@/hooks/useRecipes'
import TagInput from '@/components/TagInput'
import Toast from 'react-native-toast-message'

interface IngredientForm {
  nameEn: string
  nameZh: string
  amount: string
  unit?: string
  isOptional: boolean
}

interface StepForm {
  stepNumber: number
  titleEn?: string
  titleZh?: string
  contentEn: string
  contentZh: string
  image?: string
  durationMin?: number
}

export default function CreateRecipePage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { data: categoriesData } = useCategories()
  const { data: tagsData } = useTags()
  const isZh = i18n.language === 'zh'

  // ─── Edit mode params ───────────────────────────────────────────
  const params = useLocalSearchParams<{ recipeId?: string; mode?: string }>()
  const isEditMode = params.mode === 'edit' && !!params.recipeId
  const recipeId = params.recipeId ?? ''

  const [titleEn, setTitleEn] = useState('')
  const [titleZh, setTitleZh] = useState('')
  const [descriptionEn, setDescriptionEn] = useState('')
  const [descriptionZh, setDescriptionZh] = useState('')
  const [coverImage, setCoverImage] = useState<string>('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM')
  const [prepTime, setPrepTime] = useState('')
  const [cookTimeMin, setCookTimeMin] = useState('')
  const [servings, setServings] = useState('')
  const [calories, setCalories] = useState('')
  // 营养成分
  const [protein, setProtein] = useState('')
  const [fat, setFat] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fiber, setFiber] = useState('')
  const [sodium, setSodium] = useState('')
  const [sugar, setSugar] = useState('')

  const [ingredients, setIngredients] = useState<IngredientForm[]>([
    { nameEn: '', nameZh: '', amount: '', unit: '', isOptional: false },
  ])
  const [steps, setSteps] = useState<StepForm[]>([
    { stepNumber: 1, contentEn: '', contentZh: '', titleEn: '', titleZh: '' },
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [originalUpdatedAt, setOriginalUpdatedAt] = useState<string | undefined>()

  // ─── Pre-fill fields in edit mode ───────────────────────────────
  useEffect(() => {
    if (!isEditMode) return

    let cancelled = false
    const load = async () => {
      setIsLoadingRecipe(true)
      try {
        const r = await fetchRecipeById(recipeId)
        if (cancelled) return

        setTitleEn(r.title ?? '')
        setTitleZh(r.title_zh ?? '')
        setDescriptionEn(r.description ?? '')
        setDescriptionZh(r.description_zh ?? '')
        setCoverImage(r.cover_image ?? '')
        setCategoryId(r.category_slug ?? '')
        if (r.difficulty) {
          setDifficulty(r.difficulty.toUpperCase() as 'EASY' | 'MEDIUM' | 'HARD')
        }
        if (r.prep_time) setPrepTime(String(r.prep_time))
        if (r.cook_time) setCookTimeMin(String(r.cook_time))
        if (r.servings) setServings(String(r.servings))
        if (r.calories) setCalories(String(r.calories))
        if (r.protein) setProtein(String(r.protein))
        if (r.fat) setFat(String(r.fat))
        if (r.carbs) setCarbs(String(r.carbs))
        if (r.fiber) setFiber(String(r.fiber))
        if (r.sodium) setSodium(String(r.sodium))
        if (r.sugar) setSugar(String(r.sugar))

        setOriginalUpdatedAt(r.updated_at)

        // Backfill tags in edit mode
        if (r.tags && r.tags.length > 0) {
          setSelectedTags(
            r.tags.map((t) => (i18n.language === 'zh' ? t.label_zh || t.label : t.label))
          )
        }

        if (r.ingredients && r.ingredients.length > 0) {
          setIngredients(
            r.ingredients.map((ing) => ({
              nameEn: ing.name,
              nameZh: ing.name_zh,
              amount: ing.amount,
              unit: ing.unit ?? '',
              isOptional: false,
            }))
          )
        }

        if (r.steps && r.steps.length > 0) {
          setSteps(
            r.steps.map((s) => ({
              stepNumber: s.order,
              titleEn: '',
              titleZh: '',
              contentEn: s.description,
              contentZh: s.description_zh,
              image: s.image,
              durationMin: s.duration_min,
            }))
          )
        }

        // Need to resolve categoryId from slug — fetch categories to map
        // We'll do a secondary pass once categoriesData is available
      } catch (error) {
        console.error('Failed to load recipe for editing:', error)
        Toast.show({
          type: 'error',
          text1: t('recipe_create.load_failed'),
        })
      } finally {
        if (!cancelled) setIsLoadingRecipe(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [isEditMode, recipeId])

  // ─── Resolve categoryId from slug once categories load ──────────
  useEffect(() => {
    if (!isEditMode || !categoriesData) return
    // If categoryId is currently a slug, find the matching category id
    const matchBySlug = categoriesData.find((c) => c.slug === categoryId)
    if (matchBySlug && matchBySlug.id !== 'all') {
      setCategoryId(matchBySlug.id)
    }
  }, [categoriesData, categoryId, isEditMode])

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(t('recipe_create.permission_denied'), t('recipe_create.need_photo_permission'))
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    })

    if (!result.canceled && result.assets[0]) {
      setCoverImage(result.assets[0].uri)
    }
  }

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { nameEn: '', nameZh: '', amount: '', unit: '', isOptional: false },
    ])
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, field: keyof IngredientForm, value: any) => {
    const updated = [...ingredients]
    updated[index] = { ...updated[index], [field]: value }
    setIngredients(updated)
  }

  const addStep = () => {
    setSteps([
      ...steps,
      {
        stepNumber: steps.length + 1,
        contentEn: '',
        contentZh: '',
        titleEn: '',
        titleZh: '',
      },
    ])
  }

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepNumber: i + 1 })))
  }

  const updateStep = (index: number, field: keyof StepForm, value: any) => {
    const updated = [...steps]
    updated[index] = { ...updated[index], [field]: value }
    setSteps(updated)
  }

  const validateForm = (): boolean => {
    if (!titleEn.trim() || !titleZh.trim()) {
      Toast.show({
        type: 'error',
        text1: t('recipe_create.validation_error'),
        text2: t('recipe_create.title_required'),
      })
      return false
    }

    if (!categoryId || categoryId === 'all') {
      Toast.show({
        type: 'error',
        text1: t('recipe_create.validation_error'),
        text2: t('recipe_create.category_required'),
      })
      return false
    }

    const validIngredients = ingredients.filter(
      (ing) => ing.nameEn.trim() && ing.nameZh.trim() && ing.amount.trim()
    )
    if (validIngredients.length === 0) {
      Toast.show({
        type: 'error',
        text1: t('recipe_create.validation_error'),
        text2: t('recipe_create.ingredients_required'),
      })
      return false
    }

    const validSteps = steps.filter((step) => step.contentEn.trim() && step.contentZh.trim())
    if (validSteps.length === 0) {
      Toast.show({
        type: 'error',
        text1: t('recipe_create.validation_error'),
        text2: t('recipe_create.steps_required'),
      })
      return false
    }

    return true
  }

  const buildPayload = (publish: boolean) => {
    const validIngredients = ingredients.filter(
      (ing) => ing.nameEn.trim() && ing.nameZh.trim() && ing.amount.trim()
    )
    const validSteps = steps.filter((step) => step.contentEn.trim() && step.contentZh.trim())

    return {
      titleEn,
      titleZh,
      descriptionEn: descriptionEn.trim() || undefined,
      descriptionZh: descriptionZh.trim() || undefined,
      coverImage: coverImage || undefined,
      categoryId,
      difficulty,
      prepTime: prepTime ? parseInt(prepTime) : undefined,
      cookTime: cookTimeMin ? parseInt(cookTimeMin) : undefined,
      cookTimeMin: cookTimeMin ? parseInt(cookTimeMin) : undefined,
      servings: servings ? parseInt(servings) : undefined,
      calories: calories ? parseInt(calories) : undefined,
      protein: protein ? parseFloat(protein) : undefined,
      fat: fat ? parseFloat(fat) : undefined,
      carbs: carbs ? parseFloat(carbs) : undefined,
      fiber: fiber ? parseFloat(fiber) : undefined,
      sodium: sodium ? parseFloat(sodium) : undefined,
      sugar: sugar ? parseFloat(sugar) : undefined,
      isPublished: publish,
      ingredients: validIngredients,
      steps: validSteps.map((s, i) => ({ ...s, stepNumber: i + 1 })),
      updatedAt: originalUpdatedAt,
    }
  }

  const handleSubmit = async (publish = false) => {
    if (!userId) {
      Toast.show({
        type: 'error',
        text1: t('recipe_create.login_required'),
        text2: t('recipe_create.please_login'),
      })
      return
    }

    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const payload = buildPayload(publish)

      if (isEditMode) {
        await updateRecipe(recipeId, payload)
        await syncRecipeTags(recipeId, selectedTags)
        Toast.show({
          type: 'success',
          text1: publish ? t('recipe_create.publish_success') : t('recipe_create.draft_saved'),
        })
      } else {
        const createdRecipe = await createRecipe(payload)
        await syncRecipeTags(createdRecipe.id, selectedTags)
        Toast.show({
          type: 'success',
          text1: t('recipe_create.success'),
          text2: t('recipe_create.under_review'),
        })
      }

      router.back()
    } catch (error) {
      console.error('Save recipe error:', error)
      Toast.show({
        type: 'error',
        text1: isEditMode ? t('recipe_create.update_failed') : t('recipe_create.failed'),
        text2: t('recipe_create.try_again'),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const categories = (categoriesData ?? []).filter((c) => c.id !== 'all')

  if (isLoadingRecipe) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditMode ? t('recipe_create.edit_title') : t('recipe_create.title')}
        </Text>
        <View style={styles.headerActions}>
          {isEditMode && (
            <TouchableOpacity
              onPress={() => handleSubmit(false)}
              disabled={isSubmitting}
              style={[styles.draftButton, isSubmitting && styles.submitButtonDisabled]}
            >
              <Text style={styles.draftButtonText}>
                {t('recipe_create.save_draft')}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => handleSubmit(isEditMode ? true : false)}
            disabled={isSubmitting}
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting
                ? t('recipe_create.submitting')
                : isEditMode
                  ? t('recipe_create.publish_now')
                  : t('recipe_create.submit')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* 封面图片 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('recipe_create.cover_image')}</Text>
          <TouchableOpacity onPress={pickImage} style={styles.imagePickerButton}>
            {coverImage ? (
              <Image source={{ uri: coverImage }} style={styles.coverImagePreview} />
            ) : (
              <>
                <Ionicons name="camera" size={40} color="#666" />
                <Text style={styles.imagePickerText}>{t('recipe_create.add_photo')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* 标题 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('recipe_create.recipe_title')} *
          </Text>
          <TextInput
            style={styles.input}
            placeholder={t('recipe_create.title_en_placeholder')}
            value={titleEn}
            onChangeText={setTitleEn}
          />
          <TextInput
            style={[styles.input, styles.inputMarginTop]}
            placeholder={t('recipe_create.title_zh_placeholder')}
            value={titleZh}
            onChangeText={setTitleZh}
          />
        </View>

        {/* 描述 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('recipe_create.description')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('recipe_create.description_en_placeholder')}
            value={descriptionEn}
            onChangeText={setDescriptionEn}
            multiline
            numberOfLines={3}
          />
          <TextInput
            style={[styles.input, styles.textArea, styles.inputMarginTop]}
            placeholder={t('recipe_create.description_zh_placeholder')}
            value={descriptionZh}
            onChangeText={setDescriptionZh}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* 分类 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('recipe_create.category')} *
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setCategoryId(cat.id)}
                style={[
                  styles.categoryChip,
                  categoryId === cat.id && styles.categoryChipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    categoryId === cat.id && styles.categoryChipTextSelected,
                  ]}
                >
                  {isZh ? cat.label_zh : cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 标签 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('recipe_create.tags')}</Text>
          <TagInput
            value={selectedTags}
            onChange={setSelectedTags}
            suggestions={tagsData ?? []}
            maxTags={10}
            placeholder={t('recipe_create.tags_placeholder')}
          />
        </View>

        {/* 基本信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('recipe_create.basic_info')}</Text>
          <View style={styles.rowInputs}>
            <View style={styles.rowInputWrapper}>
              <Text style={styles.inputLabel}>{t('recipe_create.difficulty')}</Text>
              <View style={styles.difficultyButtons}>
                {(['EASY', 'MEDIUM', 'HARD'] as const).map((level) => (
                  <TouchableOpacity
                    key={level}
                    onPress={() => setDifficulty(level)}
                    style={[
                      styles.difficultyButton,
                      difficulty === level && styles.difficultyButtonSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.difficultyButtonText,
                        difficulty === level && styles.difficultyButtonTextSelected,
                      ]}
                    >
                      {t(`recipe_create.difficulty_${level.toLowerCase()}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          <View style={styles.rowInputs}>
            <View style={styles.rowInputWrapper}>
              <Text style={styles.inputLabel}>{t('recipe_create.prep_time')}</Text>
              <TextInput
                style={[styles.input, styles.compactInput]}
                placeholder="15"
                value={prepTime}
                onChangeText={setPrepTime}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.rowInputWrapper}>
              <Text style={styles.inputLabel}>{t('recipe_create.cook_time')}</Text>
              <TextInput
                style={[styles.input, styles.compactInput]}
                placeholder="30"
                value={cookTimeMin}
                onChangeText={setCookTimeMin}
                keyboardType="number-pad"
              />
            </View>
          </View>
          <View style={styles.rowInputs}>
            <View style={styles.rowInputWrapper}>
              <Text style={styles.inputLabel}>{t('recipe_create.servings')}</Text>
              <TextInput
                style={[styles.input, styles.compactInput]}
                placeholder="4"
                value={servings}
                onChangeText={setServings}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.rowInputWrapper}>
              <Text style={styles.inputLabel}>{t('recipe_create.calories')}</Text>
              <TextInput
                style={[styles.input, styles.compactInput]}
                placeholder="350"
                value={calories}
                onChangeText={setCalories}
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>

        {/* 营养成分 (需求 3 补全) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('recipe_create.nutrition')}</Text>
          <View style={styles.rowInputs}>
            <View style={styles.rowInputWrapper}>
              <Text style={styles.inputLabel}>{t('recipe_create.protein')}</Text>
              <TextInput
                style={styles.smallInput}
                placeholder="0"
                value={protein}
                onChangeText={setProtein}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.rowInputWrapper}>
              <Text style={styles.inputLabel}>{t('recipe_create.fat')}</Text>
              <TextInput
                style={styles.smallInput}
                placeholder="0"
                value={fat}
                onChangeText={setFat}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.rowInputWrapper}>
              <Text style={styles.inputLabel}>{t('recipe_create.carbs')}</Text>
              <TextInput
                style={styles.smallInput}
                placeholder="0"
                value={carbs}
                onChangeText={setCarbs}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <View style={styles.rowInputs}>
            <View style={styles.rowInputWrapper}>
              <Text style={styles.inputLabel}>{t('recipe_create.fiber_label')}</Text>
              <TextInput
                style={styles.smallInput}
                placeholder="0"
                value={fiber}
                onChangeText={setFiber}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.rowInputWrapper}>
              <Text style={styles.inputLabel}>{t('recipe_create.sodium_label')}</Text>
              <TextInput
                style={styles.smallInput}
                placeholder="0"
                value={sodium}
                onChangeText={setSodium}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.rowInputWrapper}>
              <Text style={styles.inputLabel}>{t('recipe_create.sugar_label')}</Text>
              <TextInput
                style={styles.smallInput}
                placeholder="0"
                value={sugar}
                onChangeText={setSugar}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        {/* 食材列表 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t('recipe_create.ingredients')} *
            </Text>
            <TouchableOpacity onPress={addIngredient} style={styles.addButton}>
              <Ionicons name="add-circle" size={24} color="#FF6B35" />
            </TouchableOpacity>
          </View>
          {ingredients.map((ing, index) => (
            <View key={index} style={styles.ingredientRow}>
              <View style={styles.ingredientInputs}>
                <TextInput
                  style={[styles.input, styles.ingredientInput]}
                  placeholder={t('recipe_create.ingredient_name_en')}
                  value={ing.nameEn}
                  onChangeText={(text) => updateIngredient(index, 'nameEn', text)}
                />
                <TextInput
                  style={[styles.input, styles.ingredientInput]}
                  placeholder={t('recipe_create.ingredient_name_zh')}
                  value={ing.nameZh}
                  onChangeText={(text) => updateIngredient(index, 'nameZh', text)}
                />
                <TextInput
                  style={[styles.input, styles.smallInput]}
                  placeholder={t('recipe_create.amount')}
                  value={ing.amount}
                  onChangeText={(text) => updateIngredient(index, 'amount', text)}
                />
                <TextInput
                  style={[styles.input, styles.smallInput]}
                  placeholder={t('recipe_create.unit')}
                  value={ing.unit}
                  onChangeText={(text) => updateIngredient(index, 'unit', text)}
                />
              </View>
              {ingredients.length > 1 && (
                <TouchableOpacity
                  onPress={() => removeIngredient(index)}
                  style={styles.removeButton}
                >
                  <Ionicons name="close-circle" size={24} color="#FF4444" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* 步骤列表 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t('recipe_create.steps')} *
            </Text>
            <TouchableOpacity onPress={addStep} style={styles.addButton}>
              <Ionicons name="add-circle" size={24} color="#FF6B35" />
            </TouchableOpacity>
          </View>
          {steps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepNumber}>
                  {t('recipe_create.step_number', { number: step.stepNumber })}
                </Text>
                {steps.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeStep(index)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF4444" />
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t('recipe_create.step_content_en')}
                value={step.contentEn}
                onChangeText={(text) => updateStep(index, 'contentEn', text)}
                multiline
                numberOfLines={4}
              />
              <TextInput
                style={[styles.input, styles.textArea, styles.inputMarginTop]}
                placeholder={t('recipe_create.step_content_zh')}
                value={step.contentZh}
                onChangeText={(text) => updateStep(index, 'contentZh', text)}
                multiline
                numberOfLines={4}
              />
            </View>
          ))}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  submitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
  },
  draftButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  draftButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButtonDisabled: {
    backgroundColor: '#CCC',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#F9F9F9',
  },
  inputMarginTop: {
    marginTop: 8,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  imagePickerButton: {
    height: 200,
    borderWidth: 2,
    borderColor: '#DDD',
    borderRadius: 12,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  coverImagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  imagePickerText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  categoryScroll: {
    marginTop: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#FFF',
  },
  categoryChipSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
  },
  categoryChipTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rowInputWrapper: {
    flex: 1,
    marginHorizontal: 4,
  },
  inputLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  smallInput: {
    flex: 1,
  },
  compactInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  difficultyButtons: {
    flexDirection: 'row',
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    marginHorizontal: 2,
    borderRadius: 8,
    alignItems: 'center',
  },
  difficultyButtonSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  difficultyButtonText: {
    fontSize: 12,
    color: '#666',
  },
  difficultyButtonTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  addButton: {
    padding: 4,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ingredientInputs: {
    flex: 1,
  },
  ingredientInput: {
    marginBottom: 4,
  },
  removeButton: {
    marginLeft: 8,
    padding: 4,
  },
  stepRow: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  bottomPadding: {
    height: 40,
  },
})
