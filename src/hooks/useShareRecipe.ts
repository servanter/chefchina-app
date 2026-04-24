import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import { recordShare, Recipe } from '../lib/api';
import { getUserId } from '../lib/storage';

// Dynamic requires so the app still builds if these peer deps are not yet
// installed. The hook returns `shareAvailable: false` when this is the case.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let captureRef: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  captureRef = require('react-native-view-shot').captureRef;
} catch {
  captureRef = null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Sharing: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Sharing = require('expo-sharing');
} catch {
  Sharing = null;
}

export const DEFAULT_WEB_SHARE_BASE =
  'https://chefchina.app/s'; // swap for env-driven value in production

interface CaptureAndShareParams {
  recipe: Recipe;
  cardRef: RefObject<View | null>;
  /** Channel label used for analytics (wechat/instagram/copy/other). */
  channel?: string;
}

export interface UseShareRecipeResult {
  captureAndShare: (params: CaptureAndShareParams) => Promise<boolean>;
  sharing: boolean;
  shareAvailable: boolean;
  buildDeepLink: (recipeId: string) => string;
  buildWebLink: (recipeId: string) => string;
}

export function useShareRecipe(): UseShareRecipeResult {
  const [sharing, setSharing] = useState(false);
  const shareAvailable = !!captureRef && !!Sharing;

  const buildDeepLink = useCallback(
    (recipeId: string) => `chefchina://recipe/${recipeId}`,
    [],
  );
  const buildWebLink = useCallback(
    (recipeId: string) => `${DEFAULT_WEB_SHARE_BASE}/${recipeId}`,
    [],
  );

  const captureAndShare = useCallback(
    async ({ recipe, cardRef, channel = 'other' }: CaptureAndShareParams) => {
      if (!shareAvailable) {
        console.warn(
          '[useShareRecipe] Missing peer deps — install react-native-view-shot and expo-sharing to enable sharing.',
        );
        return false;
      }
      if (!cardRef.current) {
        console.warn('[useShareRecipe] cardRef is not attached yet.');
        return false;
      }

      setSharing(true);
      try {
        const uri: string = await captureRef(cardRef.current, {
          format: 'png',
          quality: 1,
          result: 'tmpfile',
        });

        const canShare = (await Sharing.isAvailableAsync?.()) ?? true;
        if (!canShare) {
          console.warn('[useShareRecipe] Sharing not available on this device.');
          return false;
        }

        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: recipe.title,
          UTI: Platform.OS === 'ios' ? 'public.png' : undefined,
        });

        // Best-effort analytics
        try {
          const userId = await getUserId();
          await recordShare({
            recipeId: recipe.id,
            userId: userId && userId !== 'guest' ? userId : null,
            channel,
          });
        } catch {
          // ignore analytics failures
        }

        return true;
      } catch (err) {
        console.warn('[useShareRecipe] capture/share failed', err);
        return false;
      } finally {
        setSharing(false);
      }
    },
    [shareAvailable],
  );

  return {
    captureAndShare,
    sharing,
    shareAvailable,
    buildDeepLink,
    buildWebLink,
  };
}
