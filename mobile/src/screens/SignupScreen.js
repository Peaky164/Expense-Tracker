import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { signup, login, getMe } from '../api/auth';
import { colors } from '../theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupScreen({ onLoggedIn, onBack }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    if (!name.trim()) return 'Name cannot be blank.';
    if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address.';
    if (password.length < 8) return 'Password must be at least 8 characters long.';
    if (password !== confirm) return 'Passwords do not match.';
    return '';
  };

  const handleSignup = async () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signup(name.trim(), email.trim(), password);
      await login(email.trim(), password);
      const user = await getMe();
      onLoggedIn(user);
    } catch (e) {
      if (e.response?.status === 400) {
        setError('That email is already registered. Try logging in.');
      } else if (e.response?.status === 422) {
        setError('Please check your details and try again.');
      } else if (e.response?.status === 429) {
        setError('Too many attempts. Wait a minute and try again.');
      } else if (!e.response) {
        setError('Cannot reach the server. Check Wi-Fi and the API address.');
      } else {
        setError('Something went wrong. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Expense Tracker</Text>
          <Text style={styles.heading}>Sign Up</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Min 8 characters"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Text style={styles.label}>Confirm password</Text>
          <TextInput
            style={styles.input}
            placeholder="Re-enter password"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.6 }]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onBack}>
            <Text style={styles.linkMuted}>
              Already have an account? <Text style={styles.link}>Log In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.antique,
    shadowColor: colors.gold,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.gold, textAlign: 'center', marginBottom: 24 },
  heading: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 20 },
  label: { color: colors.textSecondary, fontSize: 14, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.dark,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 16,
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: colors.background,
  },
  button: {
    backgroundColor: colors.gold,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonText: { color: '#000000', fontSize: 16, fontWeight: '700' },
  error: { color: colors.expense, marginBottom: 8 },
  linkMuted: { color: colors.textSecondary, textAlign: 'center', marginTop: 20 },
  link: { color: colors.champagne, fontWeight: '600' },
});