const path = require("path");

module.exports = {
  jest: {
    configure: {
      watchman: false,
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        // Jest 27 does not resolve these modern package exports.
        "^react-router-dom$": "<rootDir>/node_modules/react-router-dom/dist/index.js",
        "^react-router/dom$": "<rootDir>/node_modules/react-router/dist/development/dom-export.js",
        "^@radix-ui/primitive/is-development$": require.resolve("@radix-ui/primitive/is-development"),
      },
    },
  },
  webpack: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  style: {
    postcss: {
      mode: "file",
    },
  },
};
