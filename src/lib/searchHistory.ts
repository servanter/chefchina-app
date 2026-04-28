import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = 'search_history';
const MAX_LOCAL_HISTORY = 10;

export async function getLocalHistory(): Promise<string[]> {
  try {
    const json = await AsyncStorage.getItem(HISTORY_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function addLocalHistory(query: string): Promise<void> {
  try {
    const history = await getLocalHistory();
    const updated = [query, ...history.filter(q => q !== query)]
      .slice(0, MAX_LOCAL_HISTORY);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save search history:', error);
  }
}

export async function removeLocalHistory(query: string): Promise<void> {
  try {
    const history = await getLocalHistory();
    const updated = history.filter(q => q !== query);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to remove search history:', error);
  }
}

export async function clearLocalHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error('Failed to clear search history:', error);
  }
}
