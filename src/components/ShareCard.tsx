import React, { forwardRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ImageSourcePropType,
} from 'react-native';
import { useTranslation } from 'react-i18next';
// ⚠️ Requires `react-native-qrcode-svg`. If not installed, the share card falls
// back to a text-only URL block instead of a QR code.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let QRCode: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  QRCode = require('react-native-qrcode-svg').default;
} catch {
  QRCode = null;
}

import type { Recipe } from '../lib/api';

export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1920;

interface ShareCardProps {
  recipe: Recipe;
  deepLink: string;
  authorName?: string;
  authorAvatarUrl?: string;
  logo?: ImageSourcePropType;
}

/**
 * 1080 × 1920 long-share card rendered offscreen for capture via
 * `react-native-view-shot`. Do NOT place this inline in the tree — mount it
 * with absolute positioning + collapsable={false} outside the viewport so it
 * still renders to the native view graph.
 */
export const ShareCard = forwardRef<View, ShareCardProps>(
  ({ recipe, deepLink, authorName, authorAvatarUrl, logo }, ref) => {
    const { t } = useTranslation();

    return (
      <View ref={ref} collapsable={false} style={styles.card}>
        {/* Cover image (top 40%) */}
        <View style={styles.coverContainer}>
          <Image
            source={{ uri: recipe.cover_image }}
            style={styles.cover}
            resizeMode="cover"
          />
          <View style={styles.coverOverlay} />
        </View>

        {/* Body */}
        <View style={styles.body}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{recipe.category}</Text>
          </View>

          <Text style={styles.titleEn} numberOfLines={2}>
            {recipe.title}
          </Text>
          <Text style={styles.titleZh} numberOfLines={2}>
            {recipe.title_zh}
          </Text>

          <View style={styles.metaRow}>
            {recipe.cook_time > 0 && (
              <Text style={styles.metaItem}>⏱ {recipe.cook_time} min</Text>
            )}
            {recipe.servings > 0 && (
              <Text style={styles.metaItem}>🍽 {recipe.servings} servings</Text>
            )}
            {recipe.difficulty && (
              <Text style={styles.metaItem}>
                🔥 {recipe.difficulty.toUpperCase()}
              </Text>
            )}
          </View>

          {!!recipe.description && (
            <Text style={styles.description} numberOfLines={4}>
              {recipe.description}
            </Text>
          )}

          {authorName ? (
            <View style={styles.authorRow}>
              {authorAvatarUrl ? (
                <Image
                  source={{ uri: authorAvatarUrl }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>
                    {authorName.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.authorName}>
                {t('share.byAuthor', { name: authorName })}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Bottom branding */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            {logo ? (
              <Image source={logo} style={styles.logo} resizeMode="contain" />
            ) : (
              <View style={styles.logoFallback}>
                <Text style={styles.logoFallbackText}>CC</Text>
              </View>
            )}
            <View>
              <Text style={styles.footerBrand}>ChefChina</Text>
              <Text style={styles.footerTagline}>{t('share.cardTagline')}</Text>
            </View>
          </View>

          <View style={styles.qrWrap}>
            {QRCode ? (
              <QRCode
                value={deepLink}
                size={200}
                color="#1A1A1A"
                backgroundColor="#FFFFFF"
              />
            ) : (
              <View style={styles.qrFallback}>
                <Text style={styles.qrFallbackText} numberOfLines={3}>
                  {deepLink}
                </Text>
              </View>
            )}
            <Text style={styles.scanText}>{t('share.scanToCook')}</Text>
          </View>
        </View>
      </View>
    );
  },
);

ShareCard.displayName = 'ShareCard';

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    backgroundColor: '#FFFDF9',
  },
  coverContainer: {
    width: '100%',
    height: SHARE_CARD_HEIGHT * 0.4,
    backgroundColor: '#F5F2EE',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
    backgroundColor: 'rgba(255,253,249,0.0)',
  },
  body: {
    flex: 1,
    paddingHorizontal: 80,
    paddingTop: 60,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF0E8',
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginBottom: 28,
  },
  categoryText: {
    color: '#E85D26',
    fontSize: 26,
    fontWeight: '700',
  },
  titleEn: {
    fontSize: 74,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -1,
    lineHeight: 84,
  },
  titleZh: {
    fontSize: 56,
    fontWeight: '700',
    color: '#333',
    marginTop: 14,
    lineHeight: 66,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 36,
    marginTop: 40,
  },
  metaItem: {
    fontSize: 28,
    color: '#555',
    fontWeight: '600',
  },
  description: {
    marginTop: 40,
    fontSize: 30,
    color: '#666',
    lineHeight: 44,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 60,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F5F2EE',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E85D26',
  },
  avatarInitial: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '800',
  },
  authorName: {
    fontSize: 30,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 80,
    paddingVertical: 60,
    borderTopWidth: 2,
    borderTopColor: '#F0EDE8',
    backgroundColor: '#FFF8F1',
    gap: 40,
  },
  footerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  logo: {
    width: 96,
    height: 96,
  },
  logoFallback: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: '#E85D26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFallbackText: {
    color: '#FFF',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -2,
  },
  footerBrand: {
    fontSize: 40,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  footerTagline: {
    fontSize: 22,
    color: '#777',
    marginTop: 6,
  },
  qrWrap: {
    alignItems: 'center',
    gap: 12,
  },
  qrFallback: {
    width: 200,
    height: 200,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E85D26',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  qrFallbackText: {
    color: '#E85D26',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  scanText: {
    fontSize: 22,
    color: '#555',
    fontWeight: '600',
  },
});
