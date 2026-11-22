import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import LockScreen from './src/screens/LockScreen';
import MainTabs from './src/navigation/MainTabs';
import { getMe } from './src/api/auth';
import { clearToken } from './src/storage/token';
import { registerPushToken, unregisterPushToken } from './src/api/pushTokens';
import { getPushToken } from './src/pushNotifications';
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
  const [showSignup, setShowSignup] = useState(false);
  const pushTokenRef = useRef(null);

  // Whenever someone is logged in, register this phone for budget alerts
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await getPushToken();
        if (token) {
          await registerPushToken(token);
          pushTokenRef.current = token;
        }
      } catch (e) {
        // Push is optional; never block the app because of it
      }
    })();
  }, [user]);

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
    // Stop budget alerts for this account on this phone (needs the login token, so do it first)
    try {
      if (pushTokenRef.current) {
        await unregisterPushToken(pushTokenRef.current);
        pushTokenRef.current = null;
      }
    } catch (e) {
      // If this fails (e.g. offline), logging out must still work
    }
    await clearToken();
    setLocked(false);
    setShowSignup(false);
    setUser(null);
  };

  // Runs after a successful password login or signup
  const handleLoggedIn = async (me) => {
    setLocked(false); // they just typed the password, no need to lock
    setShowSignup(false);
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

  if (!user) {
    return showSignup ? (
      <SignupScreen onLoggedIn={handleLoggedIn} onBack={() => setShowSignup(false)} />
    ) : (
      <LoginScreen onLoggedIn={handleLoggedIn} onGoSignup={() => setShowSignup(true)} />
    );
  }

  if (locked) {
    return <LockScreen onUnlock={() => setLocked(false)} onLogout={logout} />;
  }

  return (
    <NavigationContainer>
      <MainTabs user={user} onLogout={logout} />
    </NavigationContainer>
  );
}