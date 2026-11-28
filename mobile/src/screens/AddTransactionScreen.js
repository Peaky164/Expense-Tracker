import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { createTransaction } from "../api/transactions";
import { getCategories } from "../api/categories";
import { saveOffline, loadOffline, isNetworkError } from "../storage/offline";
import { addPending } from "../storage/pendingQueue";
import { iconFor } from "../categoryIcons";
import { colors } from "../theme";

const PAYMENT_MODES = ["Cash", "UPI", "Card", "Other"];

function errorText(err) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((d) => d.msg).join("\n");
  }
  return "Something went wrong. Check your connection and try again.";
}

function dateLabel(iso) {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AddTransactionScreen({ route, navigation }) {
  const from = route?.params?.from || "Dashboard";
  const [categories, setCategories] = useState([]);
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [date, setDate] = useState(null); // ISO string from SMS, or null = now
  const [categoryId, setCategoryId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Start fresh every time this screen is opened
  useFocusEffect(
    useCallback(() => {
      const p = route?.params || {};
      setType(p.type || "expense");
      setAmount(p.amount ? String(p.amount) : "");
      setNote(p.description || "");
      setPaymentMode(p.paymentMode || "Cash");
      setDate(p.date || null);
      setCategoryId(null);
      (async () => {
        try {
          const cats = await getCategories();
          setCategories(cats);
          saveOffline("categories", cats);
        } catch (e) {
          const cached = await loadOffline("categories");
          if (cached) setCategories(cached);
        }
      })();
    }, [route?.params])
  );

  const goBack = () => navigation.navigate(from);

  const chooseType = (t) => {
    setType(t);
    setCategoryId(null);
  };

  const shownCategories = categories.filter((c) => c.type === type);

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
    const payload = {
      amount: value,
      description: note.trim() || null,
      payment_mode: paymentMode,
      category_id: categoryId,
    };
    if (date) payload.date = date;
    setSaving(true);
    try {
      await createTransaction(payload);
      goBack();
    } catch (err) {
      if (isNetworkError(err)) {
        // No connection: keep it on the phone and upload later
        await addPending(payload);
        Alert.alert(
          "Saved offline",
          "It will upload automatically when you are back online."
        );
        goBack();
      } else {
        Alert.alert("Could not save", errorText(err));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.headerSide}>
          <Ionicons name="chevron-back" size={26} color={colors.gold} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Transaction</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.toggleRow}>
          {["expense", "income"].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.toggleBtn, type === t && styles.toggleActive]}
              onPress={() => chooseType(t)}
            >
              <Text style={[styles.toggleText, type === t && styles.toggleTextActive]}>
                {t === "expense" ? "Expense" : "Income"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.rupee}>₹</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <Text style={styles.label}>Select Category</Text>
        {shownCategories.length === 0 ? (
          <Text style={styles.hint}>
            No {type} categories yet. Create one from Profile, then Categories.
          </Text>
        ) : (
          <View style={styles.tileWrap}>
            {shownCategories.map((c) => {
              const ic = iconFor(c);
              const active = categoryId === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.tile, active && styles.tileActive]}
                  onPress={() => setCategoryId(c.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.tileIcon, { backgroundColor: ic.color + "33" }]}>
                    <Ionicons name={ic.icon} size={22} color={ic.color} />
                  </View>
                  <Text style={styles.tileText} numberOfLines={1}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.label}>Payment mode</Text>
        <View style={styles.modeRow}>
          {PAYMENT_MODES.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.chip, paymentMode === m && styles.chipActive]}
              onPress={() => setPaymentMode(m)}
            >
              <Text style={[styles.chipText, paymentMode === m && styles.chipTextActive]}>
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Date</Text>
        <View style={styles.dateRow}>
          <Ionicons name="calendar" size={20} color={colors.gold} />
          <Text style={styles.dateText}>{dateLabel(date)}</Text>
        </View>

        <Text style={styles.label}>Add Note (Optional)</Text>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Lunch with friends..."
          placeholderTextColor={colors.textSecondary}
        />

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveText}>{saving ? "Saving…" : "Add Transaction"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  headerSide: { width: 44, alignItems: "center" },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  content: { padding: 16, paddingBottom: 40 },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.antique,
    padding: 4,
  },
  toggleBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 20 },
  toggleActive: { backgroundColor: colors.gold },
  toggleText: { color: colors.text, fontWeight: "600", fontSize: 16 },
  toggleTextActive: { color: "#000000", fontWeight: "700" },
  amountBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.antique,
    borderRadius: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    shadowColor: colors.gold,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  rupee: { fontSize: 30, color: colors.textSecondary, marginRight: 10 },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: "700",
    color: colors.text,
    paddingVertical: 14,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.champagne,
    marginTop: 22,
    marginBottom: 10,
  },
  hint: { color: colors.textSecondary },
  tileWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: {
    width: "22%",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.dark,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  tileActive: { borderColor: colors.gold, borderWidth: 2 },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  tileText: { color: colors.text, fontSize: 11, marginTop: 6 },
  modeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.dark,
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.text },
  chipTextActive: { color: "#000000", fontWeight: "700" },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.dark,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  dateText: { color: colors.text, fontSize: 16 },
  noteInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.dark,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  saveBtn: {
    backgroundColor: colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },
  saveText: { color: "#000000", fontWeight: "700", fontSize: 17 },
});