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
import { useRecipeDetailFull, useToggleLike, useToggleFavorite, usePostComment, useUpdateComment, useDeleteComment, useUnpublishRecipe, useDeleteRecipe } from '../../src/hooks/useRecipes';
import { useToggleCommentLike } from '../../src/hooks/useSocial';
import { StepItem } from '../../src/components/StepItem';
import { CommentItem } from '../../src/components/CommentItem';
import { RatingStars } from '../../src/components/RatingStars';
import { AnimatedLikeButton } from '../../src/components/AnimatedLikeButton';
import { AnimatedFavoriteButton } from '../../src/components/AnimatedFavoriteButton';
import { AnimatedRatingStars } from '../../src/components/AnimatedRatingStars';
import { triggerHaptic } from '../../src/lib/haptics';
import { useBounce } from '../../src/hooks/useBounce';
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
import { saveViewHistoryRemote, Comment } from '../../src/lib/api';
import { useAuth } from '../../src/hooks/useAuth';
import { saveViewHistoryItem } from '../../src/lib/storage';
import { ReportModal } from '../../src/components/ReportModal';
import SharePoster from '../../src/components/SharePoster';
import type { ReportTargetType } from '../../src/lib/api';

const COLORS = { primary: '#E85D26', background: '#FFFDF9', text: '#1A1A1A', textSecondary: '#666', inputBg: '#F5F2EE', border: '#E8E4DF', card: '#FFF', tint: '#E85D26' };
const HERO_HEIGHT = 280;

// 需求 11：Hero 封面在 cover_image 缺失时也要能点开查看器。统一兜底 URL
// 避免条件分支下 onPress 变成 no-op。
const DEFAULT_COVER_FALLBACK =
  'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=80';

import { useTheme } from '../../src/contexts/ThemeContext';

type TabId = 'ingredients' | 'steps' | 'comments';

