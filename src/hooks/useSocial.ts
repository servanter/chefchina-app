import { useState, useCallback, useEffect, useRef } from 'react';
import {
  toggleCommentLike,
  fetchCommentLikeStatus,
  toggleFollow,
  fetchFeed,
  FeedResponse,
} from '../lib/api';

// 评论点赞 toggle
export const useToggleCommentLike = () => {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async ({ commentId }: { commentId: string }) => {
    setIsPending(true);
    try {
      return await toggleCommentLike(commentId);
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutateAsync, isPending };
};

// 批量查询评论点赞状态
export const useCommentLikeStatus = (commentIds: string[], enabled = true) => {
  const [data, setData] = useState<Record<string, boolean> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const key = commentIds.join(',');

  const load = useCallback(async () => {
    if (!enabled || commentIds.length === 0) return;
    setIsLoading(true);
    try {
      const result = await fetchCommentLikeStatus(commentIds);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  useEffect(() => {
    if (enabled && commentIds.length > 0) load();
  }, [key, enabled, load]);

  return { data, isLoading, error, refetch: load };
};

// 关注 / 取消关注
export const useToggleFollow = () => {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(async ({
    followingId,
    action,
  }: {
    followingId: string;
    action: 'follow' | 'unfollow';
  }) => {
    setIsPending(true);
    try {
      return await toggleFollow(followingId, action);
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending };
};

// 关注动态 Feed (infinite scroll)
export const useInfiniteFeed = (enabled = true) => {
  const [pages, setPages] = useState<FeedResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const cursorRef = useRef<string | undefined>(undefined);

  const load = useCallback(
    async (reset: boolean) => {
      if (!enabled) return;
      const cursor = reset ? undefined : cursorRef.current;
      if (reset) {
        setIsLoading(true);
        setPages([]);
        cursorRef.current = undefined;
        setHasNextPage(true);
      } else {
        if (!hasNextPage || isFetchingNextPage) return;
        setIsFetchingNextPage(true);
      }
      try {
        const page = await fetchFeed(cursor);
        cursorRef.current = page.nextCursor ?? undefined;
        setPages((prev) => (reset ? [page] : [...prev, page]));
        setHasNextPage(!!page.nextCursor);
        setError(null);
      } catch (e) {
        setError(e as Error);
      } finally {
        setIsLoading(false);
        setIsFetchingNextPage(false);
      }
    },
    [enabled],
  );

  useEffect(() => {
    if (enabled) load(true);
  }, [enabled]);

  const fetchNextPage = useCallback(() => load(false), [load]);
  const refetch = useCallback(() => load(true), [load]);
  const data = pages.length > 0 ? { pages } : undefined;

  return { data, isLoading, isFetchingNextPage, hasNextPage, error, refetch, fetchNextPage };
};
