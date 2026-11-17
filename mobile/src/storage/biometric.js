import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const ENABLED_KEY = 'biometric_enabled';
const PROMPTED_KEY = 'biometric_prompted';

export const isBiometricEnabled = async () =>
  (await SecureStore.getItemAsync(ENABLED_KEY)) === 'true';

export const setBiometricEnabled = (enabled) =>
  SecureStore.setItemAsync(ENABLED_KEY, enabled ? 'true' : 'false');

// Whether we already asked the user once (so we don't nag on every login)
export const wasBiometricPrompted = async () =>
  (await SecureStore.getItemAsync(PROMPTED_KEY)) === 'true';

export const markBiometricPrompted = () =>
  SecureStore.setItemAsync(PROMPTED_KEY, 'true');

// True only if the phone has biometric hardware AND a fingerprint/face is enrolled
export async function canUseBiometrics() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && enrolled;
}

// Shows the system prompt; the phone's PIN/pattern works as a fallback.
// Resolves to true on success, false if cancelled or failed.
export async function authenticate() {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock Expense Tracker',
    cancelLabel: 'Cancel',
  });
  return result.success;
}