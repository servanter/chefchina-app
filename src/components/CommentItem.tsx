import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Comment } from '../lib/api';
import { AppImage } from './AppImage';

interface CommentItemProps {
  comment: Comment;
  onReply?: (comment: Comment) => void;
  onReport?: (commentId: string) => void;
  isReply?: boolean;
}

const StarRating = ({ rating }: { rating: number }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {[1, 2, 3, 4, 5].map((s) => (
      <Ionicons
        key={s}
        name={s <= rating ? 'star' : 'star-outline'}
        size={12}
        color="#FFB800"
      />
    ))}
  </View>
);

export const CommentItem: React.FC<CommentItemProps> = ({ comment, onReply, onReport, isReply = false }) => {
  const dateStr = new Date(comment.created_at).toLocaleDateString();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <View style={[styles.container, isReply && styles.replyContainer]}>
      <TouchableOpacity
        activeOpacity={0.7}
        onLongPress={() => onReport?.(comment.id)}
        delayLongPress={500}
        style={{ flex: 1, flexDirection: 'row' }}
      >
      <AppImage
        uri={
          comment.user?.avatar_url && comment.user.avatar_url.length > 0
            ? comment.user.avatar_url
            : `https://i.pravatar.cc/50?u=${comment.user_id}`
        }
        fallback={`https://i.pravatar.cc/50?u=${comment.user_id}`}
        style={styles.avatar}
      />
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.name}>{comment.user?.name ?? 'User'}</Text>
          <Text style={styles.date}>{dateStr}</Text>
        </View>
        {comment.rating && <StarRating rating={comment.rating} />}
        <Text style={styles.content}>{comment.content}</Text>
        
        {/* 评论图片展示 */}
        {comment.images && comment.images.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.imagesContainer}
          >
            {comment.images.map((img, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setSelectedImage(img)}
              >
                <AppImage
                  uri={img}
                  style={styles.commentImage}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* 回复按钮（仅顶级评论显示） */}
        {!isReply && (
          <View style={styles.actionRow}>
            {onReply && (
              <TouchableOpacity 
                style={styles.replyButton}
                onPress={() => onReply(comment)}
              >
                <Ionicons name="chatbubble-outline" size={14} color="#666" />
                <Text style={styles.replyText}>回复</Text>
              </TouchableOpacity>
            )}
            {onReport && (
              <TouchableOpacity
                style={styles.replyButton}
                onPress={() => onReport(comment.id)}
              >
                <Ionicons name="flag-outline" size={14} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 子评论（楼中楼） */}
        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                isReply={true}
              />
            ))}
          </View>
        )}
        </View>
      </TouchableOpacity>

      {/* 图片查看器 Modal */}
      {selectedImage && (
        <Modal
          visible={true}
          transparent={true}
          onRequestClose={() => setSelectedImage(null)}
        >
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={() => setSelectedImage(null)}
          >
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedImage(null)}
            >
              <Ionicons name="close" size={30} color="#FFF" />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE8',
  },
  replyContainer: {
    marginLeft: 20,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#E0E0E0',
    borderBottomWidth: 0,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#F0EDE8',
  },
  body: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  date: {
    fontSize: 11,
    color: '#999',
  },
  content: {
    fontSize: 13,
    color: '#444',
    lineHeight: 20,
    marginTop: 6,
  },
  imagesContainer: {
    marginTop: 8,
    flexDirection: 'row',
  },
  commentImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#F0EDE8',
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  replyText: {
    fontSize: 12,
    color: '#666',
  },
  repliesContainer: {
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
  },
});
