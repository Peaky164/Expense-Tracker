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
  updateTransaction,
} from "../api/transactions";
import { getCategories } from "../api/categories";
import { saveOffline, loadOffline, isNetworkError } from "../storage/offline";
import { flushPending, addPending, getPending } from "../storage/pendingQueue";
import { parseSms } from "../smsParser";

const PAYMENT_MODES = ["Cash", "UPI", "Card", "Other"];
const PAGE_SIZE = 20;

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null); // transaction being edited, or null
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [categoryId, setCategoryId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [smsVisible, setSmsVisible] = useState(false);
  const [smsText, setSmsText] = useState("");
  const [smsDate, setSmsDate] = useState(null);
  const [smsType, setSmsType] = useState(null);

  // Loads page 1 (server returns newest first)
  const load = useCallback(async () => {
    try {
      // Upload anything that was saved while offline, then load fresh data
      await flushPending();
      setPending(await getPending());
      const [txs, cats] = await Promise.all([
        getTransactions(0, PAGE_SIZE),
        getCategories(),
      ]);
      setTransactions(txs);
      setCategories(cats);
      setHasMore(txs.length === PAGE_SIZE);
      setOffline(false);
      saveOffline("transactions", txs);
      saveOffline("categories", cats);
    } catch (err) {
      if (isNetworkError(err)) {
        // No connection: show the last saved copy instead of an error
        const cachedTxs = await loadOffline("transactions");
        const cachedCats = await loadOffline("categories");
        if (cachedTxs && cachedCats) {
          setTransactions(cachedTxs);
          setCategories(cachedCats);
          setHasMore(false);
          setOffline(true);
        } else {
          Alert.alert("Could not load data", errorText(err));
        }
      } else {
        Alert.alert("Could not load data", errorText(err));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMore = async () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      const next = await getTransactions(transactions.length, PAGE_SIZE);
      setTransactions((prev) => [...prev, ...next]);
      setHasMore(next.length === PAGE_SIZE);
    } catch (err) {
      Alert.alert("Could not load more", errorText(err));
    } finally {
      setLoadingMore(false);
    }
  };

  // Reload every time the tab is focused (so new categories show up)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const categoryById = (id) => categories.find((c) => c.id === id);

  const openAdd = () => {
    setEditing(null);
    setSmsDate(null);
    setSmsType(null);
    setAmount("");
    setDescription("");
    setPaymentMode("Cash");
    setCategoryId(null);
    setModalVisible(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setSmsDate(null);
    setSmsType(null);
    setAmount(String(item.amount));
    setDescription(item.description || "");
    setPaymentMode(item.payment_mode || "Cash");
    setCategoryId(item.category_id);
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
      const payload = {
        amount: value,
        description: description.trim() || null,
        payment_mode: paymentMode,
        category_id: categoryId,
      };
      if (!editing && smsDate) payload.date = smsDate;
      if (editing) {
        await updateTransaction(editing.id, payload);
      } else {
        await createTransaction(payload);
      }
      setModalVisible(false);
      await load();
    } catch (err) {
      if (!editing && isNetworkError(err)) {
        // No connection: keep it on the phone and upload later
        await addPending({
          date: smsDate || undefined,
          amount: value,
          description: description.trim() || null,
          payment_mode: paymentMode,
          category_id: categoryId,
        });
        setPending(await getPending());
        setModalVisible(false);
        Alert.alert(
          "Saved offline",
          "It will upload automatically when you are back online."
        );
      } else {
        Alert.alert("Could not save", errorText(err));
      }
    } finally {
      setSaving(false);
    }
  };

  const openSms = () => {
    setSmsText("");
    setSmsVisible(true);
  };

  const handleUseSms = () => {
    const parsed = parseSms(smsText);
    setSmsVisible(false);
    if (!parsed) {
      Alert.alert("Could not understand this message", "Opening the normal form.");
      openAdd();
      return;
    }
    setEditing(null);
    setSmsDate(parsed.date);
    setSmsType(parsed.type);
    setAmount(String(parsed.amount));
    setDescription(parsed.description);
    setPaymentMode(parsed.paymentMode || "Cash");
    setCategoryId(null);
    setModalVisible(true);
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
        onPress={() => openEdit(item)}
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
        <Text style={styles.hint}>
          Loading… the server may take a minute to wake up.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.smsBtn} onPress={openSms}>
        <Text style={styles.smsBtnText}>Paste SMS</Text>
      </TouchableOpacity>

      <Modal
        visible={smsVisible}
        animationType="slide"
        onRequestClose={() => setSmsVisible(false)}
      >
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Paste bank SMS</Text>
            <Text style={styles.hint}>
              Copy the SMS from your messages app and paste it here.
            </Text>
            <TextInput
              style={[styles.input, { height: 140, textAlignVertical: "top", marginTop: 16 }]}
              value={smsText}
              onChangeText={setSmsText}
              multiline
              placeholder="Paste SMS here"
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleUseSms}>
              <Text style={styles.saveBtnText}>Fill form</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setSmsVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <FlatList
        data={transactions}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={{ margin: 16 }} /> : null
        }
        ListHeaderComponent={
          <View>
            {offline && (
              <Text style={styles.offlineBanner}>
                You are offline. Showing your last saved data.
              </Text>
            )}
            {pending.map((p) => {
              const pc = categoryById(p.category_id);
              const pIncome = pc?.type === "income";
              return (
                <View key={p.localId} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowTitle}>
                      {p.description || pc?.name || "Transaction"}
                    </Text>
                    <Text style={styles.rowSub}>
                      {pc?.name || "Unknown category"} • Waiting to upload
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.amount,
                      { color: pIncome ? "#16a34a" : "#dc2626" },
                    ]}
                  >
                    {pIncome ? "+" : "-"}₹{Number(p.amount).toFixed(2)}
                  </Text>
                </View>
              );
            })}
          </View>
        }
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          load();
        }}
        contentContainerStyle={
          transactions.length === 0 && pending.length === 0 && !offline
            ? styles.emptyWrap
            : undefined
        }
        ListEmptyComponent={
          pending.length === 0 ? (
            <Text style={styles.hint}>
              No transactions yet. Tap "+ Add" to create one.
            </Text>
          ) : null
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
              <Text style={styles.title}>
                {editing ? "Edit transaction" : "New transaction"}
              </Text>

              {smsDate ? (
                <Text style={styles.hint}>Date from SMS: {formatDate(smsDate)}</Text>
              ) : null}
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
                  {(smsType && categories.some((c) => c.type === smsType)
                    ? categories.filter((c) => c.type === smsType)
                    : categories
                  ).map((c) => (
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
  offlineBanner: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
    textAlign: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
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
  smsBtn: {
    alignSelf: "flex-start",
    marginLeft: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#2563eb",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  smsBtnText: { color: "#2563eb", fontWeight: "600" },
});