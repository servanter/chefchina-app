/**
 * 添加食材弹窗
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

import { useAddShoppingListItem } from '../src/hooks/useShoppingList';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const COMMON_UNITS = ['g', 'kg', 'ml', 'L', '个', '瓶', '包', '袋', '适量', '少许'];

export default function AddIngredientModal({ visible, onClose }: Props) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('g');

  const addMutation = useAddShoppingListItem();

  const handleAdd = () => {
    // 验证
    if (!name.trim()) {
      Alert.alert('提示', '请输入食材名称');
      return;
    }

    // 适量/少许 不需要数量
    if (unit === '适量' || unit === '少许') {
      addMutation.mutate(
        { name: name.trim(), amount: 0, unit },
        {
          onSuccess: () => {
            setName('');
            setAmount('');
            setUnit('g');
            onClose();
          },
          onError: (error: any) => {
            Alert.alert('添加失败', error.message || '请稍后重试');
          },
        }
      );
      return;
    }

    // 验证数量
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('提示', '请输入有效的数量');
      return;
    }

    addMutation.mutate(
      { name: name.trim(), amount: amountNum, unit },
      {
        onSuccess: () => {
          setName('');
          setAmount('');
          setUnit('g');
          onClose();
        },
        onError: (error: any) => {
          Alert.alert('添加失败', error.message || '请稍后重试');
        },
      }
    );
  };

  const handleClose = () => {
    setName('');
    setAmount('');
    setUnit('g');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>添加食材</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            {/* 食材名称 */}
            <View style={styles.field}>
              <Text style={styles.label}>食材名称</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="例如：鸡胸肉"
                placeholderTextColor="#999"
                autoFocus
              />
            </View>

            {/* 数量 */}
            {unit !== '适量' && unit !== '少许' && (
              <View style={styles.field}>
                <Text style={styles.label}>数量</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="例如：200"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>
            )}

            {/* 单位 */}
            <View style={styles.field}>
              <Text style={styles.label}>单位</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={unit}
                  onValueChange={(value) => setUnit(value)}
                  style={styles.picker}
                >
                  {COMMON_UNITS.map((u) => (
                    <Picker.Item key={u} label={u} value={u} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.addButton]}
              onPress={handleAdd}
              disabled={addMutation.isPending}
            >
              <Text style={styles.addButtonText}>
                {addMutation.isPending ? '添加中...' : '添加'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modal: {
    width: '85%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  form: {
    marginBottom: 20,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  addButton: {
    backgroundColor: '#FF6B6B',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
