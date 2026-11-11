import React, { useCallback, useState } from "react";
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
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
} from "../api/budgets";
import { getCategories } from "../api/categories";
import { getTransactions } from "../api/transactions";

function errorText(err) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((d) => d.msg).join("\n");
  }
  return "Something went wrong. Check your connection and try again.";
}

function parseDate(value) {
  // Backend may return a datetime without timezone; treat it as UTC
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : value + "Z";
  return new Date(iso);
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
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState(monthKey(new Date()));

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null); // budget being edited, or null
  const [limit, setLimit] = useState("");
  const [categoryId, setCategoryId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [b, c, t] = await Promise.all([
        getBudgets(),
        getCategories(),
        getTransactions(),
      ]);
      setBudgets(b);
      setCategories(c);
      setTransactions(t);
    } catch (err) {
      Alert.alert("Could not load data", errorText(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const categoryById = (id) => categories.find((c) => c.id === id);

  // spent per category in the selected month
  const spentByCategory = {};
  for (const t of transactions) {
    if (monthKey(parseDate(t.date)) !== month) continue;
    spentByCategory[t.category_id] =
      (spentByCategory[t.category_id] || 0) + Number(t.amount);
  }

  const monthBudgets = budgets.filter((b) => b.month === month);
  const usedCategoryIds = monthBudgets.map((b) => b.category_id);
  const availableCategories = categories.filter(
    (c) => c.type === "expense" && !usedCategoryIds.includes(c.id)
  );

  const openAdd = () => {
    setEditing(null);
    setLimit("");
    setCategoryId(null);
    setModalVisible(true);
  };

  const openEdit = (budget) => {
    setEditing(budget);
    setLimit(String(budget.limit_amount));
    setCategoryId(budget.category_id);
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
        await updateBudget(editing.id, { limit_amount: value });
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
      Alert.alert("Could not save", errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (budget) => {
    Alert.alert("Delete budget?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteBudget(budget.id);
            setBudgets((prev) => prev.filter((b) => b.id !== budget.id));
          } catch (err) {
            Alert.alert("Could not delete", errorText(err));
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const cat = categoryById(item.category_id);
    const spent = spentByCategory[item.category_id] || 0;
    const pct = item.limit_amount > 0 ? (spent / item.limit_amount) * 100 : 0;
    const barColor = pct >= 100 ? "#dc2626" : pct >= 80 ? "#f59e0b" : "#16a34a";
    const remaining = item.limit_amount - spent;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openEdit(item)}
        onLongPress={() => confirmDelete(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>{cat?.name || "Unknown category"}</Text>
          <Text style={styles.cardPct}>{Math.round(pct)}%</Text>
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
            ₹{spent.toFixed(2)} of ₹{Number(item.limit_amount).toFixed(2)}
          </Text>
          <Text style={[styles.cardSub, remaining < 0 && { color: "#dc2626" }]}>
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
        <ActivityIndicator size="large" />
        <Text style={styles.hint}>
          Loading… the server may take a minute to wake up.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Budgets</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

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
        data={monthBudgets}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          load();
        }}
        contentContainerStyle={monthBudgets.length === 0 && styles.emptyWrap}
        ListEmptyComponent={
          <Text style={styles.hint}>
            No budgets for this month. Tap "+ Add" to set one.
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
              <Text style={styles.fixedValue}>
                {categoryById(editing.category_id)?.name || "Unknown"}
              </Text>
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
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 22, fontWeight: "700" },
  addBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: { color: "#fff", fontWeight: "600" },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    paddingBottom: 8,
  },
  arrow: { fontSize: 32, paddingHorizontal: 12, color: "#2563eb" },
  monthText: { fontSize: 16, fontWeight: "600", minWidth: 150, textAlign: "center" },
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between" },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardPct: { fontSize: 14, fontWeight: "600", color: "#444" },
  barBg: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    marginVertical: 10,
    overflow: "hidden",
  },
  barFill: { height: 8, borderRadius: 4 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between" },
  cardSub: { fontSize: 12, color: "#666" },
  deleteText: { color: "#dc2626", fontSize: 12, marginTop: 8 },
  emptyWrap: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  hint: { color: "#666", marginTop: 8, textAlign: "center" },
  form: { padding: 16 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 16, marginBottom: 6 },
  fixedValue: { fontSize: 16, paddingVertical: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  chipText: { color: "#333" },
  chipTextActive: { color: "#fff" },
  saveBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 28,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cancelBtn: { alignItems: "center", paddingVertical: 14 },
  cancelText: { color: "#666" },
});