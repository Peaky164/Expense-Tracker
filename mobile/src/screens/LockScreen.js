import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { authenticate } from '../storage/biometric';
import { colors } from '../theme';

export default function LockScreen({ onUnlock, onLogout }) {
  const [failed, setFailed] = useState(false);
  const prompting = useRef(false);

  const tryUnlock = async () => {
    if (prompting.current) return;
    prompting.current = true;
    setFailed(false);
    try {
      const ok = await authenticate();
      if (ok) onUnlock();
      else setFailed(true);
    } catch (e) {
      setFailed(true);
    } finally {
      prompting.current = false;
    }
  };

  // Prompt automatically when the lock screen appears
  useEffect(() => {
    tryUnlock();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Expense Tracker</Text>
        <Text style={[styles.sub, failed && styles.subFailed]}>
          {failed ? 'Could not verify it is you.' : 'Locked'}
        </Text>
        <TouchableOpacity style={styles.button} onPress={tryUnlock}>
          <Text style={styles.buttonText}>Unlock</Text>
        </TouchableOpacity>
        {/* Escape hatch so you can never be locked out: log in again with your password */}
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.link}>Log out and use password</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  card: {
    alignItems: 'center',
    padding: 28,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.gold,
    shadowColor: colors.gold,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    color: colors.gold,
  },
  sub: { color: colors.textSecondary, marginBottom: 32 },
  subFailed: { color: colors.expense },
  button: {
    backgroundColor: colors.gold,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  buttonText: { color: '#000', fontSize: 16, fontWeight: '700' },
  link: { color: colors.champagne, marginTop: 24 },
});