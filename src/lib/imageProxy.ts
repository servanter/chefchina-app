/**
 * 图片代理工具
 * 
 * 解决外部图片 CORS 跨域问题
 */

const PROXY_ENABLED_DOMAINS = [
  'i.pravatar.cc',
  'images.unsplash.com',
  'source.unsplash.com',
];

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://chefchina-admin.vercel.app';

/**
 * 判断 URL 是否需要代理
 */
export function shouldProxyImage(url: string | null | undefined): boolean {
  if (!url) return false;
  
  try {
    const parsed = new URL(url);
    return PROXY_ENABLED_DOMAINS.some(domain => 
      parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

/**
 * 获取代理后的图片 URL
 */
export function getProxiedImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  if (!shouldProxyImage(url)) {
    return url;
  }
  
  return `${API_BASE_URL}/api/image/proxy?url=${encodeURIComponent(url)}`;
}

/**
 * 处理图片 URL（自动判断是否需要代理）
 */
export function processImageUrl(url: string | null | undefined): string | null {
  return getProxiedImageUrl(url);
}
