import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { getSummary } from "../api/dashboard";
import { saveOffline, loadOffline, isNetworkError } from "../storage/offline";
import { colors } from "../theme";

function errorText(err) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
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

const money = (n) => `₹${Number(n).toFixed(2)}`;

export default function DashboardScreen({ user, navigation }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState(monthKey(new Date()));
  const [offline, setOffline] = useState(false);

  const load = useCallback(async (m) => {
    try {
      const data = await getSummary(m);
      setSummary(data);
      setOffline(false);
      saveOffline(`dashboard-${m}`, data);
    } catch (err) {
      if (isNetworkError(err)) {
        // No connection: show the last saved copy for this month
        const cached = await loadOffline(`dashboard-${m}`);
        setSummary(cached || null);
        setOffline(true);
        if (!cached) {
          Alert.alert("Offline", "No saved data for this month yet.");
        }
      } else {
        Alert.alert("Could not load data", errorText(err));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload when the tab is focused or the month changes
  useFocusEffect(
    useCallback(() => {
      load(month);
    }, [load, month])
  );

  const income = summary?.total_income ?? 0;
  const expense = summary?.total_expense ?? 0;
  const balance = summary?.balance ?? 0;
  const count = summary?.transaction_count ?? 0;
  const breakdown = summary?.by_category ?? [];

  const actions = [
    {
      label: "Add Income",
      icon: "add-circle",
      color: colors.income,
      onPress: () =>
        navigation.navigate("AddTransaction", { from: "Dashboard", type: "income" }),
    },
    {
      label: "Add Expense",
      icon: "remove-circle",
      color: colors.expense,
      onPress: () =>
        navigation.navigate("AddTransaction", { from: "Dashboard", type: "expense" }),
    },
    {
      label: "Set Budget",
      icon: "flag",
      color: colors.gold,
      onPress: () => navigation.navigate("Budgets"),
    },
  ];

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
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.gold}
            colors={[colors.gold]}
            progressBackgroundColor={colors.card}
            onRefresh={() => {
              setRefreshing(true);
              load(month);
            }}
          />
        }
      >
        {offline && (
          <Text style={styles.offlineBanner}>
            You are offline. Showing your last saved data.
          </Text>
        )}
        <Text style={styles.hello}>Hello,</Text>
        <Text style={styles.welcome}>{user?.name}</Text>

        <View style={styles.monthRow}>
          <TouchableOpacity onPress={() => setMonth(shiftMonth(month, -1))}>
            <Text style={styles.arrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthText}>{monthLabel(month)}</Text>
          <TouchableOpacity onPress={() => setMonth(shiftMonth(month, 1))}>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        <LinearGradient
          colors={
            balance >= 0
              ? [colors.deepGold, colors.brightGold]
              : ["#7f1d1d", colors.expense]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <Text
            style={[
              styles.balanceLabel,
              { color: balance >= 0 ? "#000000" : "#FFFFFF" },
            ]}
          >
            Total Balance
          </Text>
          <Text
            style={[
              styles.balanceValue,
              { color: balance >= 0 ? "#000000" : "#FFFFFF" },
            ]}
          >
            {balance < 0 ? "-" : ""}
            {money(Math.abs(balance))}
          </Text>
        </LinearGradient>

        <View style={styles.row}>
          <View style={styles.smallCard}>
            <Text style={styles.smallLabel}>Income</Text>
            <Text style={[styles.smallValue, { color: colors.income }]}>
              {money(income)}
            </Text>
          </View>
          <View style={styles.smallCard}>
            <Text style={styles.smallLabel}>Expenses</Text>
            <Text style={[styles.smallValue, { color: colors.expense }]}>
              {money(expense)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          {actions.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.actionBtn}
              onPress={a.onPress}
              activeOpacity={0.8}
            >
              <Ionicons name={a.icon} size={28} color={a.color} />
              <Text style={styles.actionText}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Spending by category</Text>
        {breakdown.length === 0 ? (
          <Text style={styles.hint}>
            {count === 0
              ? "No transactions this month."
              : "No expenses this month."}
          </Text>
        ) : (
          breakdown.map((item) => {
            const pct = expense > 0 ? (item.total / expense) * 100 : 0;
            return (
              <View key={item.category_id} style={styles.catRow}>
                <View style={styles.catTop}>
                  <Text style={styles.catName}>{item.name}</Text>
                  <Text style={styles.catAmount}>
                    {money(item.total)} · {Math.round(pct)}%
                  </Text>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${pct}%` }]} />
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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
  content: { padding: 16, paddingBottom: 40 },
  hello: { fontSize: 16, color: colors.textSecondary },
  welcome: { fontSize: 26, fontWeight: "700", color: colors.gold },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginVertical: 12,
  },
  arrow: { fontSize: 32, paddingHorizontal: 12, color: colors.gold },
  monthText: {
    fontSize: 16,
    fontWeight: "600",
    minWidth: 150,
    textAlign: "center",
    color: colors.text,
  },
  balanceCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: colors.gold,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  balanceLabel: { opacity: 0.85, fontSize: 14, fontWeight: "600" },
  balanceValue: { fontSize: 32, fontWeight: "700", marginTop: 4 },
  row: { flexDirection: "row", gap: 12 },
  smallCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.antique,
    borderRadius: 14,
    padding: 14,
    shadowColor: colors.gold,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  smallLabel: { fontSize: 12, color: colors.textSecondary },
  smallValue: { fontSize: 18, fontWeight: "700", marginTop: 4 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 8,
    color: colors.champagne,
  },
  actionsRow: { flexDirection: "row", gap: 12 },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.antique,
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: colors.gold,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  actionText: { color: colors.text, fontSize: 12, marginTop: 6, fontWeight: "600" },
  hint: { color: colors.textSecondary, marginTop: 8, textAlign: "center" },
  offlineBanner: {
    backgroundColor: colors.dark,
    color: colors.champagne,
    textAlign: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  catRow: { marginBottom: 14 },
  catTop: { flexDirection: "row", justifyContent: "space-between" },
  catName: { fontSize: 14, fontWeight: "600", color: colors.text },
  catAmount: { fontSize: 12, color: colors.textSecondary },
  barBg: {
    height: 8,
    backgroundColor: colors.card,
    borderRadius: 4,
    marginTop: 6,
    overflow: "hidden",
  },
  barFill: { height: 8, borderRadius: 4, backgroundColor: colors.gold },
});