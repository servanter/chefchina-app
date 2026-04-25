import React, { useState } from 'react'
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
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { createRecipe } from '@/lib/api'
import { useCategories } from '@/hooks/useRecipes'
import Toast from 'react-native-toast-message'

interface Ingredient {
  nameEn: string
  nameZh: string
  amount: string
  unit?: string
  isOptional: boolean
}

interface Step {
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
  const isZh = i18n.language === 'zh'

  const [titleEn, setTitleEn] = useState('')
  const [titleZh, setTitleZh] = useState('')
  const [descriptionEn, setDescriptionEn] = useState('')
  const [descriptionZh, setDescriptionZh] = useState('')
  const [coverImage, setCoverImage] = useState<string>('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM')
  const [cookTimeMin, setCookTimeMin] = useState('')
  const [servings, setServings] = useState('')
  const [calories, setCalories] = useState('')
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { nameEn: '', nameZh: '', amount: '', unit: '', isOptional: false },
  ])
  const [steps, setSteps] = useState<Step[]>([
    { stepNumber: 1, contentEn: '', contentZh: '', titleEn: '', titleZh: '' },
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      // TODO: 上传到 Cloudinary / Supabase Storage
      // 目前暂时使用本地 URI（生产环境需要真实上传）
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

  const updateIngredient = (index: number, field: keyof Ingredient, value: any) => {
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

  const updateStep = (index: number, field: keyof Step, value: any) => {
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

    if (!categoryId) {
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

  const handleSubmit = async () => {
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
      const validIngredients = ingredients.filter(
        (ing) => ing.nameEn.trim() && ing.nameZh.trim() && ing.amount.trim()
      )
      const validSteps = steps.filter((step) => step.contentEn.trim() && step.contentZh.trim())

      await createRecipe({
        titleEn,
        titleZh,
        descriptionEn: descriptionEn.trim() || undefined,
        descriptionZh: descriptionZh.trim() || undefined,
        coverImage: coverImage || undefined,
        categoryId,
        difficulty,
        cookTimeMin: cookTimeMin ? parseInt(cookTimeMin) : undefined,
        servings: servings ? parseInt(servings) : undefined,
        calories: calories ? parseInt(calories) : undefined,
        isPublished: false, // 默认为草稿，等待审核
        ingredients: validIngredients,
        steps: validSteps,
      })

      Toast.show({
        type: 'success',
        text1: t('recipe_create.success'),
        text2: t('recipe_create.under_review'),
      })

      router.back()
    } catch (error) {
      console.error('Create recipe error:', error)
      Toast.show({
        type: 'error',
        text1: t('recipe_create.failed'),
        text2: t('recipe_create.try_again'),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const categories = categoriesData ?? []

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('recipe_create.title')}</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? t('recipe_create.submitting') : t('recipe_create.submit')}
          </Text>
        </TouchableOpacity>
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
              <Text style={styles.inputLabel}>{t('recipe_create.cook_time')}</Text>
              <TextInput
                style={styles.smallInput}
                placeholder="30"
                value={cookTimeMin}
                onChangeText={setCookTimeMin}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.rowInputWrapper}>
              <Text style={styles.inputLabel}>{t('recipe_create.servings')}</Text>
              <TextInput
                style={styles.smallInput}
                placeholder="4"
                value={servings}
                onChangeText={setServings}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.rowInputWrapper}>
              <Text style={styles.inputLabel}>{t('recipe_create.calories')}</Text>
              <TextInput
                style={styles.smallInput}
                placeholder="350"
                value={calories}
                onChangeText={setCalories}
                keyboardType="number-pad"
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
  },
  submitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
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
