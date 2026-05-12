import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function AIGenerateTab() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/ai-generate');
  }, []);
  return null;
}
