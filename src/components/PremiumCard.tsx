import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useFontScale } from '@/hooks/useFontScale';

interface PremiumCardProps {
  isPremium: boolean;
  expiresAt?: string;
}

export function PremiumCard({ isPremium, expiresAt }: PremiumCardProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { scaled } = useFontScale();

  const handlePress = () => {
    router.push('/pricing');
  };

  if (isPremium) {
    // Premium 用户显示会员状态
    const expiryDate = expiresAt ? new Date(expiresAt).toLocaleDateString('zh-CN') : '';

    return (
      <TouchableOpacity
        style={styles.container}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#FFD700', '#FFA500', '#FF8C00']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.badgeContainer}>
                <Text style={styles.crownIcon}>👑</Text>
                <Text style={[styles.premiumTitle, { fontSize: scaled(17) }]}>
                  Premium 会员
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </View>
            
            <Text style={[styles.expiryText, { fontSize: scaled(13) }]}>
              有效期至 {expiryDate}
            </Text>
            
            <View style={styles.featuresRow}>
              <View style={styles.featureTag}>
                <Ionicons name="infinite" size={14} color="#FFFFFF" />
                <Text style={[styles.featureText, { fontSize: scaled(11) }]}>
                  无限收藏
                </Text>
              </View>
              <View style={styles.featureTag}>
                <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                <Text style={[styles.featureText, { fontSize: scaled(11) }]}>
                  AI 营养师
                </Text>
              </View>
              <View style={styles.featureTag}>
                <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
                <Text style={[styles.featureText, { fontSize: scaled(11) }]}>
                  永久数据
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // 免费用户显示升级提示
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['#FFD700', '#FFA500', '#FF8C00']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.badgeContainer}>
              <Text style={styles.crownIcon}>👑</Text>
              <Text style={[styles.premiumTitle, { fontSize: scaled(17) }]}>
                升级到 Premium
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </View>
          
          <Text style={[styles.upgradeSubtitle, { fontSize: scaled(13) }]}>
            解锁 AI 营养师、无限收藏等更多功能
          </Text>
          
          <View style={styles.upgradeButton}>
            <Text style={[styles.upgradeButtonText, { fontSize: scaled(14) }]}>
              立即升级
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#FF6B35" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  gradient: {
    padding: 16,
  },
  content: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  crownIcon: {
    fontSize: 20,
  },
  premiumTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  expiryText: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  featuresRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  featureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featureText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  upgradeSubtitle: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 4,
    gap: 6,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B35',
  },
});
