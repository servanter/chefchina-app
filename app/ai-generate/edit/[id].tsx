// app/ai-generate/edit/[id].tsx
// AI 生成菜谱 - 编辑页（简化版）

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/contexts/ThemeContext';

export default function AIGenerateEditScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>编辑菜谱</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Ionicons name="construct-outline" size={64} color={colors.subText} />
        <Text style={styles.placeholder}>编辑功能即将上线</Text>
        <Text style={styles.placeholderSub}>暂时请直接发布或重新生成</Text>
      </View>
    </SafeAreaView>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 4,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
    },
    placeholder: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    placeholderSub: {
      fontSize: 14,
      color: colors.subText,
    },
  });
}