const getCommentOwnerId = (comment: Comment) =>
  comment.user?.id ?? comment.userId ?? comment.user_id;

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors: themeColors } = useTheme();

  const COLORS = {
    primary: themeColors.tint,
    background: themeColors.bg,
    text: themeColors.text,
    textSecondary: themeColors.subText,
    cardBg: themeColors.card,
    border: themeColors.border,
  };
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const effectiveWidth = Math.min(width, 390);
  const isZh = i18n.language === 'zh';

  const [activeTab, setActiveTab] = useState<TabId>('ingredients');
  const [stepMode, setStepMode] = useState(false);
  const [stepModeIndex, setStepModeIndex] = useState(0);
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id ?? 'guest';
  const userName = user?.name ?? null;
  
  const [liked, setLiked] = useState(false);
  const { scale: likeScale, bounce: likeBounce } = useBounce();
  const { scale: favScale, bounce: favBounce } = useBounce();
  const [favorited, setFavorited] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [userRating, setUserRating] = useState(0);
  const [commentImages, setCommentImages] = useState<string[]>([]); // 评论图片
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null); // 回复对象
  const [editingComment, setEditingComment] = useState<Comment | null>(null);

  // Image viewer：全屏查看器（需求 11）
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [heroImageIndex, setHeroImageIndex] = useState(0);

  // Report modal state (需求 4)
  const [reportVisible, setReportVisible] = useState(false);
  const [reportTargetType, setReportTargetType] = useState<ReportTargetType>('RECIPE');
  const [reportTargetId, setReportTargetId] = useState('');

  // Share poster state (需求 16.3)
  const [posterVisible, setPosterVisible] = useState(false);

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

  const {
    data: detailData,
    isLoading,
    error,
    refetch: refetchRecipeDetail,
  } = useRecipeDetailFull(id ?? '', userId, authLoading);

  const recipe = detailData?.recipe;
  const comments = detailData?.comments ?? [];
  const commentsLoading = isLoading;
  const commentsError = error;
  const commentsTotal = comments.length;
  const relatedRecipes = detailData?.related ?? [];
  const commentLikeStatusMap = detailData?.commentLikeStatus ?? {}; // 从 detail-full 获取

  useEffect(() => {
    if (!recipe?.id) return;
    saveViewHistoryItem(recipe.id, {
      title: recipe.title,
      title_zh: recipe.title_zh,
      description: recipe.description,
      description_zh: recipe.description_zh,
      cover_image: recipe.cover_image,
    }).catch(() => {});

    if (userId && userId !== 'guest') {
      saveViewHistoryRemote(recipe.id).catch(() => {});
    }
  }, [recipe, userId]);
  const refetchComments = refetchRecipeDetail;
  const fetchNextComments = async () => undefined;
  const hasMoreComments = false;
  const isFetchingMoreComments = false;
  
  // 移除独立的 useCommentLikeStatus 调用，改用 detail-full 返回的数据
  const toggleLikeMutation = useToggleLike();
  const toggleFavoriteMutation = useToggleFavorite();
  const postCommentMutation = usePostComment();
  const updateCommentMutation = useUpdateComment();
  const deleteCommentMutation = useDeleteComment();
  const unpublishRecipeMutation = useUnpublishRecipe();
  const deleteRecipeMutation = useDeleteRecipe();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchRecipeDetail();
    } finally {
      setRefreshing(false);
      triggerHaptic('light');
    }
  }, [refetchRecipeDetail]);

  const handleLoadMoreComments = useCallback(() => {
    // 详情页改为 BFF 聚合接口后，评论首屏由同一次请求返回；当前页不再单独分页拉取。
  }, []);

  const headerOpacity = scrollY.interpolate({
    inputRange: [HERO_HEIGHT - 80, HERO_HEIGHT - 40],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const handleLike = useCallback(async () => {
    if (!recipe) return;
    if (userId === 'guest') {
      Alert.alert(t('auth.loginRequired'), t('auth.loginRequiredDesc'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('auth.login'), onPress: () => router.push({ pathname: '/auth/login', params: { redirect: `/recipe/${recipe.id}` } }) },
      ]);
      return;
    }
    const nextLiked = !liked;
    setLiked(nextLiked);
    try {
      await toggleLikeMutation.mutateAsync({ recipeId: recipe.id, userId });
      triggerHaptic(nextLiked ? 'success' : 'light');
      likeBounce();
      // 不需要手动 refetch，mutation 的 onSuccess 会自动 invalidate
      Toast.show({
        type: 'success',
        text1: nextLiked ? t('recipe.likeSuccess') : t('recipe.unlikeSuccess'),
        visibilityTime: 1500,
      });
    } catch {
      setLiked((prev) => !prev); // revert
      triggerHaptic('error');
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        visibilityTime: 2000,
      });
    }
  }, [recipe, liked, userId, t, toggleLikeMutation, router, likeBounce]);

  const handleFavorite = useCallback(async () => {
    if (!recipe) return;
    if (userId === 'guest') {
      Alert.alert(t('auth.loginRequired'), t('auth.loginRequiredDesc'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('auth.login'), onPress: () => router.push({ pathname: '/auth/login', params: { redirect: `/recipe/${recipe.id}` } }) },
      ]);
      return;
    }
    const nextFavorited = !favorited;
    setFavorited(nextFavorited);
    try {
      await toggleFavoriteMutation.mutateAsync({ recipeId: recipe.id, userId });
      triggerHaptic(nextFavorited ? 'success' : 'light');
      favBounce();
      // 不需要手动 refetch，mutation 的 onSuccess 会自动 invalidate
      Toast.show({
        type: 'success',
        text1: nextFavorited ? t('recipe.favoriteSuccess') : t('recipe.unfavoriteSuccess'),
        visibilityTime: 1500,
      });
    } catch {
      setFavorited((prev) => !prev);
      triggerHaptic('error');
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        visibilityTime: 2000,
      });
    }
  }, [recipe, favorited, userId, t, toggleFavoriteMutation, router, favBounce]);

  const handlePostComment = useCallback(async () => {
    if (userId === 'guest') {
      Alert.alert(t('auth.loginRequired'), t('auth.loginRequiredDesc'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('auth.login'), onPress: () => router.push({ pathname: '/auth/login', params: { redirect: id ? `/recipe/${id}` : '/(tabs)' } }) },
      ]);
      return;
    }
    if (!commentText.trim()) return;
    if (editingComment) {
      try {
        await updateCommentMutation.mutateAsync({
          commentId: editingComment.id,
          content: commentText.trim(),
        });
        setEditingComment(null);
        setCommentText('');
        setUserRating(0);
        setCommentImages([]);
        setReplyingTo(null);
        triggerHaptic('success');
        Toast.show({ type: 'success', text1: isZh ? '评论已更新' : 'Comment updated', visibilityTime: 1500 });
      } catch {
        Toast.show({ type: 'error', text1: t('common.error'), visibilityTime: 2000 });
      }
      return;
    }
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
      triggerHaptic('success');
      Toast.show({
        type: 'success',
        text1: replyingTo ? t('comment.replySuccess') : t('recipe.commentPosted'),
        visibilityTime: 1500,
      });
    } catch {
      Toast.show({ type: 'error', text1: t('common.error'), visibilityTime: 2000 });
    }
  }, [commentText, userRating, commentImages, replyingTo, editingComment, id, userId, t, postCommentMutation, updateCommentMutation, isZh]);

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
    setEditingComment(null);
    setReplyingTo(comment);
    setUserRating(0);
  }, []);

  const handleEditComment = useCallback((comment: Comment) => {
    setReplyingTo(null);
    setEditingComment(comment);
    setCommentText(comment.content);
    setUserRating(comment.rating || 0);
    setCommentImages(comment.images ?? []);
  }, []);

  const handleDeleteComment = useCallback((comment: Comment) => {
    Alert.alert(
      t('common.confirm'),
      isZh ? '确定删除这条评论吗？' : 'Delete this comment?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: isZh ? '删除' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCommentMutation.mutateAsync({ commentId: comment.id, recipeId: comment.recipe_id });
              if (editingComment?.id === comment.id) {
                setEditingComment(null);
                setCommentText('');
                setCommentImages([]);
              }
              Toast.show({ type: 'success', text1: isZh ? '评论已删除' : 'Comment deleted' });
            } catch {
              Toast.show({ type: 'error', text1: t('common.error') });
            }
          },
        },
      ],
    );
  }, [deleteCommentMutation, editingComment, isZh, t]);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const handleShare = useCallback(async () => {
    if (!recipe) return;
    // 打开海报生成对话框
    setPosterVisible(true);
  }, [recipe]);

  const { mutate: toggleCommentLike } = useToggleCommentLike();

  const handleCommentLike = useCallback((commentId: string) => {
    if (userId === 'guest') {
      Toast.show({ type: 'error', text1: t('social.loginRequired') || t('report.loginRequired') });
      return;
    }
    toggleCommentLike({ commentId }, {
      onSuccess: () => {
        triggerHaptic('light');
      },
      onError: () => {
        Toast.show({ type: 'error', text1: t('common.error') });
      },
    });
  }, [userId, toggleCommentLike, t]);

  // ─── Report handlers (需求 4) ─────────────────────────────────
  const handleReportRecipe = useCallback(() => {
    if (userId === 'guest') {
      Toast.show({ type: 'error', text1: t('report.loginRequired') });
      return;
    }
    setReportTargetType('RECIPE');
    setReportTargetId(id ?? '');
    setReportVisible(true);
  }, [userId, id, t]);

  const handleReportComment = useCallback((commentId: string) => {
    if (userId === 'guest') {
      Toast.show({ type: 'error', text1: t('report.loginRequired') });
      return;
    }
    setReportTargetType('COMMENT');
    setReportTargetId(commentId);
    setReportVisible(true);
  }, [userId, t]);

  // 监听 detailData 变化，更新 liked 和 favorited 状态
  useEffect(() => {
    if (!detailData?.userStatus) return;
    setLiked(detailData.userStatus.liked);
    setFavorited(detailData.userStatus.favorited);
  }, [detailData?.userStatus]);

  // ⚠️ CRITICAL: 所有 hooks 必须在 early return 之前调用
  // 修复 React Error #310: useMemo 不能在条件返回后调用
  const allRecipeImages = useMemo(() => {
    if (!recipe) return [];
    const images: string[] = [];
    const seen = new Set<string>();
    const addImage = (image?: string | string[] | null) => {
      if (!image) return;
      const list = Array.isArray(image) ? image : [image];
      list.forEach((uri) => {
        if (!uri || seen.has(uri)) return;
        seen.add(uri);
        images.push(uri);
      });
    };

    addImage(recipe.cover_image || DEFAULT_COVER_FALLBACK);
    recipe.steps?.forEach((step) => addImage(step.image));

    return images;
  }, [recipe]);

  useEffect(() => {
    if (recipe?.id) {
      setHeroImageIndex(0);
    }
  }, [recipe?.id]);

  const isAuthor = userId !== 'guest' && !!recipe && userId === (detailData as any)?.recipe?.author?.id;

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
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const difficultyDisplay = recipe.difficulty
    ? recipe.difficulty === 'easy'
      ? { icon: '⭐', text: t('recipe.difficultyEasy') }
      : recipe.difficulty === 'medium'
        ? { icon: '⭐⭐', text: t('recipe.difficultyMedium') }
        : { icon: '⭐⭐⭐', text: t('recipe.difficultyHard') }
    : null;

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
            { paddingTop: insets.top, opacity: headerOpacity, backgroundColor: COLORS.background, borderBottomColor: COLORS.border },
          ]}
        >
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: themeColors.inputBg }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={[styles.floatingTitle, { color: COLORS.text }]} numberOfLines={1}>{title}</Text>
          <View style={styles.headerActionGroup}>
            {isAuthor ? (
              <>
                {/* REQ-BF-002: 菜谱编辑按钮 */}
                <TouchableOpacity
                  style={[styles.backBtn, { backgroundColor: themeColors.inputBg }]}
                  onPress={() => {
                    if (!recipe) return;
                    router.push(`/recipe/create?mode=edit&recipeId=${recipe.id}`);
                  }}
                >
                  <Ionicons name="create-outline" size={20} color={COLORS.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.backBtn, { backgroundColor: themeColors.inputBg }]}
                  onPress={() => {
                    if (!recipe) return;
                    Alert.alert(
                      t('common.confirm'),
                      isZh ? '确定下架这道菜谱吗？' : 'Unpublish this recipe?',
                      [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                          text: isZh ? '下架' : 'Unpublish',
                          onPress: async () => {
                            try {
                              await unpublishRecipeMutation.mutateAsync(recipe.id);
                              Toast.show({ type: 'success', text1: isZh ? '菜谱已下架' : 'Recipe unpublished' });
                              await refetchRecipeDetail();
                            } catch {
                              Toast.show({ type: 'error', text1: t('common.error') });
                            }
                          },
                        },
                      ],
                    );
                  }}
                >
                  <Ionicons name="eye-off-outline" size={20} color={COLORS.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.backBtn, { backgroundColor: themeColors.inputBg }]}
                  onPress={() => {
                    if (!recipe) return;
                    Alert.alert(
                      t('common.confirm'),
                      isZh ? '确定删除这道菜谱吗？' : 'Delete this recipe?',
                      [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                          text: isZh ? '删除' : 'Delete',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await deleteRecipeMutation.mutateAsync(recipe.id);
                              Toast.show({ type: 'success', text1: isZh ? '菜谱已删除' : 'Recipe deleted' });
                              router.replace('/my-recipes');
                            } catch {
                              Toast.show({ type: 'error', text1: t('common.error') });
                            }
                          },
                        },
                      ],
                    );
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color="#dc2626" />
                </TouchableOpacity>
              </>
            ) : null}
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: themeColors.inputBg }]}
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
            <TouchableOpacity style={[styles.backBtn, { backgroundColor: themeColors.inputBg }]} onPress={handleFavorite}>
              <Animated.View style={{ transform: [{ scale: favScale }] }}>
              <Ionicons
                name={favorited ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={favorited ? COLORS.primary : COLORS.text}
              />
              </Animated.View>
            </TouchableOpacity>
            {!isAuthor ? (
              <TouchableOpacity style={[styles.backBtn, { backgroundColor: themeColors.inputBg }]} onPress={handleReportRecipe}>
                <Ionicons name="flag-outline" size={20} color={COLORS.text} />
              </TouchableOpacity>
            ) : null}
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
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.heroCarousel}
              onMomentumScrollEnd={(event) => {
                const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
                setHeroImageIndex(Math.max(0, Math.min(allRecipeImages.length - 1, nextIndex)));
              }}
            >
              {allRecipeImages.map((imageUri, index) => (
                <TouchableOpacity
                  key={`${imageUri}-${index}`}
                  activeOpacity={0.95}
                  onPress={() => openViewer(allRecipeImages, index)}
                  style={[styles.heroTouchable, { width }]}
                >
                  <LazyImage uri={imageUri} style={styles.heroImage} priority={index === 0 ? 'high' : undefined} />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.heroPagination} pointerEvents="none">
              {allRecipeImages.map((_, index) => (
                <View
                  key={`dot-${index}`}
                  style={[
                    styles.heroPaginationDot,
                    index === heroImageIndex && styles.heroPaginationDotActive,
                  ]}
                />
              ))}
            </View>
            <View style={styles.heroGradient} />
          </View>

          {/* ── Content Card ── */}
          <View style={[styles.contentCard, { backgroundColor: COLORS.background }]}>
            {/* Title & meta */}
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.categoryRow}>
                  <View style={[styles.categoryBadge]}>
                    <Text style={styles.categoryText}>{recipe.category}</Text>
                  </View>
                </View>
                <Text style={[styles.recipeTitle, { color: COLORS.text }]}>{title}</Text>
                {(totalTime > 0 || difficultyDisplay) && (
                  <View style={styles.titleMetaRow}>
                    {totalTime > 0 && (
                      <View style={styles.titleMetaChip}>
                        <Ionicons name="time-outline" size={14} color={COLORS.primary} />
                        <Text style={styles.titleMetaText}>
                          {totalTime} {t('recipe.mins')}
                        </Text>
                      </View>
                    )}
                    {difficultyDisplay && (
                      <View style={[styles.difficultyBadge, { backgroundColor: difficultyColors[recipe.difficulty!] + '20' }]}>
                        <Text style={[styles.difficultyText, { color: difficultyColors[recipe.difficulty!] }]}>
                          {difficultyDisplay.icon} {difficultyDisplay.text}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
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
                        pathname: '/tag/[id]',
                        params: { id: tag.id },
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
              {recipe.prep_time > 0 && (
                <View style={styles.metaChip}>
                  <Ionicons name="cut-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.metaChipText}>
                    {t('recipe.prepTime')} {recipe.prep_time} {t('recipe.mins')}
                  </Text>
                </View>
              )}
              {recipe.cook_time > 0 && (
                <View style={styles.metaChip}>
                  <Ionicons name="flame-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.metaChipText}>
                    {t('recipe.cookTime')} {recipe.cook_time} {t('recipe.mins')}
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
              <AnimatedRatingStars rating={recipe.avg_rating} size={16} readonly animated />
              <Text style={styles.ratingValue}>{recipe.avg_rating.toFixed(1)}</Text>
              <Text style={styles.ratingCount}>
                {t('recipe.ratingLabel', { count: recipe.ratings_count })}
              </Text>
            </View>

            {/* Info chips — 全部字段都缺失时整块不渲染（BUG-04） */}
            {(recipe.cook_time > 0 ||
              recipe.prep_time > 0 ||
              recipe.servings > 0) && (
              <View style={[styles.infoChips, { backgroundColor: COLORS.cardBg }]}>
                {(recipe.cook_time > 0 || recipe.prep_time > 0) && (
                  <View style={styles.infoChip}>
                    <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                    <Text style={[styles.infoChipValue, { color: COLORS.text }]}>{recipe.cook_time + recipe.prep_time}</Text>
                    <Text style={[styles.infoChipLabel, { color: COLORS.textSecondary }]}>{t('recipe.cookTime')}</Text>
                  </View>
                )}
                {recipe.servings > 0 && (
                  <>
                    {(recipe.cook_time > 0 || recipe.prep_time > 0) && (
                      <View style={[styles.infoChipDivider, { backgroundColor: COLORS.border }]} />
                    )}
                    <View style={styles.infoChip}>
                      <Ionicons name="people-outline" size={16} color={COLORS.primary} />
                      <Text style={[styles.infoChipValue, { color: COLORS.text }]}>{recipe.servings}</Text>
                      <Text style={[styles.infoChipLabel, { color: COLORS.textSecondary }]}>{t('recipe.persons')}</Text>
                    </View>
                  </>
                )}
                {recipe.prep_time > 0 && (
                  <>
                    <View style={[styles.infoChipDivider, { backgroundColor: COLORS.border }]} />
                    <View style={styles.infoChip}>
                      <Ionicons name="restaurant-outline" size={16} color={COLORS.primary} />
                      <Text style={[styles.infoChipValue, { color: COLORS.text }]}>{recipe.prep_time}</Text>
                      <Text style={[styles.infoChipLabel, { color: COLORS.textSecondary }]}>{t('recipe.prepTime')}</Text>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Description */}
            <Text style={[styles.description, { color: COLORS.textSecondary }]}>{description}</Text>

            {/* Like & Favorite actions */}
            <View style={styles.actionRow}>
              <AnimatedLikeButton
                liked={liked}
                label={`${t('recipe.likes')} · ${recipe.likes_count}`}
                onPress={handleLike}
                tintColor={COLORS.primary}
                size={18}
                style={[styles.actionBtn, { backgroundColor: COLORS.cardBg }]}
                labelStyle={[styles.actionBtnText, { color: COLORS.primary }]}
                activeStyle={styles.actionBtnActive}
                activeLabelStyle={styles.actionBtnTextActive}
              />

              <AnimatedFavoriteButton
                favorited={favorited}
                label={favorited ? t('recipe.favoritedLabel') : t('recipe.favoriteLabel')}
                onPress={handleFavorite}
                tintColor={COLORS.primary}
                size={18}
                style={[styles.actionBtn, { backgroundColor: COLORS.cardBg }]}
                labelStyle={[styles.actionBtnText, { color: COLORS.primary }]}
                activeStyle={styles.actionBtnFav}
                activeLabelStyle={styles.actionBtnTextActive}
              />
            </View>

            {/* ── Tabs ── */}
            <View style={[styles.tabs, { backgroundColor: themeColors.inputBg }]}>
              {TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tab, activeTab === tab.id && [styles.tabActive, { backgroundColor: themeColors.card }]]}
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
                  <View key={idx} style={[styles.ingredientRow, { borderBottomColor: COLORS.border }]}>
                    <View style={styles.ingredientDot} />
                    <Text style={[styles.ingredientName, { color: COLORS.text }]}>
                      {isZh ? ing.name_zh : ing.name}
                    </Text>
                    <Text style={[styles.ingredientAmount, { color: COLORS.textSecondary }]}>{ing.amount}</Text>
                  </View>
                ))}
                
                {/* 营养成分显示 (REQ-4.4) */}
                {(recipe.protein || recipe.fat || recipe.carbs || recipe.fiber || recipe.sodium || recipe.sugar) && (
                  <View style={[styles.nutritionSection, { backgroundColor: themeColors.inputBg, borderColor: COLORS.border }]}>
                    <Text style={[styles.nutritionTitle, { color: COLORS.text }]}>
                      {isZh ? '营养信息' : 'Nutrition Facts'}
                    </Text>
                    <View style={styles.nutritionGrid}>
                      {recipe.protein != null && (
                        <View style={[styles.nutritionItem, { backgroundColor: COLORS.cardBg, borderColor: COLORS.border }]}>
                          <Text style={styles.nutritionLabel}>
                            {isZh ? '蛋白质' : 'Protein'}
                          </Text>
                          <Text style={styles.nutritionValue}>{recipe.protein}g</Text>
                        </View>
                      )}
                      {recipe.fat != null && (
                        <View style={[styles.nutritionItem, { backgroundColor: COLORS.cardBg, borderColor: COLORS.border }]}>
                          <Text style={styles.nutritionLabel}>
                            {isZh ? '脂肪' : 'Fat'}
                          </Text>
                          <Text style={styles.nutritionValue}>{recipe.fat}g</Text>
                        </View>
                      )}
                      {recipe.carbs != null && (
                        <View style={[styles.nutritionItem, { backgroundColor: COLORS.cardBg, borderColor: COLORS.border }]}>
                          <Text style={styles.nutritionLabel}>
                            {isZh ? '碳水' : 'Carbs'}
                          </Text>
                          <Text style={styles.nutritionValue}>{recipe.carbs}g</Text>
                        </View>
                      )}
                      {recipe.fiber != null && (
                        <View style={[styles.nutritionItem, { backgroundColor: COLORS.cardBg, borderColor: COLORS.border }]}>
                          <Text style={styles.nutritionLabel}>
                            {isZh ? '纤维' : 'Fiber'}
                          </Text>
                          <Text style={styles.nutritionValue}>{recipe.fiber}g</Text>
                        </View>
                      )}
                      {recipe.sodium != null && (
                        <View style={[styles.nutritionItem, { backgroundColor: COLORS.cardBg, borderColor: COLORS.border }]}>
                          <Text style={styles.nutritionLabel}>
                            {isZh ? '钠' : 'Sodium'}
                          </Text>
                          <Text style={styles.nutritionValue}>{recipe.sodium}mg</Text>
                        </View>
                      )}
                      {recipe.sugar != null && (
                        <View style={[styles.nutritionItem, { backgroundColor: COLORS.cardBg, borderColor: COLORS.border }]}>
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
                <View style={styles.stepModeHeader}>
                  <Text style={[styles.relatedTitle, { color: COLORS.text }]}>{isZh ? '步骤' : 'Steps'}</Text>
                  <TouchableOpacity
                    style={[styles.stepModeToggle, stepMode && styles.stepModeToggleActive]}
                    onPress={() => {
                      setStepMode((prev) => !prev);
                      setStepModeIndex(0);
                    }}
                  >
                    <Text style={[styles.stepModeToggleText, stepMode && styles.stepModeToggleTextActive]}>
                      {stepMode ? (isZh ? '退出分步模式' : 'Exit Step Mode') : (isZh ? '分步模式' : 'Step Mode')}
                    </Text>
                  </TouchableOpacity>
                </View>
                {(() => {
                  if (stepMode) {
                    const currentStep = recipe.steps[stepModeIndex];
                    return (
                      <View style={styles.stepModeCard}>
                        <Text style={styles.stepModeProgress}>
                          {isZh ? `第 ${stepModeIndex + 1} / ${recipe.steps.length} 步` : `Step ${stepModeIndex + 1} / ${recipe.steps.length}`}
                        </Text>
                        <StepItem
                          key={currentStep.order}
                          step={currentStep}
                          isZh={isZh}
                          onImagePress={
                            currentStep.image
                              ? (uri) => {
                                  const idx = allRecipeImages.indexOf(uri);
                                  if (idx >= 0) {
                                    openViewer(allRecipeImages, idx);
                                  }
                                }
                              : undefined
                          }
                        />
                        <View style={styles.stepModeActions}>
                          <TouchableOpacity
                            style={[styles.stepModeNavBtn, stepModeIndex === 0 && styles.postBtnDisabled]}
                            disabled={stepModeIndex === 0}
                            onPress={() => setStepModeIndex((prev) => Math.max(0, prev - 1))}
                          >
                            <Text style={styles.postBtnText}>{isZh ? '上一步' : 'Previous'}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.stepModeNavBtn, stepModeIndex === recipe.steps.length - 1 && styles.postBtnDisabled]}
                            disabled={stepModeIndex === recipe.steps.length - 1}
                            onPress={() => setStepModeIndex((prev) => Math.min(recipe.steps.length - 1, prev + 1))}
                          >
                            <Text style={styles.postBtnText}>{isZh ? '下一步' : 'Next'}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }
                  return recipe.steps.map((step) => (
                    <StepItem
                      key={step.order}
                      step={step}
                      isZh={isZh}
                      onImagePress={
                        step.image
                          ? (uri) => {
                              const idx = allRecipeImages.indexOf(uri);
                              if (idx >= 0) {
                                openViewer(allRecipeImages, idx);
                              }
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
                <View style={[styles.commentInput, { backgroundColor: COLORS.cardBg, borderColor: COLORS.border }]}>
                  {/* 回复提示 */}
                  {replyingTo && (
                    <View style={styles.replyingBox}>
                      <Text style={styles.replyingText}>
                        {t('comment.replyingTo', { username: replyingTo.user?.name ?? 'User' })}
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
                    style={[styles.commentTextInput, { color: COLORS.text }]}
                    placeholder={editingComment ? (isZh ? '编辑你的评论...' : 'Edit your comment...') : replyingTo ? (isZh ? '写下你的回复...' : 'Write your reply...') : t('recipe.writeComment')}
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
                        (!commentText.trim() || (!replyingTo && !editingComment && userRating === 0)) && styles.postBtnDisabled,
                      ]}
                      onPress={handlePostComment}
                      disabled={!commentText.trim() || (!replyingTo && !editingComment && userRating === 0)}
                    >
                      <Text style={styles.postBtnText}>{editingComment ? (isZh ? '保存修改' : 'Save') : t('recipe.postComment')}</Text>
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
                        userId={userId}
                        canManage={getCommentOwnerId(comment) === userId}
                        liked={commentLikeStatusMap[comment.id] || false}
                        likedMap={commentLikeStatusMap}
                        onReply={handleReply}
                        onEdit={handleEditComment}
                        onDelete={handleDeleteComment}
                        onReport={handleReportComment}
                        onToggleLike={handleCommentLike}
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
                <Text style={[styles.relatedTitle, { color: COLORS.text }]}>{t('recipe.related')}</Text>
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

        {/* ── Report modal (需求 4) ── */}
        <ReportModal
          visible={reportVisible}
          onClose={() => setReportVisible(false)}
          targetType={reportTargetType}
          targetId={reportTargetId}
        />

        {/* ── Share poster modal (需求 16.3) ── */}
        {recipe && (
          <SharePoster
            visible={posterVisible}
            onClose={() => setPosterVisible(false)}
            recipe={{
              id: recipe.id,
              title: isZh ? recipe.title_zh : recipe.title,
              coverImage: recipe.cover_image,
              author: {
                name: 'Anonymous',
                avatar: undefined,
              },
            }}
          />
        )}
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
  heroCarousel: {
    width: '100%',
    height: '100%',
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
  heroPagination: {
    position: 'absolute',
    bottom: 18,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    zIndex: 2,
  },
  heroPaginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  heroPaginationDotActive: {
    width: 18,
    backgroundColor: '#FFF',
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
  titleMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  titleMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF0E8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  titleMetaText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
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
    backgroundColor: COLORS.card,
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
    backgroundColor: COLORS.card,
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
  stepModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stepModeToggle: {
    backgroundColor: '#FFF0E8',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stepModeToggleActive: {
    backgroundColor: COLORS.primary,
  },
  stepModeToggleText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  stepModeToggleTextActive: {
    color: '#FFF',
  },
  stepModeCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
  },
  stepModeProgress: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
  },
  stepModeActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  stepModeNavBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
});
