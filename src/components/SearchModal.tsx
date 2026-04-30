import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { getSearchHistory, saveSearchHistory, clearSearchHistory } from '@/lib/storage';
import { useQuery } from '@tanstack/react-query';

type SearchSuggestResponse = {
  data?: {
    suggestions?: Array<{ text: string }>;
  };
};

type SearchTrendingResponse = {
  data?: {
    keywords?: string[];
  };
};

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  tintColor: string;
}

export const SearchModal: React.FC<SearchModalProps> = ({ visible, onClose, tintColor }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<string[]>([]);

  // 获取热门搜索
  const { data: trendingData = [] } = useQuery<string[]>({
    queryKey: ['search', 'trending'],
    queryFn: async () => {
      const res = await fetch('https://chefchina-admin.vercel.app/api/search/trending');
      const data: SearchTrendingResponse = await res.json();
      return data.data?.keywords || [];
    },
    enabled: visible,
  });

  // 获取搜索建议
  const { data: suggestions = [] } = useQuery<string[]>({
    queryKey: ['search', 'suggest', query],
    queryFn: async () => {
      if (query.length < 2) return [];
      const res = await fetch(
        `https://chefchina-admin.vercel.app/api/search/suggest?q=${encodeURIComponent(query)}`
      );
      const data: SearchSuggestResponse = await res.json();
      return data.data?.suggestions?.map((s) => s.text) || [];
    },
    enabled: query.length >= 2,
  });

  // 加载搜索历史
  useEffect(() => {
    if (visible) {
      getSearchHistory().then(setHistory);
    }
  }, [visible]);

  // 执行搜索
  const handleSearch = async (keyword: string) => {
    if (!keyword.trim()) return;
    
    await saveSearchHistory(keyword);
    
    // 记录到后端
    try {
      await fetch('https://chefchina-admin.vercel.app/api/search/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword }),
      });
    } catch (e) {
      // 忽略错误
    }

    onClose();
    router.push(`/search-result?q=${encodeURIComponent(keyword)}`);
  };

  const handleClearHistory = async () => {
    await clearSearchHistory();
    setHistory([]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modal}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search-outline" size={18} color="#999" />
            <TextInput
              style={styles.modalInput}
              placeholder={t('common.search')}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => handleSearch(query)}
              autoFocus
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color="#BBB" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* 搜索建议 */}
          {suggestions && suggestions.length > 0 && (
            <View style={styles.section}>
              {suggestions.map((item: string, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => handleSearch(item)}
                >
                  <Ionicons name="search-outline" size={16} color="#999" />
                  <Text style={styles.suggestionText}>{item}</Text>
                  <Ionicons name="arrow-forward" size={16} color="#CCC" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 搜索历史 */}
          {!query && history.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('search.history')}</Text>
                <TouchableOpacity onPress={handleClearHistory}>
                  <Text style={[styles.clearBtn, { color: tintColor }]}>
                    {t('search.clearHistory')}
                  </Text>
                </TouchableOpacity>
              </View>
              {history.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.historyItem}
                  onPress={() => handleSearch(item)}
                >
                  <Ionicons name="time-outline" size={16} color="#999" />
                  <Text style={styles.historyText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 热门搜索 */}
          {!query && trendingData && trendingData.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('search.trending')}</Text>
              <View style={styles.tagWrap}>
                {trendingData.map((item: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.tag, { borderColor: tintColor }]}
                    onPress={() => handleSearch(item)}
                  >
                    <Text style={[styles.tagText, { color: tintColor }]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  modalInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  modalContent: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  clearBtn: {
    fontSize: 13,
    fontWeight: '500',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  historyText: {
    fontSize: 15,
    color: '#666',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
