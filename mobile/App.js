import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import { getMe } from './src/api/auth';
import { clearToken } from './src/storage/token';

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  // On app start: if a saved token still works, skip the login screen
  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  const logout = async () => {
    await clearToken();
    setUser(null);
  };

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) return <LoginScreen onLoggedIn={setUser} />;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, marginBottom: 16 }}>Welcome, {user.name}</Text>
      <TouchableOpacity onPress={logout}>
        <Text style={{ color: '#4f46e5', fontSize: 16 }}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}