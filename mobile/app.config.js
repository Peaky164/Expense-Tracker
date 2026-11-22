module.exports = ({ config }) => ({
    ...config,
  plugins: [
    ...(config.plugins || []),
    "@react-native-google-signin/google-signin",
    "expo-notifications",
    "expo-font",
    "@react-native-vector-icons/ionicons",
  ],
  android: {
    ...config.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
  },
});