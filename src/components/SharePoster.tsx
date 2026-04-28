import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

interface SharePosterProps {
  visible: boolean;
  onClose: () => void;
  recipe: {
    id: string;
    title: string;
    coverImage?: string;
    author: {
      name: string;
      avatar?: string;
    };
  };
}

export default function SharePoster({ visible, onClose, recipe }: SharePosterProps) {
  const posterRef = useRef<View>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [posterUri, setPosterUri] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<MediaLibrary.PermissionStatus | null>(null);

  // 生成海报
  const generatePoster = async () => {
    if (!posterRef.current) return;

    setIsGenerating(true);
    try {
      const uri = await captureRef(posterRef, {
        format: 'png',
        quality: 1,
      });
      setPosterUri(uri);
    } catch (error) {
      console.error('生成海报失败:', error);
      Alert.alert('错误', '生成海报失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  // 保存到相册
  const saveToLibrary = async () => {
    if (!posterUri) {
      await generatePoster();
      return;
    }

    try {
      // 请求权限
      let status = permissionStatus;
      if (!status) {
        const { status: newStatus } = await MediaLibrary.requestPermissionsAsync();
        status = newStatus;
        setPermissionStatus(newStatus);
      }

      if (status !== 'granted') {
        Alert.alert('需要权限', '请允许访问相册以保存图片');
        return;
      }

      // 保存到相册
      await MediaLibrary.saveToLibraryAsync(posterUri);
      Alert.alert('成功', '海报已保存到相册');
    } catch (error) {
      console.error('保存失败:', error);
      Alert.alert('错误', '保存失败，请重试');
    }
  };

  // 分享海报
  const sharePoster = async () => {
    if (!posterUri) {
      await generatePoster();
      return;
    }

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('提示', '当前设备不支持分享功能');
        return;
      }

      await Sharing.shareAsync(posterUri);
    } catch (error) {
      console.error('分享失败:', error);
      Alert.alert('错误', '分享失败，请重试');
    }
  };

  // 生成分享链接
  const shareUrl = `https://chefchina.app/recipe/${recipe.id}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={generatePoster}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* 关闭按钮 */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>

          {/* 海报预览 */}
          <View style={styles.posterContainer}>
            {isGenerating && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#FF6B35" />
                <Text style={styles.loadingText}>正在生成海报...</Text>
              </View>
            )}

            {/* 海报内容 */}
            <View ref={posterRef} collapsable={false} style={styles.poster}>
              {/* 背景装饰 */}
              <View style={styles.posterBackground}>
                {/* 封面图 */}
                {recipe.coverImage ? (
                  <Image
                    source={{ uri: recipe.coverImage }}
                    style={styles.coverImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Ionicons name="restaurant" size={80} color="#ccc" />
                  </View>
                )}

                {/* 渐变遮罩 */}
                <View style={styles.gradient} />

                {/* 内容区 */}
                <View style={styles.contentArea}>
                  {/* 标题 */}
                  <Text style={styles.recipeTitle} numberOfLines={2}>
                    {recipe.title}
                  </Text>

                  {/* 作者信息 */}
                  <View style={styles.authorSection}>
                    {recipe.author.avatar ? (
                      <Image
                        source={{ uri: recipe.author.avatar }}
                        style={styles.authorAvatar}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.authorAvatar, styles.avatarPlaceholder]}>
                        <Ionicons name="person" size={20} color="#999" />
                      </View>
                    )}
                    <View>
                      <Text style={styles.authorName}>{recipe.author.name}</Text>
                      <Text style={styles.authorLabel}>分享于 ChefChina</Text>
                    </View>
                  </View>

                  {/* 分割线 */}
                  <View style={styles.divider} />

                  {/* 二维码/链接区 */}
                  <View style={styles.qrSection}>
                    <View style={styles.qrPlaceholder}>
                      <Ionicons name="qr-code" size={60} color="#FF6B35" />
                    </View>
                    <View style={styles.qrTextContainer}>
                      <Text style={styles.qrTitle}>扫码查看完整菜谱</Text>
                      <Text style={styles.qrUrl} numberOfLines={1}>
                        {shareUrl}
                      </Text>
                    </View>
                  </View>

                  {/* Logo/品牌 */}
                  <View style={styles.brandSection}>
                    <Ionicons name="restaurant-outline" size={24} color="#FF6B35" />
                    <Text style={styles.brandText}>ChefChina 美食社区</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* 操作按钮 */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton]}
              onPress={saveToLibrary}
              disabled={isGenerating}
            >
              <Ionicons name="download-outline" size={22} color="#fff" />
              <Text style={styles.actionButtonText}>保存到相册</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.shareButton]}
              onPress={sharePoster}
              disabled={isGenerating}
            >
              <Ionicons name="share-outline" size={22} color="#fff" />
              <Text style={styles.actionButtonText}>分享海报</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    padding: 8,
  },
  posterContainer: {
    width: '100%',
    aspectRatio: 0.75,
    marginVertical: 20,
    position: 'relative',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderRadius: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  poster: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  posterBackground: {
    flex: 1,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  contentArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  recipeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#fff',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  authorLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginVertical: 16,
  },
  qrSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  qrPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#fff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  qrTextContainer: {
    flex: 1,
  },
  qrTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  qrUrl: {
    fontSize: 11,
    color: '#666',
  },
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 6,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  shareButton: {
    backgroundColor: '#FF6B35',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
