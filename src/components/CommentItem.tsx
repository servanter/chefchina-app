import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Comment } from '../lib/api';
import { AppImage } from './AppImage';

interface CommentItemProps {
  comment: Comment;
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

export const CommentItem: React.FC<CommentItemProps> = ({ comment }) => {
  const dateStr = new Date(comment.created_at).toLocaleDateString();

  return (
    <View style={styles.container}>
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
        <StarRating rating={comment.rating} />
        <Text style={styles.content}>{comment.content}</Text>
      </View>
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
});
