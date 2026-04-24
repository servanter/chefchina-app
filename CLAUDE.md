@.claude/TEAM.md

# ChefChina App（出海菜谱移动端）

面向海外华人的中华菜谱 App（"在海外也能做正宗中国菜"），双语（中英）体验。
姊妹项目：`../chefchina-admin`（Next.js 后台 + 统一 API）

---

## 技术栈

- **框架**：React Native（Expo SDK）+ expo-router
- **状态 / 数据**：@tanstack/react-query
- **网络**：axios（`src/lib/api.ts` 统一封装）
- **存储**：@react-native-async-storage/async-storage
- **国际化**：i18next + react-i18next（中英两套 locale）
- **UI**：react-native-safe-area-context、@expo/vector-icons
- **Toast**：react-native-toast-message

---

## 目录结构

```
chefchina-app/
├── App.tsx / index.ts              # 入口
├── app.json                        # Expo 配置（scheme: chefchina）
├── app/                            # expo-router 路由
│   ├── _layout.tsx                 #   根布局（Onboarding 判断 + Stack）
│   ├── (tabs)/
│   │   ├── _layout.tsx             #   Tab 导航
│   │   ├── index.tsx               #   首页（Bell + 分类 + Featured + Quick）
│   │   ├── explore.tsx             #   探索（分类/难度/Tag 筛选）
│   │   ├── favorites.tsx           #   收藏
│   │   └── profile.tsx             #   个人中心
│   ├── recipe/[id].tsx             # 菜谱详情（含 Share 按钮 + offscreen ShareCard）
│   ├── auth/login.tsx              # 登录
│   ├── profile/edit.tsx            # 编辑个人资料
│   ├── onboarding.tsx              # 首次启动引导（3步）
│   └── notifications.tsx           # 通知中心
└── src/
    ├── components/                 # RecipeCard / CategoryChip / CommentItem
    │                                 / RatingStars / StepItem / EmptyState
    │                                 / LoadingSpinner / ShareCard
    ├── hooks/
    │   ├── useAuth.ts              # 登录态 + restore + updateProfile + syncLocale
    │   ├── useRecipes.ts           # useRecipes/useCategories/useTags/useComments
    │   │                             /useToggleLike/useToggleFavorite
    │   ├── useNotifications.ts     # useNotifications / useUnreadCount / useMarkRead 等
    │   └── useShareRecipe.ts       # 截图 ShareCard + expo-sharing
    ├── lib/
    │   ├── api.ts                  # axios 实例 + 类型 + adaptXxx + 所有 fetch 函数
    │   ├── i18n.ts                 # i18next 初始化
    │   ├── storage.ts              # AsyncStorage 封装（user_id/name/bio/avatar/onboarding）
    │   └── mockData.ts             # 已废弃（DIFFICULTIES 常量还在用）
    └── locales/
        ├── en.json
        └── zh.json
```

---

## API 地址 & 后端对接

`src/lib/api.ts` 中：

```ts
const BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000/api'
                            : 'http://localhost:3000/api';
```

- **Android 模拟器**用 `10.0.2.2` 映射宿主机
- **iOS 模拟器 / Web** 用 `localhost`
- 上线时需要改为生产域名（建议改成读 `process.env.EXPO_PUBLIC_API_BASE`）
- 后台 API 已通过 CORS middleware 允许 Expo 来源，详见 admin 项目

### 前后端数据契约

- 后端返回 **驼峰格式**，前端用 `adaptRecipe` / `adaptComment` / `adaptCategory` / `adaptNotification` 转**下划线**
- 统一响应结构 `{ success, data }`，前端拿 `res.data.data`
- 分页接口返回 `{ recipes/comments: [], pagination: { page, pageSize, total, totalPages } }`

---

## 核心类型（`src/lib/api.ts`）

```ts
Recipe {
  id, title, title_zh, description, description_zh, cover_image,
  category, category_slug, difficulty, cook_time, prep_time, servings, calories,
  ingredients, steps, likes_count, comments_count, favorites_count,
  avg_rating, ratings_count, is_published, created_at,
  tags: { id; label; label_zh }[]   // ← 注意是对象数组，不是 string[]
}
Category { id, label, label_zh, slug, recipesCount }
Tag { id, label, label_zh, recipesCount? }
Comment { id, user_id, recipe_id, content, rating, created_at, user? }
User { id, email, name, avatar_url, bio, favorites_count, comments_count }
Notification { id, type, title, body, payload, read, created_at }
```

