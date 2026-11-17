import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import LoginScreen from './src/screens/LoginScreen';
import LockScreen from './src/screens/LockScreen';
import MainTabs from './src/navigation/MainTabs';
import { getMe } from './src/api/auth';
import { clearToken } from './src/storage/token';
import {
  canUseBiometrics,
  isBiometricEnabled,
  setBiometricEnabled,
  wasBiometricPrompted,
  markBiometricPrompted,
} from './src/storage/biometric';

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        // Already logged in: lock the app if the user turned on biometrics
        const shouldLock = (await isBiometricEnabled()) && (await canUseBiometrics());
        setLocked(shouldLock);
        setUser(me);
      } catch (e) {
        setUser(null);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const logout = async () => {
    await clearToken();
    setLocked(false);
    setUser(null);
  };

  // Runs after a successful password login
  const handleLoggedIn = async (me) => {
    setLocked(false); // they just typed the password, no need to lock
    setUser(me);
    try {
      if ((await canUseBiometrics()) && !(await wasBiometricPrompted())) {
        await markBiometricPrompted();
        Alert.alert(
          'Enable biometric unlock?',
          'Use your fingerprint or face to open the app next time.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Enable', onPress: () => setBiometricEnabled(true) },
          ]
        );
      }
    } catch (e) {
      // Biometrics are optional; never block login because of them
    }
  };

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) return <LoginScreen onLoggedIn={handleLoggedIn} />;

  if (locked) {
    return <LockScreen onUnlock={() => setLocked(false)} onLogout={logout} />;
  }

  return (
    <NavigationContainer>
      <MainTabs user={user} onLogout={logout} />
    </NavigationContainer>
  );
}