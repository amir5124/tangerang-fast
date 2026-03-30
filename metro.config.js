/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

// 1. Tambahkan Polyfill ini di baris paling atas
// Ini akan memperbaiki error "configs.toReversed is not a function" 
// yang disebabkan oleh versi Node.js yang tidak konsisten saat build local.
if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function () {
    return [...this].reverse();
  };
}

// 2. Konfigurasi asli Anda
module.exports = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};