/**
 * 智能购物清单 - Hooks（无 React Query）
 */

import { useState, useCallback, useEffect } from 'react';
import {
  fetchShoppingList,
  generateShoppingList,
  addShoppingListItem,
  updateShoppingListItem,
  deleteShoppingListItem,
  clearShoppingList,
  ShoppingListData,
} from '../lib/api';

/**
 * 获取购物清单
 * - enabled 需要 isLoggedIn=true，未登录不发请求
 */
export function useShoppingList(options?: { enabled?: boolean }) {
  const [data, setData] = useState<ShoppingListData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const enabled = options?.enabled !== false;

  const load = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    try {
      const result = await fetchShoppingList();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { data, isLoading, error, refetch: load };
}

/**
 * 重新生成购物清单
 */
export function useGenerateShoppingList(refetch?: () => void) {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(async (data?: { recipeIds?: string[]; keepManual?: boolean }) => {
    setIsPending(true);
    try {
      const result = await generateShoppingList(data);
      refetch?.();
      return result;
    } finally {
      setIsPending(false);
    }
  }, [refetch]);

  return { mutate, isPending };
}

/**
 * 添加食材
 */
export function useAddShoppingListItem(refetch?: () => void) {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async (data: { name: string; amount: number; unit: string }) => {
    setIsPending(true);
    try {
      const result = await addShoppingListItem(data);
      refetch?.();
      return result;
    } finally {
      setIsPending(false);
    }
  }, [refetch]);

  return { mutate: mutateAsync, mutateAsync, isPending };
}

/**
 * 更新食材（勾选/修改数量）
 */
export function useUpdateShoppingListItem(refetch?: () => void) {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(async ({
    id,
    checked,
    amount,
    unit,
  }: {
    id: string;
    checked?: boolean;
    amount?: number;
    unit?: string;
  }) => {
    setIsPending(true);
    try {
      const result = await updateShoppingListItem(id, { checked, amount, unit });
      refetch?.();
      return result;
    } finally {
      setIsPending(false);
    }
  }, [refetch]);

  return { mutate, isPending };
}

/**
 * 删除单个食材
 */
export function useDeleteShoppingListItem(refetch?: () => void) {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(async (id: string) => {
    setIsPending(true);
    try {
      const result = await deleteShoppingListItem(id);
      refetch?.();
      return result;
    } finally {
      setIsPending(false);
    }
  }, [refetch]);

  return { mutate, isPending };
}

/**
 * 批量清空购物清单
 */
export function useClearShoppingList(refetch?: () => void) {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(async (data?: { clearAll?: boolean; keepManual?: boolean }) => {
    setIsPending(true);
    try {
      const result = await clearShoppingList(data);
      refetch?.();
      return result;
    } finally {
      setIsPending(false);
    }
  }, [refetch]);

  return { mutate, isPending };
}
