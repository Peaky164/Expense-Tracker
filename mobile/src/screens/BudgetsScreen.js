import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import {
  getBudgetProgress,
  createBudget,
  updateBudget,
  deleteBudget,
} from "../api/budgets";
import { getCategories } from "../api/categories";
import { saveOffline, loadOffline, isNetworkError } from "../storage/offline";
import { colors } from "../theme";

const OFFLINE_MSG = "You are offline. Connect to the internet to change budgets.";

function errorText(err) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((d) => d.msg).join("\n");
  }
  return "Something went wrong. Check your connection and try again.";
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(key, delta) {
  const [y, m] = key.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export default function BudgetsScreen() {
  const [progress, setProgress] = useState([]); // one item per budget in the selected month
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState(monthKey(new Date()));
  const [offline, setOffline] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null); // progress item being edited, or null
  const [limit, setLimit] = useState("");
  const [categoryId, setCategoryId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Ignore responses that arrive after a newer request was started
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const [p, c] = await Promise.all([
        getBudgetProgress(month),
        getCategories(),
      ]);
      if (id !== requestId.current) return;
      setProgress(p);
      setCategories(c);
      setOffline(false);
      saveOffline(`budgets-${month}`, p);
      saveOffline("categories", c);
    } catch (err) {
      if (id !== requestId.current) return;
      if (isNetworkError(err)) {
        // No connection: show the last saved copy for this month
        const cached = await loadOffline(`budgets-${month}`);
        const cachedCats = await loadOffline("categories");
        if (id !== requestId.current) return;
        setProgress(cached || []);
        if (cachedCats) setCategories(cachedCats);
        setOffline(true);
      } else {
        Alert.alert("Could not load data", errorText(err));
      }
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [month]);

  // Runs on focus, and again whenever the selected month changes
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const usedCategoryIds = progress.map((b) => b.category_id);
  const availableCategories = categories.filter(
    (c) => c.type === "expense" && !usedCategoryIds.includes(c.id)
  );

  const openAdd = () => {
    if (offline) {
      Alert.alert("Offline", OFFLINE_MSG);
      return;
    }
    setEditing(null);
    setLimit("");
    setCategoryId(null);
    setModalVisible(true);
  };

  const openEdit = (item) => {
    if (offline) {
      Alert.alert("Offline", OFFLINE_MSG);
      return;
    }
    setEditing(item);
    setLimit(String(item.limit_amount));
    setCategoryId(item.category_id);
    setModalVisible(true);
  };

  const handleSave = async () => {
    const value = Number(limit);
    if (!limit || Number.isNaN(value) || value <= 0) {
      Alert.alert("Invalid limit", "Enter a limit greater than 0.");
      return;
    }
    if (!editing && categoryId === null) {
      Alert.alert("Pick a category", "Choose a category for this budget.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateBudget(editing.budget_id, { limit_amount: value });
      } else {
        await createBudget({
          limit_amount: value,
          month,
          category_id: categoryId,
        });
      }
      setModalVisible(false);
      await load();
    } catch (err) {
      if (isNetworkError(err)) {
        Alert.alert("Offline", OFFLINE_MSG);
      } else {
        Alert.alert("Could not save", errorText(err));
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (item) => {
    if (offline) {
      Alert.alert("Offline", OFFLINE_MSG);
      return;
    }
    Alert.alert("Delete budget?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteBudget(item.budget_id);
            setProgress((prev) =>
              prev.filter((b) => b.budget_id !== item.budget_id)
            );
          } catch (err) {
            if (isNetworkError(err)) {
              Alert.alert("Offline", OFFLINE_MSG);
            } else {
              Alert.alert("Could not delete", errorText(err));
            }
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const pct = item.percent_used;
    // Gold normally, amber near the limit, red when reached or over
    const barColor =
      pct >= 100 ? colors.expense : pct >= 80 ? "#F59E0B" : colors.gold;
    const remaining = item.remaining;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openEdit(item)}
        onLongPress={() => confirmDelete(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>{item.category_name}</Text>
          <Text style={[styles.cardPct, { color: barColor }]}>
            {Math.round(pct)}%
          </Text>
        </View>
        <View style={styles.barBg}>
          <View
            style={[
              styles.barFill,
              { width: `${Math.min(pct, 100)}%`, backgroundColor: barColor },
            ]}
          />
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.cardSub}>
            ₹{item.spent.toFixed(2)} of ₹{Number(item.limit_amount).toFixed(2)}
          </Text>
          <Text
            style={[styles.cardSub, remaining < 0 && { color: colors.expense }]}
          >
            {remaining >= 0
              ? `₹${remaining.toFixed(2)} left`
              : `₹${Math.abs(remaining).toFixed(2)} over`}
          </Text>
        </View>
        <TouchableOpacity onPress={() => confirmDelete(item)}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.hint}>
          Loading… the server may take a minute to wake up.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View />
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {offline && (
        <Text style={styles.offlineBanner}>
          You are offline. Showing your last saved data.
        </Text>
      )}

      <View style={styles.monthRow}>
        <TouchableOpacity onPress={() => setMonth(shiftMonth(month, -1))}>
          <Text style={styles.arrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthText}>{monthLabel(month)}</Text>
        <TouchableOpacity onPress={() => setMonth(shiftMonth(month, 1))}>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={progress}
        keyExtractor={(item) => String(item.budget_id)}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          load();
        }}
        contentContainerStyle={progress.length === 0 && styles.emptyWrap}
        ListEmptyComponent={
          <Text style={styles.hint}>
            {offline
              ? "You are offline and no saved budgets for this month."
              : 'No budgets for this month. Tap "+ Add" to set one.'}
          </Text>
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.form}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>
              {editing ? "Edit budget" : "New budget"}
            </Text>
            <Text style={styles.hint}>{monthLabel(month)}</Text>

            <Text style={styles.label}>Category</Text>
            {editing ? (
              <Text style={styles.fixedValue}>{editing.category_name}</Text>
            ) : availableCategories.length === 0 ? (
              <Text style={styles.hint}>
                No expense categories left without a budget this month. Create
                one in the Categories tab.
              </Text>
            ) : (
              <View style={styles.chipWrap}>
                {availableCategories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.chip, categoryId === c.id && styles.chipActive]}
                    onPress={() => setCategoryId(c.id)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        categoryId === c.id && styles.chipTextActive,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>Monthly limit (₹)</Text>
            <TextInput
              style={styles.input}
              value={limit}
              onChangeText={setLimit}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
            />

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 22, fontWeight: "700", color: colors.gold },
  addBtn: {
    backgroundColor: colors.gold,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: "#000000", fontWeight: "700" },
  offlineBanner: {
    backgroundColor: colors.dark,
    color: colors.champagne,
    textAlign: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    paddingBottom: 8,
  },
  arrow: { fontSize: 32, paddingHorizontal: 12, color: colors.gold },
  monthText: {
    fontSize: 16,
    fontWeight: "600",
    minWidth: 150,
    textAlign: "center",
    color: colors.text,
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.antique,
    shadowColor: colors.gold,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between" },
  cardTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  cardPct: { fontSize: 14, fontWeight: "700" },
  barBg: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    marginVertical: 10,
    overflow: "hidden",
  },
  barFill: { height: 8, borderRadius: 4 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between" },
  cardSub: { fontSize: 12, color: colors.textSecondary },
  deleteText: { color: colors.expense, fontSize: 12, marginTop: 8 },
  emptyWrap: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  hint: { color: colors.textSecondary, marginTop: 8, textAlign: "center" },
  form: { padding: 16 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 6,
    color: colors.champagne,
  },
  fixedValue: { fontSize: 16, paddingVertical: 6, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.dark,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.card,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.dark,
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.text },
  chipTextActive: { color: "#000000", fontWeight: "700" },
  saveBtn: {
    backgroundColor: colors.gold,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 28,
  },
  saveBtnText: { color: "#000000", fontWeight: "700", fontSize: 16 },
  cancelBtn: { alignItems: "center", paddingVertical: 14 },
  cancelText: { color: colors.textSecondary },
});