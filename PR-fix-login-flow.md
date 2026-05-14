# Pull Request: 修复登录流程和未认证状态处理问题

## Branch
`fix/web-logout-v3` → `main`

## Repository
https://github.com/servanter/chefchina-app

## Summary
修复了三个关键的登录流程和认证问题，提升用户体验并优化网络请求。

## 修复内容

### 🔧 问题 1：退出登录后跳转错误
**文件**: `app/(tabs)/profile.tsx`

**问题描述**:
- 用户点击退出登录后，跳转到 `/auth/login` 登录页面
- 用户期望：退出后停留在 Profile 页面，显示未登录状态

**解决方案**:
- 修改 `handleLogout` 函数的路由跳转
- 从 `router.replace('/auth/login')` 改为 `router.replace('/profile')`
- 退出后保持在 Profile 页面，用户可以看到未登录状态并选择登录

**影响**:
- ✅ 用户体验更流畅，不会被强制跳转到登录页
- ✅ 用户可以在未登录状态下浏览 Profile 页面的内容

---

### 🔧 问题 2：登录页右上角「X」号无效
**文件**: `app/auth/login.tsx`

**问题描述**:
- 用户点击登录页右上角的关闭按钮（X 号）无反应
- 原因：`onPress={() => router.back()}` 在某些情况下无法正确返回

**解决方案**:
- 修改关闭按钮的 `onPress` 处理
- 使用明确的路由跳转：`router.replace('/profile')`
- 添加 console.log 便于调试和监控

**代码变更**:
```tsx
// Before
<TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
  <Ionicons name="close" size={22} color={COLORS.text} />
</TouchableOpacity>

// After
<TouchableOpacity 
  style={styles.closeBtn} 
  onPress={() => {
    console.log('[Login] Close button clicked');
    router.replace('/profile');
  }}
>
  <Ionicons name="close" size={22} color={COLORS.text} />
</TouchableOpacity>
```

**影响**:
- ✅ 关闭按钮现在正常工作
- ✅ 用户可以随时关闭登录页返回 Profile

---

### 🔧 问题 3：未登录状态 401 重试问题
**文件**: `app/_layout.tsx`

**问题描述**:
- 未登录用户访问需要认证的接口时，返回 401 错误
- React Query 默认会对非 200 响应自动重试 3 次
- 导致：未登录访问详情页、shopping-list、quota 等接口时，会发送 3-4 次相同的 401 请求

**解决方案**:
- 修改 React Query 的 `retry` 配置
- 检查 `error.response.status === 401`
- 401 错误不重试，直接返回失败

**代码变更**:
```tsx
// Before
retry: (failureCount, error) => {
  if (isNetworkError(error)) return false;
  return failureCount < 2;
},

// After
retry: (failureCount, error) => {
  // 网络错误不重试
  if (isNetworkError(error)) return false;
  // 401 未认证错误不重试
  const axiosError = error as any;
  if (axiosError?.response?.status === 401) return false;
  // 其他错误最多重试 2 次
  return failureCount < 2;
},
```

**影响**:
- ✅ 减少不必要的网络请求
- ✅ 401 错误立即失败，用户可以更快看到需要登录的提示
- ✅ 节省服务器资源和用户流量

---

## 技术细节

### 路由策略
- **退出登录**: 使用 `router.replace('/profile')` 而不是 `router.replace('/auth/login')`
- **关闭登录页**: 使用 `router.replace('/profile')` 而不是 `router.back()`
- **原因**: 确保用户始终能够返回到 Profile 页面，而不依赖于路由历史

### React Query 重试策略
- **网络错误**: 不重试（axios 拦截器已处理）
- **401 错误**: 不重试（需要用户主动登录）
- **其他错误**: 最多重试 2 次

### 状态管理
- 退出登录时清除 React Query 缓存：`queryClient.clear()`
- 使用 `setTimeout` 确保状态更新后再跳转

---

## 验证测试

### 测试场景 1：退出登录
1. 登录账号
2. 进入 Profile 页面
3. 点击「退出登录」
4. **预期结果**: 停留在 Profile 页面，显示未登录状态
5. **实际结果**: ✅ 通过

### 测试场景 2：关闭登录页
1. 未登录状态下，点击 Profile 页面的「登录」按钮
2. 进入登录页面
3. 点击右上角的「X」关闭按钮
4. **预期结果**: 返回 Profile 页面
5. **实际结果**: ✅ 通过

### 测试场景 3：401 错误不重试
1. 退出登录（未登录状态）
2. 访问需要认证的页面（如菜谱详情页）
3. 打开浏览器 Network 面板
4. **预期结果**: 401 请求只发送 1 次，不重试
5. **实际结果**: ✅ 通过

---

## 影响范围

### 修改的文件
1. `app/(tabs)/profile.tsx` - 退出登录逻辑
2. `app/auth/login.tsx` - 登录页关闭按钮
3. `app/_layout.tsx` - React Query 重试配置

### 不影响的功能
- ✅ 登录功能正常
- ✅ 注册功能正常
- ✅ 其他页面的路由导航正常
- ✅ 已登录用户的功能不受影响

---

## 兼容性

- ✅ Web 端
- ✅ iOS 端
- ✅ Android 端

---

## 截图

### Before (问题)
- 退出登录 → 强制跳转到登录页 ❌
- 点击登录页 X 号 → 无反应 ❌
- 未登录访问详情页 → 3-4 次 401 请求 ❌

### After (修复)
- 退出登录 → 停留在 Profile 页面 ✅
- 点击登录页 X 号 → 返回 Profile 页面 ✅
- 未登录访问详情页 → 只发送 1 次 401 请求 ✅

---

## Checklist

- [x] 代码已提交到 `fix/web-logout-v3` 分支
- [x] 本地测试通过
- [x] 代码符合项目规范
- [x] 无新增 console.error（除了调试日志）
- [x] 向后兼容，不影响现有功能

---

## 如何创建 PR

由于 `gh` CLI 不可用，请手动创建 PR：

1. 访问: https://github.com/servanter/chefchina-app/compare/main...fix/web-logout-v3
2. 点击 "Create pull request"
3. 标题: `fix: 修复登录流程和未认证状态处理问题`
4. 描述: 复制本文档内容
5. Reviewers: 添加相关审查人员
6. Labels: 添加 `bug`, `enhancement`, `UX`

---

## 相关 Issue

如果有关联的 Issue，请在此处引用：
- Closes #XXX
- Fixes #YYY
