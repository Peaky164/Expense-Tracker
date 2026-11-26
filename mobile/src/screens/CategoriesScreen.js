import { useCallback, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getCategories,
  createCategory,
  deleteCategory,
  updateCategory,
} from '../api/categories';
import { saveOffline, loadOffline, isNetworkError } from '../storage/offline';
import { colors } from '../theme';

const OFFLINE_MSG = 'You are offline. Connect to the internet to change categories.';

export default function CategoriesScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [type, setType] = useState('expense');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [offline, setOffline] = useState(false);

  const load = async () => {
    try {
      const data = await getCategories();
      setItems(data);
      setOffline(false);
      setError('');
      saveOffline('categories', data);
    } catch (e) {
      if (isNetworkError(e)) {
        // No connection: show the last saved copy
        const cached = await loadOffline('categories');
        if (cached) {
          setItems(cached);
        } else {
          setError('You are offline and nothing is saved yet.');
        }
        setOffline(true);
      } else {
        setError('Could not load categories.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Reload every time this tab is opened
  useFocusEffect(useCallback(() => { load(); }, []));

  const save = async () => {
    if (!name.trim()) return;
    setError('');
    try {
      if (editingId) {
        await updateCategory(editingId, name.trim());
      } else {
        await createCategory(name.trim(), type);
      }
      setName('');
      setEditingId(null);
      await load();
    } catch (e) {
      if (isNetworkError(e)) {
        setError(OFFLINE_MSG);
      } else {
        setError(e.response?.data?.detail?.toString() || 'Could not save category.');
      }
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setName(item.name);
    setType(item.type);
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setError('');
  };

  const confirmDelete = (item) => {
    Alert.alert('Delete category', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCategory(item.id);
            if (editingId === item.id) cancelEdit();
            await load();
          } catch (e) {
            if (isNetworkError(e)) {
              setError(OFFLINE_MSG);
            } else {
              setError(e.response?.data?.detail?.toString() || 'Could not delete category.');
            }
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {offline && (
        <Text style={styles.offlineBanner}>
          You are offline. Showing your last saved data.
        </Text>
      )}
      <TextInput
        style={styles.input}
        placeholder="New category name"
        placeholderTextColor={colors.textSecondary}
        value={name}
        onChangeText={setName}
      />
      <View style={styles.row}>
        {['expense', 'income'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, type === t && styles.chipActive]}
            onPress={() => !editingId && setType(t)}
          >
            <Text style={type === t ? styles.chipTextActive : styles.chipText}>{t}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.addBtn} onPress={save}>
          <Text style={styles.addText}>{editingId ? 'Save' : 'Add'}</Text>
        </TouchableOpacity>
      </View>
      {editingId ? (
        <TouchableOpacity onPress={cancelEdit}>
          <Text style={styles.cancelEdit}>Cancel editing</Text>
        </TouchableOpacity>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        ListEmptyComponent={<Text style={styles.empty}>No categories yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => startEdit(item)}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text
                style={[
                  styles.itemType,
                  { color: item.type === 'income' ? colors.income : colors.expense },
                ]}
              >
                {item.type}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => confirmDelete(item)}>
              <Text style={styles.delete}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.background },
  offlineBanner: {
    backgroundColor: colors.dark,
    color: colors.champagne,
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.dark,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    color: colors.text,
    backgroundColor: colors.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  chip: {
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  chipActive: { backgroundColor: colors.gold },
  chipText: { color: colors.gold },
  chipTextActive: { color: '#000000', fontWeight: '700' },
  addBtn: {
    marginLeft: 'auto',
    backgroundColor: colors.gold,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  addText: { color: '#000000', fontWeight: '700' },
  error: { color: colors.expense, marginBottom: 8 },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: 24 },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.dark,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    shadowColor: colors.gold,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  itemName: { fontSize: 16, color: colors.text },
  itemType: { fontSize: 13 },
  delete: { color: colors.expense, fontSize: 15 },
  cancelEdit: { color: colors.champagne, marginBottom: 8 },
});