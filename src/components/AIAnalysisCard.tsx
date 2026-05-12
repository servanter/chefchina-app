// src/components/AIAnalysisCard.tsx
// AI 分析结果展示卡片

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AIAnalysisResult } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';

interface AIAnalysisCardProps {
  analysis: AIAnalysisResult;
  onClose?: () => void;
}

export const AIAnalysisCard: React.FC<AIAnalysisCardProps> = ({
  analysis,
  onClose,
}) => {
  const { colors } = useTheme();
  const [modificationsExpanded, setModificationsExpanded] = useState(false);

  // 根据适配度评分确定颜色
  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#4CAF50'; // 绿色：非常适合
    if (score >= 60) return '#8BC34A'; // 浅绿：比较适合
    if (score >= 40) return '#FF9800'; // 橙色：一般
    return '#F44336'; // 红色：不太适合
  };

  const scoreColor = getScoreColor(analysis.matchScore);

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={24} color="#FFB800" />
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            AI 适配分析
          </Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.subText} />
          </TouchableOpacity>
        )}
      </View>

      {/* 适配度评分 - 简化版圆形显示 */}
      <View style={styles.scoreSection}>
        <View
          style={[
            styles.scoreCircle,
            {
              borderColor: scoreColor,
              backgroundColor: `${scoreColor}10`,
            },
          ]}
        >
          <Text style={[styles.scoreValue, { color: scoreColor }]}>
            {analysis.matchScore}
          </Text>
          <Text style={[styles.scoreLabel, { color: colors.subText }]}>
            分
          </Text>
        </View>
        <View style={styles.scoreBar}>
          <View
            style={[
              styles.scoreBarFill,
              {
                width: `${analysis.matchScore}%`,
                backgroundColor: scoreColor,
              },
            ]}
          />
        </View>
      </View>

      {/* 总结 */}
      <View style={[styles.section, { borderTopColor: colors.border }]}>
        <Text style={[styles.summary, { color: colors.text }]}>
          {analysis.summary}
        </Text>
      </View>

      {/* 优点列表 */}
      {analysis.pros.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              优点
            </Text>
          </View>
          {analysis.pros.map((pro, index) => (
            <View key={index} style={styles.listItem}>
              <View style={[styles.listDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={[styles.listText, { color: colors.text }]}>
                {pro}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* 缺点列表 */}
      {analysis.cons.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle" size={18} color="#FF9800" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              需要注意
            </Text>
          </View>
          {analysis.cons.map((con, index) => (
            <View key={index} style={styles.listItem}>
              <View style={[styles.listDot, { backgroundColor: '#FF9800' }]} />
              <Text style={[styles.listText, { color: colors.text }]}>
                {con}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* 改良建议 - 折叠面板 */}
      {analysis.modifications.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => setModificationsExpanded(!modificationsExpanded)}
          >
            <View style={styles.sectionHeader}>
              <Ionicons name="bulb" size={18} color="#2196F3" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                改良建议
              </Text>
            </View>
            <Ionicons
              name={modificationsExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.subText}
            />
          </TouchableOpacity>

          {modificationsExpanded && (
            <View style={styles.collapsibleContent}>
              {analysis.modifications.map((mod, index) => (
                <View key={index} style={styles.listItem}>
                  <View
                    style={[styles.listDot, { backgroundColor: '#2196F3' }]}
                  />
                  <Text style={[styles.listText, { color: colors.text }]}>
                    {mod}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeBtn: {
    padding: 4,
  },
  scoreSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: -4,
  },
  scoreBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E8E4DF',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  section: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E4DF',
  },
  summary: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  listDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    marginRight: 10,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  collapsibleContent: {
    marginTop: 12,
  },
});
