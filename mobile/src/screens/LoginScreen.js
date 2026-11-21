import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { login, getMe, googleLogin } from '../api/auth';
import { getGoogleIdToken } from '../googleSignIn';
import { colors } from '../theme';

export default function LoginScreen({ onLoggedIn, onGoSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      const user = await getMe();
      onLoggedIn(user);
    } catch (e) {
      if (e.response?.status === 401 || e.response?.status === 400) {
        setError('Wrong email or password.');
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

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const idToken = await getGoogleIdToken();
      if (!idToken) return;
      await googleLogin(idToken);
      const user = await getMe();
      onLoggedIn(user);
    } catch (e) {
      if (e.response?.status === 401) {
        setError('Google sign-in was rejected by the server.');
      } else if (e.response?.status === 503) {
        setError('Google sign-in is not set up on the server.');
      } else {
        setError('Google sign-in failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Expense Tracker</Text>
        <Text style={styles.heading}>Log In</Text>

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
          placeholder="Your password"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>Log In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.googleButton} onPress={handleGoogle} disabled={loading}>
          <Text style={styles.googleText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onGoSignup}>
          <Text style={styles.linkMuted}>
            Don't have an account? <Text style={styles.link}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: colors.background },
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
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.dark },
  dividerText: { color: colors.textSecondary, marginHorizontal: 12 },
  googleButton: {
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.background,
  },
  googleText: { color: colors.gold, fontSize: 16, fontWeight: '700' },
  error: { color: colors.expense, marginBottom: 8 },
  linkMuted: { color: colors.textSecondary, textAlign: 'center', marginTop: 20 },
  link: { color: colors.champagne, fontWeight: '600' },
});