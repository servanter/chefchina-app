/**
 * 智能购物清单 - React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchShoppingList,
  generateShoppingList,
  addShoppingListItem,
  updateShoppingListItem,
  deleteShoppingListItem,
  clearShoppingList,
  ShoppingListData,
  ShoppingListItem,
} from '../lib/api';

/**
 * 获取购物清单
 * - retry: false  —— 401 未登录时不重试，直接失败
 * - enabled 需要 isLoggedIn=true，未登录不发请求
 */
export function useShoppingList(options?: { enabled?: boolean }) {
  return useQuery<ShoppingListData>({
    queryKey: ['shopping-list'],
    queryFn: () => fetchShoppingList(),
    enabled: options?.enabled !== false,
    retry: false, // 401/网络错误不重试，避免未登录时重复请求
  });
}

/**
 * 重新生成购物清单
 */
export function useGenerateShoppingList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data?: { recipeIds?: string[]; keepManual?: boolean }) =>
      generateShoppingList(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    },
  });
}

/**
 * 添加食材
 */
export function useAddShoppingListItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; amount: number; unit: string }) =>
      addShoppingListItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    },
  });
}

/**
 * 更新食材（勾选/修改数量）
 */
export function useUpdateShoppingListItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      checked,
      amount,
      unit,
    }: {
      id: string;
      checked?: boolean;
      amount?: number;
      unit?: string;
    }) => updateShoppingListItem(id, { checked, amount, unit }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    },
  });
}

/**
 * 删除单个食材
 */
export function useDeleteShoppingListItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteShoppingListItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    },
  });
}

/**
 * 批量清空购物清单
 */
export function useClearShoppingList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data?: { clearAll?: boolean; keepManual?: boolean }) =>
      clearShoppingList(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    },
  });
}
