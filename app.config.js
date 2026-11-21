// Extends app.json with values that come from environment variables (.env),
// so API keys never need to be committed.
module.exports = ({ config }) => {
  const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!mapsKey) return config;

  return {
    ...config,
    ios: {
      ...config.ios,
      config: { ...config.ios?.config, googleMapsApiKey: mapsKey },
    },
    android: {
      ...config.android,
      config: { ...config.android?.config, googleMaps: { apiKey: mapsKey } },
    },
  };
};
