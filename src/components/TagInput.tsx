import React, { useMemo, useState } from 'react'
import type { TextInputKeyPressEventData, NativeSyntheticEvent } from 'react-native'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { Tag } from '@/lib/api'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions?: Tag[]
  maxTags?: number
  placeholder?: string
}

const normalizeTag = (value: string) =>
  value.trim().replace(/^#/, '').replace(/\s+/g, ' ')

export default function TagInput({
  value,
  onChange,
  suggestions = [],
  maxTags = 10,
  placeholder = 'Add tags',
}: TagInputProps) {
  const [input, setInput] = useState('')

  const normalizedValue = useMemo(
    () => value.map(normalizeTag).filter(Boolean),
    [value]
  )

  const addTag = (raw: string) => {
    const tag = normalizeTag(raw)
    if (!tag) return
    if (normalizedValue.some((item) => item.toLowerCase() === tag.toLowerCase())) {
      setInput('')
      return
    }
    if (normalizedValue.length >= maxTags) return
    onChange([...normalizedValue, tag])
    setInput('')
  }

  const removeTag = (tag: string) => {
    onChange(normalizedValue.filter((item) => item.toLowerCase() !== tag.toLowerCase()))
  }

  const filteredSuggestions = useMemo(() => {
    const keyword = normalizeTag(input).toLowerCase()
    return suggestions
      .filter((tag) => {
        const label = tag.label.toLowerCase()
        const labelZh = tag.label_zh.toLowerCase()
        const used = normalizedValue.some(
          (item) => item.toLowerCase() === label || item.toLowerCase() === labelZh
        )
        if (used) return false
        if (!keyword) return false
        return label.includes(keyword) || labelZh.includes(keyword)
      })
      .slice(0, 6)
  }, [input, normalizedValue, suggestions])

  const commitInput = () => {
    const parts = input
      .split(',')
      .map(normalizeTag)
      .filter(Boolean)

    if (!parts.length) return

    let next = [...normalizedValue]
    for (const part of parts) {
      if (next.length >= maxTags) break
      if (next.some((item) => item.toLowerCase() === part.toLowerCase())) continue
      next.push(part)
    }
    onChange(next)
    setInput('')
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.inputWrap}>
        <View style={styles.tagsWrap}>
          {normalizedValue.map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagText}>#{tag}</Text>
              <TouchableOpacity onPress={() => removeTag(tag)} hitSlop={8}>
                <Ionicons name="close" size={14} color="#7A4B2A" />
              </TouchableOpacity>
            </View>
          ))}

          {normalizedValue.length < maxTags && (
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={placeholder}
              placeholderTextColor="#A89A8E"
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={commitInput}
              onBlur={commitInput}
              onKeyPress={(
                event: NativeSyntheticEvent<TextInputKeyPressEventData>
              ) => {
                if (event.nativeEvent.key === ',') commitInput()
              }}
            />
          )}
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.helperText}>{normalizedValue.length}/{maxTags}</Text>
      </View>

      {filteredSuggestions.length > 0 && (
        <View style={styles.suggestionsWrap}>
          {filteredSuggestions.map((tag) => (
            <TouchableOpacity
              key={tag.id}
              style={styles.suggestionChip}
              onPress={() => addTag(tag.label_zh || tag.label)}
            >
              <Text style={styles.suggestionText}>#{tag.label_zh || tag.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  inputWrap: {
    borderWidth: 1,
    borderColor: '#E7DDD3',
    borderRadius: 16,
    backgroundColor: '#FFF8F3',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFE9DA',
    borderColor: '#F4C9A8',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    color: '#7A4B2A',
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    minWidth: 120,
    flexGrow: 1,
    paddingVertical: 6,
    fontSize: 14,
    color: '#2B2118',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  helperText: {
    fontSize: 12,
    color: '#8A7B70',
  },
  suggestionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F5F2EE',
  },
  suggestionText: {
    fontSize: 12,
    color: '#5E544C',
    fontWeight: '500',
  },
})
