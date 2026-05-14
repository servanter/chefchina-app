#!/bin/bash
# 验证修复的测试脚本

echo "=== 验证登录流程修复 ==="
echo ""

echo "1. 检查 profile.tsx 的退出登录跳转..."
if grep -q "router.replace('/profile')" "app/(tabs)/profile.tsx"; then
    echo "✅ profile.tsx: 退出登录跳转到 /profile"
else
    echo "❌ profile.tsx: 未找到正确的跳转路径"
fi

echo ""
echo "2. 检查 login.tsx 的关闭按钮..."
if grep -q "router.replace('/profile')" "app/auth/login.tsx"; then
    echo "✅ login.tsx: 关闭按钮跳转到 /profile"
else
    echo "❌ login.tsx: 未找到正确的跳转路径"
fi

echo ""
echo "3. 检查 _layout.tsx 的 401 重试配置..."
if grep -q "if (axiosError?.response?.status === 401) return false" "app/_layout.tsx"; then
    echo "✅ _layout.tsx: 401 错误不重试"
else
    echo "❌ _layout.tsx: 未找到 401 重试配置"
fi

echo ""
echo "4. 检查 api.ts 的 axios 拦截器..."
if grep -q "Authorization.*Bearer.*token" "src/lib/api.ts"; then
    echo "✅ api.ts: axios 拦截器正常"
else
    echo "⚠️  api.ts: 请检查 axios 拦截器配置"
fi

echo ""
echo "=== 验证完成 ==="
echo ""
echo "手动测试步骤："
echo "1. 启动应用: npm run web"
echo "2. 登录账号"
echo "3. 点击退出登录 -> 应停留在 Profile 页面"
echo "4. 点击登录按钮 -> 进入登录页"
echo "5. 点击登录页 X 号 -> 应返回 Profile 页面"
echo "6. 未登录状态访问详情页 -> 打开 Network 面板，检查 401 请求只发送 1 次"
