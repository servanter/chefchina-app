import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  toggleCommentLike,
  fetchCommentLikeStatus,
  toggleFollow,
  fetchFeed,
  FeedResponse,
} from '../lib/api';

// 评论点赞 toggle
export const useToggleCommentLike = () => {
  const queryClient = useQueryClient();
  return useMutation<{ liked: boolean; likesCount: number }, Error, { commentId: string }>({
    mutationFn: ({ commentId }) => toggleCommentLike(commentId),
    onSuccess: (_, { commentId }) => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      queryClient.invalidateQueries({ queryKey: ['comment-like-status', commentId] });
    },
  });
};

// 批量查询评论点赞状态
export const useCommentLikeStatus = (commentIds: string[], enabled = true) => {
  return useQuery<Record<string, boolean>>({
    queryKey: ['comment-like-status-batch', commentIds],
    queryFn: () => fetchCommentLikeStatus(commentIds),
    enabled: enabled && commentIds.length > 0,
    staleTime: 1000 * 60,
  });
};

// 关注 / 取消关注
export const useToggleFollow = () => {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, Error, { followingId: string; action: 'follow' | 'unfollow' }>({
    mutationFn: ({ followingId, action }) => toggleFollow(followingId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follows'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
};

// 关注动态 Feed (infinite scroll)
export const useInfiniteFeed = (enabled = true) => {
  return useInfiniteQuery<FeedResponse>({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => fetchFeed(pageParam as string | undefined),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
    staleTime: 1000 * 30,
  });
};
