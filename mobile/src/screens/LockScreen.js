import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { authenticate } from '../storage/biometric';

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
      <Text style={styles.title}>Expense Tracker</Text>
      <Text style={styles.sub}>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 12 },
  sub: { color: '#666', marginBottom: 32 },
  button: { backgroundColor: '#4f46e5', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: '#4f46e5', marginTop: 24 },
});