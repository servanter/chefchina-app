import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  description,
  action,
  actionText,
  onAction,
}) => {
  const resolvedSubtitle = subtitle ?? description;
  const resolvedAction = action ?? (actionText && onAction ? { label: actionText, onPress: onAction } : undefined);
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={80} color="#CCC" />
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {resolvedSubtitle && (
        <Text style={[styles.subtitle, { color: colors.subText }]}> 
          {resolvedSubtitle}
        </Text>
      )}
      {resolvedAction && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.tint }]}
          onPress={resolvedAction.onPress}
        >
          <Text style={styles.buttonText}>{resolvedAction.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
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
