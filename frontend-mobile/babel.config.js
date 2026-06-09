module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Note: the Reanimated/worklets Babel plugin is auto-configured by
    // babel-preset-expo on SDK 54 — do not add it here.
  };
};
