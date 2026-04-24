import AsyncStorage from '@react-native-async-storage/async-storage'

const SEARCH_HISTORY_KEY = '@search_history'
const MAX_HISTORY_ITEMS = 10

/**
 * REQ-5.1: 搜索优化 - 本地搜索历史管理
 */

export const getSearchHistory = async (): Promise<string[]> => {
  try {
    const history = await AsyncStorage.getItem(SEARCH_HISTORY_KEY)
    return history ? JSON.parse(history) : []
  } catch (error) {
    console.error('Failed to load search history:', error)
    return []
  }
}

export const addSearchHistory = async (query: string): Promise<void> => {
  try {
    const trimmed = query.trim()
    if (!trimmed) return

    const history = await getSearchHistory()
    
    // 移除重复项（如果存在）
    const filtered = history.filter(item => item !== trimmed)
    
    // 添加到开头
    const updated = [trimmed, ...filtered].slice(0, MAX_HISTORY_ITEMS)
    
    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Failed to save search history:', error)
  }
}

export const clearSearchHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SEARCH_HISTORY_KEY)
  } catch (error) {
    console.error('Failed to clear search history:', error)
  }
}

export const removeSearchHistoryItem = async (query: string): Promise<void> => {
  try {
    const history = await getSearchHistory()
    const updated = history.filter(item => item !== query)
    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Failed to remove search history item:', error)
  }
}
