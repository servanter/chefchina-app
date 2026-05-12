import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function ShoppingListTab() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/shopping-list');
  }, []);
  return null;
}
