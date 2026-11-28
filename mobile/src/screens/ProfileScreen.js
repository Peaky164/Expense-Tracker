import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { colors } from "../theme";

export default function ProfileScreen({ user, onLogout, navigation }) {
  const initial = (user?.name || "?").trim().charAt(0).toUpperCase();

  const rows = [
    { icon: "pricetags", label: "Categories", onPress: () => navigation.navigate("Categories") },
    { icon: "pie-chart", label: "Budgets", onPress: () => navigation.navigate("Budgets") },
    {
      icon: "information-circle",
      label: "About app",
      onPress: () =>
        Alert.alert("Expense Tracker", "Phase 2 (Sem 6): mobile app built on the Sem 5 web project."),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        <View style={styles.menu}>
          {rows.map((r) => (
            <TouchableOpacity key={r.label} style={styles.menuRow} onPress={r.onPress}>
              <Ionicons name={r.icon} size={22} color={colors.gold} />
              <Text style={styles.menuLabel}>{r.label}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingVertical: 14, alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  content: { alignItems: "center", padding: 20, paddingBottom: 40 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: colors.gold,
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  avatarText: { fontSize: 40, fontWeight: "700", color: colors.gold },
  name: { fontSize: 22, fontWeight: "700", color: colors.text, marginTop: 14 },
  email: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  menu: {
    alignSelf: "stretch",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.antique,
    borderRadius: 16,
    marginTop: 28,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark,
  },
  menuLabel: { flex: 1, color: colors.text, fontSize: 16, marginLeft: 14 },
  logoutBtn: {
    alignSelf: "stretch",
    backgroundColor: colors.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 28,
  },
  logoutText: { color: "#000000", fontWeight: "700", fontSize: 16 },
});