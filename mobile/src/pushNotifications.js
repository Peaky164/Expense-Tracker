import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Show alerts as a banner even while the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Returns this phone's Expo push token, or null if notifications are not allowed
export async function getPushToken() {
  if (Platform.OS === 'android') {
    // Android 13+ only shows the permission prompt once a channel exists
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Budget alerts',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return null;

  const { data } = await Notifications.getExpoPushTokenAsync();
  return data;
}