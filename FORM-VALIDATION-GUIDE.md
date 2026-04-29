# REQ-18.2: 表单错误提示应用指南

## 已完成的工作

### 1. 创建了统一的表单错误提示组件
文件：`src/components/FormError.tsx`

包含三个组件：
- `FieldError`: 字段级错误（红色文本 + 图标）
- `FormBanner`: 表单级错误（顶部 Banner）
- `ValidationIcon`: 验证状态图标（✓/✗）

### 2. 已应用到个人资料编辑页
文件：`app/profile/edit.tsx`

功能：
- ✅ 昵称实时验证（2-20字符，敏感词过滤）
- ✅ 简介字数限制验证（500字符）
- ✅ 失焦时触发验证（onBlur）
- ✅ 显示验证状态图标
- ✅ 头像上传（选择、裁剪、压缩）
- ✅ 所在地和性别选择

## 待应用的页面

### 3. 登录页面 (`app/auth/login.tsx`)

需要修改的地方：

```tsx
// 1. 导入组件
import { FieldError, FormBanner, ValidationIcon } from '../../src/components/FormError';

// 2. 替换现有的错误显示
// 旧代码：
{emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

// 新代码：
<FieldError message={emailError} />

// 3. 添加验证状态图标到输入框
<View style={styles.inputWrap}>
  <Ionicons name="mail-outline" size={18} color="#999" style={styles.inputIcon} />
  <TextInput
    style={styles.input}
    placeholder="Email"
    value={email}
    onChangeText={setEmail}
    onBlur={() => handleBlur('email')}
  />
  <ValidationIcon status={emailValidationStatus} />
</View>

// 4. 添加表单级错误提示（在表单顶部）
<FormBanner 
  message={formError} 
  type="error"
  onDismiss={() => setFormError(undefined)}
/>
```

### 4. 注册页面 (`app/auth/register.tsx`)

类似登录页面的修改。

### 5. 菜谱创建/编辑页面

需要验证：
- 标题：必填，2-100字符
- 描述：可选，最多500字符
- 食材：至少1个
- 步骤：至少1个

### 6. 评论发布表单

需要验证：
- 评论内容：1-500字符
- 评分：1-5星（可选）

## 统一的验证规则

### 邮箱验证
```tsx
const validateEmail = (value: string): string | undefined => {
  if (!value.trim()) {
    return '请输入邮箱地址';
  }
  if (!EMAIL_REGEX.test(value)) {
    return '请输入有效的邮箱地址';
  }
  return undefined;
};
```

### 密码验证
```tsx
const validatePassword = (value: string): string | undefined => {
  if (!value) {
    return '请输入密码';
  }
  if (value.length < 6) {
    return '密码至少需要6个字符';
  }
  return undefined;
};
```

### 昵称验证
```tsx
const validateNickname = (value: string): string | undefined => {
  if (!value.trim()) {
    return '请输入昵称';
  }
  if (value.length < 2 || value.length > 20) {
    return '昵称长度需在 2-20 字符之间';
  }
  // 敏感词检查
  const SENSITIVE_WORDS = ['admin', 'moderator', 'official', '管理员', '官方'];
  const lowerValue = value.toLowerCase();
  if (SENSITIVE_WORDS.some(word => lowerValue.includes(word.toLowerCase()))) {
    return '昵称包含敏感词，请修改';
  }
  return undefined;
};
```

## 使用模式

### 1. 实时验证（onChange）
```tsx
const [nickname, setNickname] = useState('');
const [errors, setErrors] = useState<FormErrors>({});
const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

<TextInput
  value={nickname}
  onChangeText={(text) => {
    setNickname(text);
    // 只有在用户触碰过该字段后才实时验证
    if (touched.nickname) {
      const error = validateNickname(text);
      setErrors({ ...errors, nickname: error });
    }
  }}
  onBlur={() => {
    setTouched({ ...touched, nickname: true });
    const error = validateNickname(nickname);
    setErrors({ ...errors, nickname: error });
  }}
/>
<FieldError message={errors.nickname} />
```

### 2. 提交时验证
```tsx
const handleSubmit = async () => {
  // 1. 验证所有字段
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);

  if (emailError || passwordError) {
    setErrors({
      email: emailError,
      password: passwordError,
      form: '请修正表单错误后再提交',
    });
    return;
  }

  // 2. 提交数据
  try {
    await submitForm();
  } catch (error) {
    setErrors({ form: error.message });
  }
};
```

## 错误文案规范

### ❌ 不好的错误提示
- "Invalid input"
- "Error"
- "Field required"

### ✅ 好的错误提示
- "昵称长度需在 2-20 字符之间"
- "请输入有效的邮箱地址，例如：user@example.com"
- "密码至少需要6个字符"
- "该昵称已被使用，请换一个"

## 样式统一

### 错误状态的输入框
```tsx
<View style={[
  styles.inputWrap,
  touched.email && errors.email && styles.inputWrapError,
]}>
  ...
</View>

// styles
inputWrapError: {
  borderColor: '#EF4444',
}
```

### 颜色规范
- 错误：`#EF4444` (红色)
- 成功：`#10B981` (绿色)
- 警告：`#F59E0B` (橙色)
- 信息：`#3B82F6` (蓝色)

## 注意事项

1. **不要在用户输入时就显示错误**
   - 等用户失焦（onBlur）后再显示
   - 或者第一次失焦后，才开启实时验证

2. **提供具体的修改建议**
   - 不仅告诉用户"错了"
   - 还要告诉"怎么改"

3. **一次只显示一个错误**
   - 避免多个错误同时出现，让用户不知所措
   - 按优先级显示最重要的错误

4. **使用正确的键盘类型**
   - 邮箱：`keyboardType="email-address"`
   - 数字：`keyboardType="numeric"`
   - 电话：`keyboardType="phone-pad"`

5. **表单提交时禁用按钮**
   - 防止重复提交
   - 显示加载状态

## 下一步工作

1. ✅ 个人资料编辑页 - 已完成
2. ⏳ 登录页面 - 待应用
3. ⏳ 注册页面 - 待应用
4. ⏳ 菜谱创建/编辑 - 待应用
5. ⏳ 评论发布 - 待应用
