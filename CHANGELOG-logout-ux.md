# 修复退出登录 UX 和不必要的 API 请求

## 修复内容

### 1. 退出登录后页面自动滚动到顶部（问题 1）
- **文件**: `app/(tabs)/profile.tsx`
- **修复**: 
  - 添加 `scrollViewRef` 引用到 ScrollView 组件
  - 在退出登录后调用 `scrollViewRef.current?.scrollTo({ y: 0, animated: true })`
  - 确保用户看到页面顶部的"访客"状态，而不是停留在底部的 Log Out 按钮位置
  
### 2. 未登录时不请求需要认证的接口（问题 2）
- **文件**: `app/recipe/[id].tsx`
- **修复**:
  - 在 `useAIQuota` 调用中添加 `enabled: userId !== 'guest'` 条件
  - 在 `useShoppingList` 调用中添加 `enabled: userId !== 'guest'` 条件
  - 未登录访问详情页时，不会请求 `/ai/quota` 和 `/api/shopping-list` 接口

### 3. 优化 React Query hooks 支持条件查询（问题 2 相关）
- **文件**: 
  - `src/hooks/useAIAnalysis.ts`
  - `src/hooks/useShoppingList.ts`
- **修复**:
  - 为 `useAIQuota` 和 `useShoppingList` 添加可选的 `options` 参数
  - 支持 `{ enabled: boolean }` 选项来控制查询是否执行
  - 默认 `enabled: true` 保持向后兼容

## 技术细节

### ScrollView Ref 模式
```typescript
const scrollViewRef = useRef<ScrollView>(null);
// ...
scrollViewRef.current?.scrollTo({ y: 0, animated: true });
```

### React Query Conditional Fetching
```typescript
const { data: quotaData } = useAIQuota({
  enabled: userId !== 'guest'
});
```

## 验证清单

- [x] 退出登录后页面滚动到顶部
- [x] 未登录访问详情页时不请求 `/ai/quota`
- [x] 未登录访问详情页时不请求 `/api/shopping-list`
- [x] 现有功能（购物车页面等）不受影响
- [x] 代码向后兼容

## 影响范围

- **Profile 页面**: 退出登录体验改善
- **Recipe 详情页**: 减少无效 API 请求，提升性能
- **购物车功能**: 无影响（继续正常工作）
- **AI 分析功能**: 无影响（仅登录用户可用）

## Breaking Changes

无。所有修改向后兼容。
