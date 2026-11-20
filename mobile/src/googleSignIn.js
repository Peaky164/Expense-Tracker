import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: '174681133116-mqvoestt6v1k7p7jn6u83vhp28m2jigf.apps.googleusercontent.com',
});

export async function getGoogleIdToken() {
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return null;
  return response.data.idToken;
}