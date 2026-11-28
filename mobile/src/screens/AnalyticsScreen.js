import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme";

export default function AnalyticsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.hint}>Charts are coming in the next step.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingVertical: 14 },
  title: { fontSize: 24, fontWeight: "700", color: colors.text },
  body: { flex: 1, alignItems: "center", justifyContent: "center" },
  hint: { color: colors.textSecondary },
});