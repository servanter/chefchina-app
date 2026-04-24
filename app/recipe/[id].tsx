import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  useWindowDimensions,
  Animated,
  Platform,
  KeyboardAvoidingView,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRecipeById, useInfiniteComments, useToggleLike, useToggleFavorite, usePostComment } from '../../src/hooks/useRecipes';
import { StepItem } from '../../src/components/StepItem';
import { CommentItem } from '../../src/components/CommentItem';
import { RatingStars } from '../../src/components/RatingStars';
import { EmptyState } from '../../src/components/EmptyState';
import { LazyImage } from '../../src/components/LazyImage';
import { ImageViewer } from '../../src/components/ImageViewer';
import { RecipeCard } from '../../src/components/RecipeCard';
import {
  CommentSkeleton,
  RecipeDetailSkeleton,
} from '../../src/components/Skeleton';
import { ListFooter } from '../../src/components/ListFooter';
import { ShareCard, SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH } from '../../src/components/ShareCard';
import { useShareRecipe } from '../../src/hooks/useShareRecipe';
import { getUserId, getUserName, saveViewHistoryItem } from '../../src/lib/storage';
import { fetchLikeStatus, fetchFavoriteStatus, fetchRelated, Comment } from '../../src/lib/api';

const HERO_HEIGHT = 280;

// 需求 11：Hero 封面在 cover_image 缺失时也要能点开查看器。统一兜底 URL
// 避免条件分支下 onPress 变成 no-op。
const DEFAULT_COVER_FALLBACK =
  'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=80';

const COLORS = {
  primary: '#E85D26',
  background: '#FFFDF9',
  text: '#1A1A1A',
  textSecondary: '#666',
  cardBg: '#FFFFFF',
  border: '#F0EDE8',
};

