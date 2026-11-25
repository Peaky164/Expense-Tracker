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
import * as DocumentPicker from "expo-document-picker";
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
import { parseCsv } from "../csvParser";
import { colors } from "../theme";

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
  const [csvVisible, setCsvVisible] = useState(false);
  const [csvRows, setCsvRows] = useState([]);
  const [csvSkipped, setCsvSkipped] = useState(0);
  const [csvExpenseCat, setCsvExpenseCat] = useState(null);
  const [csvIncomeCat, setCsvIncomeCat] = useState(null);
  const [csvImporting, setCsvImporting] = useState(false);

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

  const pickCsv = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.length) return;
      const text = await (await fetch(res.assets[0].uri)).text();
      const parsed = parseCsv(text);
      if (!parsed || parsed.rows.length === 0) {
        Alert.alert(
          "Could not read this file",
          text.startsWith("%PDF")
            ? "This is a PDF. Please pick a CSV file (.csv)."
            : "No rows with a date and an amount were found. Is it a bank statement CSV?"
        );
        return;
      }
      setCsvRows(parsed.rows);
      setCsvSkipped(parsed.skipped);
      setCsvExpenseCat(null);
      setCsvIncomeCat(null);
      setCsvVisible(true);
    } catch (err) {
      Alert.alert("Could not open file", String(err?.message || err));
    }
  };

  const importCsv = async () => {
    const needExpense = csvRows.some((r) => r.type === "expense");
    const needIncome = csvRows.some((r) => r.type === "income");
    if (
      (needExpense && csvExpenseCat === null) ||
      (needIncome && csvIncomeCat === null)
    ) {
      Alert.alert("Pick categories", "Choose a category for each type shown.");
      return;
    }
    setCsvImporting(true);
    let done = 0;
    let failed = 0;
    try {
      for (const r of csvRows) {
        try {
          await createTransaction({
            amount: r.amount,
            description: r.description,
            payment_mode: "Other",
            category_id: r.type === "expense" ? csvExpenseCat : csvIncomeCat,
            date: r.date,
          });
          done += 1;
        } catch (err) {
          if (isNetworkError(err) || err?.response?.status === 429) {
            Alert.alert(
              "Import stopped",
              `Added ${done} of ${csvRows.length}. Do not import the same file again, or those ${done} will be added twice.`
            );
            setCsvVisible(false);
            await load();
            return;
          }
          failed += 1;
        }
      }
      Alert.alert(
        "Import finished",
        `Added ${done} transactions.` + (failed ? ` ${failed} were rejected.` : "")
      );
      setCsvVisible(false);
      await load();
    } finally {
      setCsvImporting(false);
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

  // Numbers for the CSV preview screen
  const csvExpenseRows = csvRows.filter((r) => r.type === "expense");
  const csvIncomeRows = csvRows.filter((r) => r.type === "income");
  const sumOf = (rows) => rows.reduce((s, r) => s + r.amount, 0);
  const expenseCats = categories.filter((c) => c.type === "expense");
  const incomeCats = categories.filter((c) => c.type === "income");

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
            style={[
              styles.amount,
              { color: isIncome ? colors.income : colors.expense },
            ]}
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
        <Text style={styles.title}>Transactions</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.smsBtn} onPress={openSms}>
          <Text style={styles.smsBtnText}>Paste SMS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.smsBtn} onPress={pickCsv}>
          <Text style={styles.smsBtnText}>Import CSV</Text>
        </TouchableOpacity>
      </View>

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
              placeholderTextColor={colors.textSecondary}
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

      <Modal
        visible={csvVisible}
        animationType="slide"
        onRequestClose={() => !csvImporting && setCsvVisible(false)}
      >
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.form}>
            <Text style={styles.title}>Import statement</Text>
            <Text style={styles.hint}>
              Found {csvRows.length} transactions
              {csvSkipped ? ` (${csvSkipped} rows skipped)` : ""}.
            </Text>
            <Text style={styles.hint}>
              Expenses: {csvExpenseRows.length} (₹{sumOf(csvExpenseRows).toFixed(2)}) •
              Income: {csvIncomeRows.length} (₹{sumOf(csvIncomeRows).toFixed(2)})
            </Text>
            <Text style={styles.hint}>
              Importing the same file twice will add the transactions twice.
            </Text>

            {csvExpenseRows.length > 0 && (
              <View>
                <Text style={styles.label}>Category for all expenses</Text>
                {expenseCats.length === 0 ? (
                  <Text style={styles.hint}>
                    No expense category yet. Create one in the Categories tab first.
                  </Text>
                ) : (
                  <View style={styles.chipWrap}>
                    {expenseCats.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.chip, csvExpenseCat === c.id && styles.chipActive]}
                        onPress={() => setCsvExpenseCat(c.id)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            csvExpenseCat === c.id && styles.chipTextActive,
                          ]}
                        >
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {csvIncomeRows.length > 0 && (
              <View>
                <Text style={styles.label}>Category for all income</Text>
                {incomeCats.length === 0 ? (
                  <Text style={styles.hint}>
                    No income category yet. Create one in the Categories tab first.
                  </Text>
                ) : (
                  <View style={styles.chipWrap}>
                    {incomeCats.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.chip, csvIncomeCat === c.id && styles.chipActive]}
                        onPress={() => setCsvIncomeCat(c.id)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            csvIncomeCat === c.id && styles.chipTextActive,
                          ]}
                        >
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            <Text style={styles.label}>First rows</Text>
            {csvRows.slice(0, 5).map((r, i) => (
              <View key={i} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowTitle}>{r.description}</Text>
                  <Text style={styles.rowSub}>{formatDate(r.date)}</Text>
                </View>
                <Text
                  style={[
                    styles.amount,
                    { color: r.type === "income" ? colors.income : colors.expense },
                  ]}
                >
                  {r.type === "income" ? "+" : "-"}₹{r.amount.toFixed(2)}
                </Text>
              </View>
            ))}
            {csvRows.length > 5 && (
              <Text style={styles.hint}>…and {csvRows.length - 5} more</Text>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, csvImporting && { opacity: 0.6 }]}
              onPress={importCsv}
              disabled={csvImporting}
            >
              <Text style={styles.saveBtnText}>
                {csvImporting ? "Importing…" : `Import ${csvRows.length} transactions`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setCsvVisible(false)}
              disabled={csvImporting}
            >
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
          loadingMore ? (
            <ActivityIndicator style={{ margin: 16 }} color={colors.gold} />
          ) : null
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
                      { color: pIncome ? colors.income : colors.expense },
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
            : { paddingBottom: 16 }
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
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Lunch"
                placeholderTextColor={colors.textSecondary}
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.dark,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: colors.gold,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  rowLeft: { flex: 1, paddingRight: 12 },
  rowRight: { alignItems: "flex-end" },
  rowTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  rowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  amount: { fontSize: 16, fontWeight: "700" },
  deleteText: { color: colors.expense, fontSize: 12, marginTop: 4 },
  emptyWrap: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  hint: { color: colors.textSecondary, marginTop: 8, textAlign: "center" },
  offlineBanner: {
    backgroundColor: colors.dark,
    color: colors.champagne,
    textAlign: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  form: { padding: 16 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 6,
    color: colors.champagne,
  },
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
  btnRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginLeft: 16,
    marginBottom: 4,
    gap: 8,
  },
  smsBtn: {
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  smsBtnText: { color: colors.gold, fontWeight: "700" },
});