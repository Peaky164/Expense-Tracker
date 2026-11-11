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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import {
  getTransactions,
  createTransaction,
  deleteTransaction,
} from "../api/transactions";
import { getCategories } from "../api/categories";

const PAYMENT_MODES = ["Cash", "UPI", "Card", "Other"];

function errorText(err) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((d) => d.msg).join("\n");
  }
  return "Something went wrong. Check your connection and try again.";
}

function formatDate(value) {
  if (!value) return "";
  // Backend may return a datetime without timezone; treat it as UTC
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : value + "Z";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [categoryId, setCategoryId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [txs, cats] = await Promise.all([
        getTransactions(),
        getCategories(),
      ]);
      // newest first
      txs.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(txs);
      setCategories(cats);
    } catch (err) {
      Alert.alert("Could not load data", errorText(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload every time the tab is focused (so new categories show up)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const categoryById = (id) => categories.find((c) => c.id === id);

  const openModal = () => {
    setAmount("");
    setDescription("");
    setPaymentMode("Cash");
    setCategoryId(null);
    setModalVisible(true);
  };

  const handleSave = async () => {
    const value = Number(amount);
    if (!amount || Number.isNaN(value) || value <= 0) {
      Alert.alert("Invalid amount", "Enter an amount greater than 0.");
      return;
    }
    if (categoryId === null) {
      Alert.alert("Pick a category", "Choose a category for this transaction.");
      return;
    }
    setSaving(true);
    try {
      await createTransaction({
        amount: value,
        description: description.trim() || null,
        payment_mode: paymentMode,
        category_id: categoryId,
      });
      setModalVisible(false);
      await load();
    } catch (err) {
      Alert.alert("Could not save", errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (item) => {
    Alert.alert("Delete transaction?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTransaction(item.id);
            setTransactions((prev) => prev.filter((t) => t.id !== item.id));
          } catch (err) {
            Alert.alert("Could not delete", errorText(err));
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const cat = categoryById(item.category_id);
    const isIncome = cat?.type === "income";
    return (
      <TouchableOpacity
        style={styles.row}
        onLongPress={() => confirmDelete(item)}
        activeOpacity={0.7}
      >
        <View style={styles.rowLeft}>
          <Text style={styles.rowTitle}>
            {item.description || cat?.name || "Transaction"}
          </Text>
          <Text style={styles.rowSub}>
            {cat?.name || "Unknown category"}
            {item.payment_mode ? ` • ${item.payment_mode}` : ""}
            {" • "}
            {formatDate(item.date)}
          </Text>
        </View>
        <View style={styles.rowRight}>
          <Text
            style={[styles.amount, { color: isIncome ? "#16a34a" : "#dc2626" }]}
          >
            {isIncome ? "+" : "-"}₹{Number(item.amount).toFixed(2)}
          </Text>
          <TouchableOpacity onPress={() => confirmDelete(item)}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.hint}>Loading… the server may take a minute to wake up.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openModal}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          load();
        }}
        contentContainerStyle={transactions.length === 0 && styles.emptyWrap}
        ListEmptyComponent={
          <Text style={styles.hint}>
            No transactions yet. Tap "+ Add" to create one.
          </Text>
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.container}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.form}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.title}>New transaction</Text>

              <Text style={styles.label}>Amount (₹)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />

              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Lunch"
              />

              <Text style={styles.label}>Payment mode</Text>
              <View style={styles.chipWrap}>
                {PAYMENT_MODES.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.chip, paymentMode === m && styles.chipActive]}
                    onPress={() => setPaymentMode(m)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        paymentMode === m && styles.chipTextActive,
                      ]}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Category</Text>
              {categories.length === 0 ? (
                <Text style={styles.hint}>
                  No categories yet. Create one in the Categories tab first.
                </Text>
              ) : (
                <View style={styles.chipWrap}>
                  {categories.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.chip,
                        categoryId === c.id && styles.chipActive,
                      ]}
                      onPress={() => setCategoryId(c.id)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          categoryId === c.id && styles.chipTextActive,
                        ]}
                      >
                        {c.name} ({c.type})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>
                  {saving ? "Saving…" : "Save"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  rowLeft: { flex: 1, paddingRight: 12 },
  rowRight: { alignItems: "flex-end" },
  rowTitle: { fontSize: 16, fontWeight: "600" },
  rowSub: { fontSize: 12, color: "#666", marginTop: 2 },
  amount: { fontSize: 16, fontWeight: "700" },
  deleteText: { color: "#dc2626", fontSize: 12, marginTop: 4 },
  emptyWrap: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  hint: { color: "#666", marginTop: 8, textAlign: "center" },
  form: { padding: 16 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 16, marginBottom: 6 },
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