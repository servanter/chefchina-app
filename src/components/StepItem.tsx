import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Step } from '../lib/api';
import { LazyImage } from './LazyImage';

interface StepItemProps {
  step: Step;
  isZh?: boolean;
  /** 可选：点击步骤图片时触发（通常用于打开全屏 ImageViewer） */
  onImagePress?: (uri: string) => void;
}

export const StepItem: React.FC<StepItemProps> = ({ step, isZh = false, onImagePress }) => {
  const description = isZh ? step.description_zh : step.description;
  const images = Array.isArray(step.image)
    ? step.image.filter(Boolean)
    : step.image
      ? [step.image]
      : [];

  return (
    <View style={styles.container}>
      <View style={styles.numberCol}>
        <View style={styles.numberBubble}>
          <Text style={styles.numberText}>{step.order}</Text>
        </View>
        <View style={styles.connector} />
      </View>
      <View style={styles.content}>
        <Text style={styles.description}>{description}</Text>
        {images.length > 0 ? (
          <View style={styles.imageList}>
            {images.map((uri, index) => {
              const imageNode = <LazyImage uri={uri} style={styles.stepImage} />;
              return onImagePress ? (
                <TouchableOpacity
                  key={`${step.order}-${index}-${uri}`}
                  activeOpacity={0.9}
                  onPress={() => onImagePress(uri)}
                >
                  {imageNode}
                </TouchableOpacity>
              ) : (
                <View key={`${step.order}-${index}-${uri}`}>
                  {imageNode}
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  numberCol: {
    alignItems: 'center',
    width: 36,
    marginRight: 12,
  },
  numberBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E85D26',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  numberText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  connector: {
    flex: 1,
    width: 2,
    backgroundColor: '#F0EDE8',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#1A1A1A',
    lineHeight: 22,
    marginTop: 4,
  },
  imageList: {
    marginTop: 10,
    gap: 10,
  },
  stepImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
});
