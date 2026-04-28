import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useTrendingKeywords } from '@/hooks/useTopics';
import { getSearchHistory, clearSearchHistory as clearLocalHistory } from '@/lib/storage';

interface SearchPanelProps {
  onSelectKeyword: (keyword: string) => void;
  onClearHistory: () => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ onSelectKeyword, onClearHistory }) => {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { data: trendingData, isLoading } = useTrendingKeywords(10);
  const [history, setHistory] = useState<string[]>([]);

  const isZh = i18n.language === 'zh';

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const h = await getSearchHistory();
    setHistory(h.slice(0, 10));
  };

  const handleClearHistory = async () => {
    await clearLocalHistory();
    setHistory([]);
    onClearHistory();
  };

  const getTrendingIcon = (type: 'hot' | 'rising' | 'new') => {
    switch (type) {
      case 'hot':
        return '🔥';
      case 'rising':
        return '📈';
      case 'new':
        return '✨';
      default:
        return '🔥';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 热门搜索 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            🔥 {isZh ? '热门搜索' : 'Trending'}
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
        ) : (
          <View style={styles.chipContainer}>
            {trendingData?.trending.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.chip, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                onPress={() => onSelectKeyword(item.keyword)}
              >
                <Text style={[styles.chipText, { color: colors.text }]}>
                  {getTrendingIcon(item.trendingType)} {item.keyword}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* 搜索历史 */}
      {history.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              🕒 {isZh ? '搜索历史' : 'Search History'}
            </Text>
            <TouchableOpacity onPress={handleClearHistory}>
              <Text style={[styles.clearText, { color: colors.subText }]}>
                {isZh ? '清空' : 'Clear'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.historyList}>
            {history.map((keyword, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.historyItem, { borderBottomColor: colors.border }]}
                onPress={() => onSelectKeyword(keyword)}
              >
                <Text style={[styles.historyText, { color: colors.text }]} numberOfLines={1}>
                  {keyword}
                </Text>
                <Ionicons name="search-outline" size={18} color={colors.subText} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16
  },
  section: {
    marginBottom: 24
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600'
  },
  clearText: {
    fontSize: 14
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1
  },
  chipText: {
    fontSize: 14
  },
  historyList: {
    gap: 4
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  historyText: {
    fontSize: 15,
    flex: 1
  },
  loader: {
    marginVertical: 12
  }
});
