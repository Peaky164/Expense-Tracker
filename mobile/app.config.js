module.exports = ({ config }) => ({
    ...config,
  plugins: [...(config.plugins || []), "@react-native-google-signin/google-signin"],
  android: {
    ...config.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
  },
});