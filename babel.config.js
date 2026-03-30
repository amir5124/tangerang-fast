module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Plugin lain di sini (jika ada)...
      'react-native-reanimated/plugin', // WAJIB DI BARIS TERAKHIR
    ],
  };
};