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
import { getSummary } from "../api/dashboard";
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

export default function DashboardScreen({ user, onLogout }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState(monthKey(new Date()));

  const load = useCallback(async (m) => {
    try {
      const data = await getSummary(m);
      setSummary(data);
    } catch (err) {
      Alert.alert("Could not load data", errorText(err));
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
        <Text style={styles.welcome}>Welcome, {user?.name}</Text>

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
            Balance
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

        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
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
  welcome: { fontSize: 22, fontWeight: "700", color: colors.gold },
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
  hint: { color: colors.textSecondary, marginTop: 8, textAlign: "center" },
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
  logoutBtn: { alignItems: "center", paddingVertical: 24, marginTop: 8 },
  logoutText: { color: colors.champagne, fontSize: 16 },
});