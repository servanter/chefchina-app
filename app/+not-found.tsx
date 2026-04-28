import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../src/contexts/ThemeContext';

export default function NotFoundScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Ionicons name="help-circle-outline" size={80} color="#CCC" />
      <Text style={[styles.title, { color: colors.text }]}>页面走丢了</Text>
      <Text style={[styles.subtitle, { color: colors.subText }]}>你访问的页面不存在</Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.tint }]}
        onPress={() => router.replace('/(tabs)')}
      >
        <Text style={styles.buttonText}>返回首页</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
  },
  button: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