**⚠️ Recipe.tags 是对象数组** — 跳转筛选时传 `tagId`，显示时 `isZh ? tag.label_zh : tag.label`。

---

## 已完成功能（2026/04）

### 基础体验
- 首页：欢迎语 + 搜索 + 动态分类 + Featured 热度排序 + Quick & Easy
- 探索：分类 / 难度 / Tag 三维筛选 + 搜索
- 菜谱详情：封面 + Tab（食材 / 步骤 / 评论）+ 点赞 / 收藏 / 评分 / 分享
- 收藏：FlatList + 下拉刷新 + 空状态引导探索
- 个人中心：头像 / bio / 编辑入口 / 语言切换 / 退出登录
- 编辑个人资料：昵称 + Bio（持久化到 AsyncStorage + 后端）
- Onboarding：3 步引导（首次启动），用 Stack.initialRouteName 控制
- 语言切换：本地 i18next + 自动同步到服务器 `User.locale`

### 交互 + 通知
- 点赞 / 收藏状态进入详情页自动回显（`fetchLikeStatus` / `fetchFavoriteStatus`）
- 通知中心：Bell 图标 + 未读红点 badge + 列表页（类型图标、未读标记、点击跳转）
- 60s 轮询 unread count + 乐观更新 `useMarkRead`

### 分享
- ShareCard 1080×1920 长图组件（封面 / 标题 / 二维码）
- Share 按钮 → 截图 → expo-sharing 系统面板 → 记录 `/api/share`
- DeepLink scheme `chefchina://recipe/[id]`
- Web 分享页 `https://chefchina.app/s/[id]`（admin SSR 提供）

### Bug 修复（约 26 项）
详见"本次会话变更"节。

---

## 数据种子（测试数据）

数据库中现有（由 admin 项目 `scripts/seed-users-comments.mjs` 插入）：
- **25 道菜谱**（`rec_01` ~ `rec_25`）覆盖川菜 / 粤菜 / 湘菜 / 北方菜 / 点心 / 面食
- **6 个分类**（`cat_01` ~ `cat_06`）
- **8 个测试用户**（`user_01` ~ `user_08`，中英文混合）
- **53 条评论**（真实评分 1-5⭐，中英文混合）

---

## 本次会话的重大改动（2026/04）

### App Bug 修复（约 17 项）
**Dev 1 首轮（8 项）**：
- 收藏按钮硬编码中文 → i18n
- 点赞/收藏 Toast 方向相反 → 先算 next 再更新
- prep_time 永远显示 0 → 条件渲染
- 收藏页启动闪 EmptyState → `userId` 初始值 `null`
- 个人中心未登录 Banner 闪烁 → 加 `authLoading` 守卫
- RecipeCard 在 Android 上 Text 嵌套 Icon 崩溃 → 改用 View
- 评论头像空字符串不 fallback → `??` 改 `||`
- 首页网格宽度不受 `effectiveWidth` 约束 → 补 maxWidth

**QA 发现 + 修复（9 项）**：
- 详情页点赞数双计数 → 去掉本地 `+1`
- PATCH /api/users/[id] 缺 `_count` → 后端补 include
- `useAuth.restore` 硬编码 bio → `saveUserBio` / `getUserBio`
- avatar 空串不 fallback → 长度判断 + `pravatar.cc` 兜底
- Edit Profile 硬编码 Name/Bio → 新增 `nameLabel` / `bioLabel` i18n
- Tag 跳转用英文 label 易断链 → 改用 `tagId`
- Onboarding 闪现 tabs → 用 `initialRouteName` 代替 `router.replace`
- `useToggleFavorite` 未 invalidate recipe → 加入对称 invalidate
- 点赞失败无 Toast → catch 补 error Toast