type TabId = 'ingredients' | 'steps' | 'comments';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const effectiveWidth = Math.min(width, 390);
  const isZh = i18n.language === 'zh';

  const [activeTab, setActiveTab] = useState<TabId>('ingredients');
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [userRating, setUserRating] = useState(0);
  const [userId, setUserId] = useState('guest');
  const [userName, setUserName] = useState<string | null>(null);
  const [commentImages, setCommentImages] = useState<string[]>([]); // 评论图片
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null); // 回复对象

  // Image viewer：全屏查看器（需求 11）
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const openViewer = useCallback((images: string[], index: number) => {
    // 防重入：查看器已经打开 or 没有图，则忽略
    if (viewerVisible || !images.length) return;
    setViewerImages(images);
    setViewerIndex(index);
    setViewerVisible(true);
  }, [viewerVisible]);

  const scrollY = useRef(new Animated.Value(0)).current;
  const shareCardRef = useRef<View>(null);
  const {
    captureAndShare,
    sharing,
    shareAvailable,
    buildDeepLink,
  } = useShareRecipe();

  useEffect(() => {
    getUserId().then(async (uid) => {
      const resolvedUid = uid ?? 'guest';
      setUserId(resolvedUid);
      const name = await getUserName();
      setUserName(name);
      if (resolvedUid !== 'guest' && id) {
        try {
          const [likeStatus, favStatus] = await Promise.all([
            fetchLikeStatus(id, resolvedUid),
            fetchFavoriteStatus(id, resolvedUid),
          ]);
          setLiked(likeStatus.liked);
          setFavorited(favStatus.favorited);
        } catch {
          // non-critical
        }
      }
    });
  }, [id]);

  const { data: recipe, isLoading, error, refetch: refetchRecipe } = useRecipeById(id ?? '');

  useEffect(() => {
    if (!recipe?.id) return;
    saveViewHistoryItem(recipe.id).catch(() => {});
  }, [recipe?.id]);
  const {
    data: commentsData,
    isLoading: commentsLoading,
    refetch: refetchComments,
    fetchNextPage: fetchNextComments,
    hasNextPage: hasMoreComments,
    isFetchingNextPage: isFetchingMoreComments,
    error: commentsError,
  } = useInfiniteComments(id ?? '');
  const comments = useMemo(
    () => (commentsData?.pages ?? []).flatMap((p) => p.data),
    [commentsData],
  );
  const commentsTotal =
    commentsData?.pages?.[0]?.pagination.total ?? comments.length;
  const toggleLikeMutation = useToggleLike();
  const toggleFavoriteMutation = useToggleFavorite();
  const postCommentMutation = usePostComment();

  // 相关推荐（需求 15）
  const { data: relatedRecipes = [] } = useQuery({
    queryKey: ['recipe', id, 'related'],
    queryFn: () => fetchRelated(id ?? '', 6),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchRecipe(), refetchComments()]);
    setRefreshing(false);
  }, [refetchRecipe, refetchComments]);

  const handleLoadMoreComments = useCallback(() => {
    if (!isFetchingMoreComments && hasMoreComments) fetchNextComments();
  }, [isFetchingMoreComments, hasMoreComments, fetchNextComments]);

  const headerOpacity = scrollY.interpolate({
    inputRange: [HERO_HEIGHT - 80, HERO_HEIGHT - 40],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const handleLike = useCallback(async () => {
    if (!recipe) return;
    const nextLiked = !liked;
    setLiked(nextLiked);
    try {
      await toggleLikeMutation.mutateAsync({ recipeId: recipe.id, userId });
      Toast.show({
        type: 'success',
        text1: nextLiked ? t('recipe.likeSuccess') : t('recipe.unlikeSuccess'),
        visibilityTime: 1500,
      });
    } catch {
      setLiked((prev) => !prev); // revert
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        visibilityTime: 2000,
      });
    }
  }, [recipe, liked, userId, t, toggleLikeMutation]);

  const handleFavorite = useCallback(async () => {
    if (!recipe) return;
    const nextFavorited = !favorited;
    setFavorited(nextFavorited);
    try {
      await toggleFavoriteMutation.mutateAsync({ recipeId: recipe.id, userId });
      Toast.show({
        type: 'success',
        text1: nextFavorited ? t('recipe.favoriteSuccess') : t('recipe.unfavoriteSuccess'),
        visibilityTime: 1500,
      });
    } catch {
      setFavorited((prev) => !prev);
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        visibilityTime: 2000,
      });
    }
  }, [recipe, favorited, userId, t, toggleFavoriteMutation]);

  const handlePostComment = useCallback(async () => {
    if (!commentText.trim()) return;
    // 回复评论不需要评分
    if (!replyingTo && userRating === 0) {
      Alert.alert(t('recipe.selectRating'));
      return;
    }
    try {
      await postCommentMutation.mutateAsync({
        recipe_id: id ?? '',
        user_id: userId,
        content: commentText.trim(),
        rating: replyingTo ? undefined : userRating,
        images: commentImages.length > 0 ? commentImages : undefined,
        parent_id: replyingTo?.id,
      });
      setCommentText('');
      setUserRating(0);
      setCommentImages([]);
      setReplyingTo(null);
      Toast.show({ type: 'success', text1: t('recipe.commentPosted'), visibilityTime: 1500 });
    } catch {
      Toast.show({ type: 'error', text1: t('common.error'), visibilityTime: 2000 });
    }
  }, [commentText, userRating, commentImages, replyingTo, id, userId, t, postCommentMutation]);

  const handlePickImage = useCallback(async () => {
    if (commentImages.length >= 9) {
      Alert.alert('最多上传9张图片');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setCommentImages(prev => [...prev, base64Image]);
    }
  }, [commentImages]);

  const handleRemoveImage = useCallback((index: number) => {
    setCommentImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleReply = useCallback((comment: Comment) => {
    setReplyingTo(comment);
    setUserRating(0);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const handleShare = useCallback(async () => {
    if (!recipe) return;
    if (!shareAvailable) {
      Toast.show({
        type: 'info',
        text1: t('recipe.shareUnavailable'),
        visibilityTime: 2400,
      });
      return;
    }
    Toast.show({
      type: 'info',
      text1: t('recipe.sharing'),
      visibilityTime: 1200,
    });
    const ok = await captureAndShare({
      recipe,
      cardRef: shareCardRef,
      channel: 'other',
    });
    if (!ok) {
      Toast.show({
        type: 'error',
        text1: t('recipe.shareFailed'),
        visibilityTime: 2000,
      });
    }
  }, [recipe, shareAvailable, captureAndShare, t]);

  if (isLoading) return <RecipeDetailSkeleton />;

  if (error || !recipe) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title={t('common.error')}
        subtitle={t('common.retry')}
      />
    );
  }

  const title = isZh ? recipe.title_zh : recipe.title;
  const description = isZh ? recipe.description_zh : recipe.description;

  const TABS: { id: TabId; label: string }[] = [
    { id: 'ingredients', label: t('recipe.ingredients') },
    { id: 'steps', label: t('recipe.steps') },
    { id: 'comments', label: `${t('recipe.comments')} (${commentsTotal})` },
  ];

  const difficultyColors: Record<string, string> = {
    easy: '#4CAF50',
    medium: '#FF9800',
    hard: '#F44336',
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        {/* ── Animated transparent → opaque header ── */}
        <Animated.View
          style={[
            styles.floatingHeader,
            { paddingTop: insets.top, opacity: headerOpacity },
          ]}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.floatingTitle} numberOfLines={1}>{title}</Text>
          <View style={styles.headerActionGroup}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={handleShare}
              disabled={sharing}
              accessibilityLabel={t('recipe.shareButton')}
            >
              <Ionicons
                name="share-social-outline"
                size={20}
                color={sharing ? '#AAA' : COLORS.text}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.backBtn} onPress={handleFavorite}>
              <Ionicons
                name={favorited ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={favorited ? COLORS.primary : COLORS.text}
              />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Top-right circular actions (over hero image) ── */}
        <View style={[styles.absoluteTopRight, { top: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.backBtnCircle}
            onPress={handleShare}
            disabled={sharing}
            accessibilityLabel={t('recipe.shareButton')}
          >
            <Ionicons name="share-social-outline" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* ── Back button always visible ── */}
        <View style={[styles.absoluteBack, { top: insets.top + 8 }]}>
          <TouchableOpacity style={styles.backBtnCircle} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true, listener: (e: any) => {
              const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
              const reachedEnd =
                layoutMeasurement.height + contentOffset.y >=
                contentSize.height - contentSize.height * 0.5;
              if (activeTab === 'comments' && reachedEnd) {
                handleLoadMoreComments();
              }
            } },
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        >
          {/* ── Hero Image ── */}
          <View style={styles.heroContainer}>
            <TouchableOpacity
              activeOpacity={0.95}
              onPress={() =>
                openViewer([recipe.cover_image || DEFAULT_COVER_FALLBACK], 0)
              }
              style={styles.heroTouchable}
            >
              <LazyImage uri={recipe.cover_image} style={styles.heroImage} priority="high" />
            </TouchableOpacity>
            <View style={styles.heroGradient} />
          </View>

          {/* ── Content Card ── */}
          <View style={styles.contentCard}>
            {/* Title & meta */}
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.categoryRow}>
                  <View style={[styles.categoryBadge]}>
                    <Text style={styles.categoryText}>{recipe.category}</Text>
                  </View>
                  {recipe.difficulty && (
                    <View style={[styles.difficultyBadge, { backgroundColor: difficultyColors[recipe.difficulty] + '20' }]}>
                      <Text style={[styles.difficultyText, { color: difficultyColors[recipe.difficulty] }]}>
                        {t(`recipe.${recipe.difficulty}`)}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.recipeTitle}>{title}</Text>
              </View>
            </View>

            {/* Tag chips */}
            {recipe.tags && recipe.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {recipe.tags.map((tag) => (
                  <TouchableOpacity
                    key={tag.id}
                    style={styles.tagChip}
                    onPress={() =>
                      router.push({
                        pathname: '/(tabs)/explore',
                        params: { tagId: tag.id },
                      })
                    }
                  >
                    <Text style={styles.tagChipText}>
                      #{isZh ? tag.label_zh : tag.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* ── Meta bar（需求 15）──────────────────────
                ⏱ cookTime / 🔥 difficulty / 🍽 servings / 📊 calories
                只有有值才显示对应 icon。
            */}
            <View style={styles.metaBar}>
              {recipe.cook_time > 0 && (
                <View style={styles.metaChip}>
                  <Ionicons name="time-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.metaChipText}>
                    {recipe.cook_time} {t('recipe.mins')}
                  </Text>
                </View>
              )}
              {recipe.difficulty && (
                <View style={styles.metaChip}>
                  <Ionicons name="flame-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.metaChipText}>
                    {t(
                      recipe.difficulty === 'easy'
                        ? 'recipe.difficultyEasy'
                        : recipe.difficulty === 'medium'
                        ? 'recipe.difficultyMedium'
                        : 'recipe.difficultyHard',
                    )}
                  </Text>
                </View>
              )}
              {recipe.servings > 0 && (
                <View style={styles.metaChip}>
                  <Ionicons name="restaurant-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.metaChipText}>
                    {recipe.servings} {t('recipe.persons')}
                  </Text>
                </View>
              )}
              {typeof recipe.calories === 'number' && recipe.calories > 0 && (
                <View style={styles.metaChip}>
                  <Ionicons name="stats-chart-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.metaChipText}>
                    {recipe.calories} kcal
                  </Text>
                </View>
              )}
            </View>

            {/* Rating row */}
            <View style={styles.ratingRow}>
              <RatingStars rating={recipe.avg_rating} size={16} readonly />
              <Text style={styles.ratingValue}>{recipe.avg_rating.toFixed(1)}</Text>
              <Text style={styles.ratingCount}>
                {t('recipe.ratingLabel', { count: recipe.ratings_count })}
              </Text>
            </View>

            {/* Info chips — 全部字段都缺失时整块不渲染（BUG-04） */}
            {(recipe.cook_time > 0 ||
              recipe.prep_time > 0 ||
              recipe.servings > 0) && (
              <View style={styles.infoChips}>
                {(recipe.cook_time > 0 || recipe.prep_time > 0) && (
                  <View style={styles.infoChip}>
                    <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.infoChipValue}>{recipe.cook_time + recipe.prep_time}</Text>
                    <Text style={styles.infoChipLabel}>{t('recipe.cookTime')}</Text>
                  </View>
                )}
                {recipe.servings > 0 && (
                  <>
                    {(recipe.cook_time > 0 || recipe.prep_time > 0) && (
                      <View style={styles.infoChipDivider} />
                    )}
                    <View style={styles.infoChip}>
                      <Ionicons name="people-outline" size={16} color={COLORS.primary} />
                      <Text style={styles.infoChipValue}>{recipe.servings}</Text>
                      <Text style={styles.infoChipLabel}>{t('recipe.persons')}</Text>
                    </View>
                  </>
                )}
                {recipe.prep_time > 0 && (
                  <>
                    <View style={styles.infoChipDivider} />
                    <View style={styles.infoChip}>
                      <Ionicons name="restaurant-outline" size={16} color={COLORS.primary} />
                      <Text style={styles.infoChipValue}>{recipe.prep_time}</Text>
                      <Text style={styles.infoChipLabel}>{t('recipe.prepTime')}</Text>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Description */}
            <Text style={styles.description}>{description}</Text>

            {/* Like & Favorite actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, liked && styles.actionBtnActive]}
                onPress={handleLike}
              >
                <Ionicons
                  name={liked ? 'heart' : 'heart-outline'}
                  size={18}
                  color={liked ? '#FFF' : COLORS.primary}
                />
                <Text style={[styles.actionBtnText, liked && styles.actionBtnTextActive]}>
                  {t('recipe.likes')} · {recipe.likes_count}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, favorited && styles.actionBtnFav]}
                onPress={handleFavorite}
              >
                <Ionicons
                  name={favorited ? 'bookmark' : 'bookmark-outline'}
                  size={18}
                  color={favorited ? '#FFF' : COLORS.primary}
                />
                <Text style={[styles.actionBtnText, favorited && styles.actionBtnTextActive]}>
                  {favorited ? t('recipe.favoritedLabel') : t('recipe.favoriteLabel')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── Tabs ── */}
            <View style={styles.tabs}>
              {TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                  onPress={() => setActiveTab(tab.id)}
                >
                  <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Ingredients Tab ── */}
            {activeTab === 'ingredients' && (
              <View style={styles.tabContent}>
                {recipe.ingredients.map((ing, idx) => (
                  <View key={idx} style={styles.ingredientRow}>
                    <View style={styles.ingredientDot} />
                    <Text style={styles.ingredientName}>
                      {isZh ? ing.name_zh : ing.name}
                    </Text>
                    <Text style={styles.ingredientAmount}>{ing.amount}</Text>
                  </View>
                ))}
                
                {/* 营养成分显示 (REQ-4.4) */}
                {(recipe.protein || recipe.fat || recipe.carbs || recipe.fiber || recipe.sodium || recipe.sugar) && (
                  <View style={styles.nutritionSection}>
                    <Text style={styles.nutritionTitle}>
                      {isZh ? '营养信息' : 'Nutrition Facts'}
                    </Text>
                    <View style={styles.nutritionGrid}>
                      {recipe.protein != null && (
                        <View style={styles.nutritionItem}>
                          <Text style={styles.nutritionLabel}>
                            {isZh ? '蛋白质' : 'Protein'}
                          </Text>
                          <Text style={styles.nutritionValue}>{recipe.protein}g</Text>
                        </View>
                      )}
                      {recipe.fat != null && (
                        <View style={styles.nutritionItem}>
                          <Text style={styles.nutritionLabel}>
                            {isZh ? '脂肪' : 'Fat'}
                          </Text>
                          <Text style={styles.nutritionValue}>{recipe.fat}g</Text>
                        </View>
                      )}
                      {recipe.carbs != null && (
                        <View style={styles.nutritionItem}>
                          <Text style={styles.nutritionLabel}>
                            {isZh ? '碳水' : 'Carbs'}
                          </Text>
                          <Text style={styles.nutritionValue}>{recipe.carbs}g</Text>
                        </View>
                      )}
                      {recipe.fiber != null && (
                        <View style={styles.nutritionItem}>
                          <Text style={styles.nutritionLabel}>
                            {isZh ? '纤维' : 'Fiber'}
                          </Text>
                          <Text style={styles.nutritionValue}>{recipe.fiber}g</Text>
                        </View>
                      )}
                      {recipe.sodium != null && (
                        <View style={styles.nutritionItem}>
                          <Text style={styles.nutritionLabel}>
                            {isZh ? '钠' : 'Sodium'}
                          </Text>
                          <Text style={styles.nutritionValue}>{recipe.sodium}mg</Text>
                        </View>
                      )}
                      {recipe.sugar != null && (
                        <View style={styles.nutritionItem}>
                          <Text style={styles.nutritionLabel}>
                            {isZh ? '糖' : 'Sugar'}
                          </Text>
                          <Text style={styles.nutritionValue}>{recipe.sugar}g</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* ── Steps Tab ── */}
            {activeTab === 'steps' && (
              <View style={styles.tabContent}>
                {(() => {
                  // 把本菜谱有图片的 step 顺序整理成查看器资源
                  const stepImages = recipe.steps
                    .map((s) => s.image)
                    .filter((img): img is string => !!img);
                  return recipe.steps.map((step) => (
                    <StepItem
                      key={step.order}
                      step={step}
                      isZh={isZh}
                      onImagePress={
                        step.image
                          ? (uri) => {
                              const idx = stepImages.indexOf(uri);
                              openViewer(stepImages, Math.max(0, idx));
                            }
                          : undefined
                      }
                    />
                  ));
                })()}
              </View>
            )}

            {/* ── Comments Tab ── */}
            {activeTab === 'comments' && (
              <View style={styles.tabContent}>
                {/* Post comment */}
                <View style={styles.commentInput}>
                  {/* 回复提示 */}
                  {replyingTo && (
                    <View style={styles.replyingBox}>
                      <Text style={styles.replyingText}>
                        回复给 {replyingTo.user?.name ?? 'User'}
                      </Text>
                      <TouchableOpacity onPress={handleCancelReply}>
                        <Ionicons name="close" size={18} color="#666" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* 评分（仅在非回复时显示） */}
                  {!replyingTo && (
                    <View style={styles.commentRatingRow}>
                      <Text style={styles.commentRatingLabel}>{t('recipe.selectRating')}: </Text>
                      <RatingStars
                        rating={userRating}
                        size={22}
                        onRate={setUserRating}
                      />
                    </View>
                  )}

                  <TextInput
                    style={styles.commentTextInput}
                    placeholder={replyingTo ? '写下你的回复...' : t('recipe.writeComment')}
                    placeholderTextColor="#AAA"
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                    maxLength={500}
                  />

                  {/* 评论图片预览 */}
                  {commentImages.length > 0 && (
                    <ScrollView horizontal style={styles.commentImagesPreview}>
                      {commentImages.map((img, idx) => (
                        <View key={idx} style={styles.previewImageContainer}>
                          <Image source={{ uri: img }} style={styles.previewImage} />
                          <TouchableOpacity
                            style={styles.removeImageBtn}
                            onPress={() => handleRemoveImage(idx)}
                          >
                            <Ionicons name="close-circle" size={20} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  )}

                  <View style={styles.commentActions}>
                    <TouchableOpacity
                      style={styles.imagePickerBtn}
                      onPress={handlePickImage}
                    >
                      <Ionicons name="image-outline" size={24} color={COLORS.primary} />
                      {commentImages.length > 0 && (
                        <Text style={styles.imageCount}>{commentImages.length}</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.postBtn,
                        (!commentText.trim() || (!replyingTo && userRating === 0)) && styles.postBtnDisabled,
                      ]}
                      onPress={handlePostComment}
                      disabled={!commentText.trim() || (!replyingTo && userRating === 0)}
                    >
                      <Text style={styles.postBtnText}>{t('recipe.postComment')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Comments list */}
                {commentsLoading ? (
                  <View>
                    <CommentSkeleton />
                    <CommentSkeleton />
                    <CommentSkeleton />
                  </View>
                ) : comments.length === 0 ? (
                  <EmptyState
                    icon="chatbubble-outline"
                    title={t('recipe.noComments')}
                  />
                ) : (
                  <>
                    {comments.map((comment) => (
                      <CommentItem 
                        key={comment.id} 
                        comment={comment}
                        onReply={handleReply}
                      />
                    ))}
                    <ListFooter
                      isFetchingNextPage={isFetchingMoreComments}
                      hasNextPage={!!hasMoreComments}
                      error={commentsError}
                      onRetry={() => fetchNextComments()}
                      hasItems={comments.length > 0}
                    />
                  </>
                )}
              </View>
            )}

            {/* ── Related recommendations（需求 15）── */}
            {/* 少于 3 条不展示——避免只有 1-2 个看起来像 bug */}
            {relatedRecipes.length >= 3 && (
              <View style={styles.relatedWrap}>
                <Text style={styles.relatedTitle}>{t('recipe.related')}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.relatedList}
                >
                  {relatedRecipes.map((r) => (
                    <View key={r.id} style={styles.relatedCardWrap}>
                      <RecipeCard
                        recipe={r}
                        variant="grid"
                        onPress={() => router.push(`/recipe/${r.id}`)}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={{ height: insets.bottom + 24 }} />
          </View>
        </Animated.ScrollView>

        {/* ── Offscreen share card (captured via react-native-view-shot) ── */}
        <View style={styles.shareCardOffscreen} pointerEvents="none">
          <ShareCard
            ref={shareCardRef}
            recipe={recipe}
            deepLink={buildDeepLink(recipe.id)}
            authorName={userName ?? undefined}
          />
        </View>

        {/* ── 全屏图片查看器（需求 11）── */}
        <ImageViewer
          visible={viewerVisible}
          images={viewerImages}
          initialIndex={viewerIndex}
          onClose={() => setViewerVisible(false)}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  floatingTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  absoluteBack: {
    position: 'absolute',
    left: 16,
    zIndex: 200,
  },
  absoluteTopRight: {
    position: 'absolute',
    right: 16,
    zIndex: 200,
  },
  headerActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareCardOffscreen: {
    position: 'absolute',
    top: -(SHARE_CARD_HEIGHT + 200),
    left: -(SHARE_CARD_WIDTH + 200),
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    opacity: 0,
  },
  backBtnCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F2EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContainer: {
    width: '100%',
    height: HERO_HEIGHT,
  },
  heroTouchable: {
    width: '100%',
    height: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(255,253,249,0)',
  },
  contentCard: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingTop: 24,
    paddingHorizontal: 20,
    minHeight: 600,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  tagChip: {
    backgroundColor: '#F0F8FF',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#BDDDF0',
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2980B9',
  },
  categoryBadge: {
    backgroundColor: '#FFF0E8',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  difficultyBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recipeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  ratingValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFB800',
  },
  ratingCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  infoChips: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  infoChip: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  infoChipValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  infoChipLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  infoChipDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: '#FFF',
  },
  actionBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  actionBtnFav: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actionBtnTextActive: {
    color: '#FFF',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#F5F2EE',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#FFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  tabContent: {
    minHeight: 200,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  ingredientDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 12,
  },
  ingredientName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  ingredientAmount: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  // 营养成分样式 (REQ-4.4)
  nutritionSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  nutritionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  nutritionItem: {
    width: '47%',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  nutritionLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  commentInput: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  commentRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  commentRatingLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginRight: 4,
  },
  commentTextInput: {
    fontSize: 14,
    color: COLORS.text,
    minHeight: 72,
    textAlignVertical: 'top',
    marginBottom: 10,
    lineHeight: 20,
  },
  postBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  postBtnDisabled: {
    backgroundColor: '#E0DDD8',
  },
  postBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  replyingBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF0E8',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  replyingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  commentImagesPreview: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  previewImageContainer: {
    position: 'relative',
    marginRight: 8,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  imagePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    position: 'relative',
  },
  imageCount: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.primary,
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    borderRadius: 8,
    width: 16,
    height: 16,
    textAlign: 'center',
    lineHeight: 16,
  },
  metaBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
    marginBottom: 14,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF0E8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  relatedWrap: {
    marginTop: 8,
    marginBottom: 4,
  },
  relatedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  relatedList: {
    paddingRight: 12,
    gap: 12,
  },
  relatedCardWrap: {
    marginRight: 0,
  },
});