### App 新功能（6 大块）
- **收藏读取**：`fetchFavorites` 实装（之前 return []）
- **互动状态同步**：新增 `fetchLikeStatus` / `fetchFavoriteStatus`
- **个人资料编辑**：新建 `app/profile/edit.tsx` + `updateUser`
- **locale 持久化**：切换语言同步到服务端 `User.locale`
- **评分系统**：`adaptRecipe` 读取真实 `avgRating` / `ratingsCount`
- **首页热度排序**：`fetchFeaturedRecipes` 传 `sort=hot`
- **Tag 体系**：`fetchTags` / `useTags` / explore 的 Tag Chip / 详情页 Tag 点击跳转
- **Onboarding**：3 步页面 + `getOnboardingDone` / `setOnboardingDone`
- **通知中心**：完整前端（Bell + badge + 列表页 + Mark read）
- **分享卡片**：ShareCard + useShareRecipe + DeepLink

### 分类动态化（之前）
- `CATEGORIES` 常量从 `mockData.ts` 移除
- 首页 / 探索都改用 `useCategories()`，从后端 `/api/categories` 拉取
- `mockData.ts` 仍保留 `MOCK_RECIPES` / `MOCK_COMMENTS` / `DIFFICULTIES`（`USE_MOCK=false` 开关仍可切回本地 mock）

---

## ⚠️ 上线前必须处理（QA 未通过）

### 🔴 阻断级

1. **Metro `require()` 动态加载不是安全网**
   - `src/components/ShareCard.tsx` 和 `src/hooks/useShareRecipe.ts` 里 `try { require('react-native-qrcode-svg') } catch` 是**假兜底**
   - Metro 打包阶段**静态解析** require，三个库没装 bundle 直接失败
   - 必须执行：`npx expo install react-native-view-shot expo-sharing react-native-qrcode-svg react-native-svg`

2. **通知列表只拉第一页**
   - `app/notifications.tsx` 用的是 `useNotifications`（first page only）
   - `useInfiniteNotifications` 已导出但无处调用
   - > 20 条通知后旧的看不到

### 🟡 一般级

- `formatRelativeTime` 不处理负时差 → 可能显示 "-1 分钟前"
- `app.json` 的 `associatedDomains` / `intentFilters` 还是注释占位 —— Universal Link 未真正开启
- ShareCard 的分类标签不走 i18n（中文环境仍显示英文分类）
- 通知列表失败时只显示 EmptyState（无 error 重试按钮）
- `useMarkAllRead` 无乐观更新（慢网下体验差）
- `SUBMISSION_APPROVED` / `SYSTEM` 通知点击无跳转目标
- 分享 web base URL（`https://chefchina.app/s`）硬编码在 `useShareRecipe.ts`
- 前端没有"回复评论" UI，`COMMENT_REPLY` 通知类型在应用内无法 E2E 触发
- `Notification.payload` 类型用 `Record<string, any>` → 丢失结构信息

---

## ⚠️ 必须手动执行的命令

```bash
# 1. 后端 migration（在 chefchina-admin 目录）
cd ../chefchina-admin
npx prisma migrate dev --name add_notifications_and_sharelog
npx prisma generate

# 2. 前端依赖（在 chefchina-app 目录）
npx expo install react-native-view-shot expo-sharing
npx expo install react-native-qrcode-svg react-native-svg

# 3. （可选）后端 Expo Push SDK
cd ../chefchina-admin && npm install expo-server-sdk
```

---

## 开发 / 运行

```bash
# 先确保 admin 后台已启动（http://localhost:3000）
cd ../chefchina-admin && npm run dev

# 启动 App
cd chefchina-app
npx expo start
# 按 i / a / w 分别启动 iOS / Android / Web
```

---

## 常见坑

- **CORS** → 改了端口要同步改 admin 的 `src/middleware.ts` 的 `ALLOWED_ORIGINS`
- **Android 模拟器连不上后端** → `BASE_URL` 必须是 `10.0.2.2` 而不是 `localhost`
- **Recipe.tags 是对象数组**不是字符串数组 — 写新代码时不要假设
- **`adaptRecipe.prep_time` 永远是 0**（后端没有 prepTimeMin 字段）— 详情页已做 `prep_time > 0 &&` 兜底
- **Onboarding 重启后不再显示**靠 AsyncStorage `onboarding_done` 键 — 测试时需要手动清除 AsyncStorage 或重装 App
- **API 新增字段**必须同步更新 `BackendRecipe` 等类型
- **i18n 新增文案**必须同时加到 `src/locales/en.json` 和 `zh.json`
