/* eslint-env node */
/* eslint-disable */
module.exports = {
  root: true,                           // 親の設定を見に行かない
  env: { node: true, es2022: true },    // Node + ES2022 前提
  ignorePatterns: [
    "lib/",             // ビルド成果物を無視
    "lib/**",           // ビルド成果物を無視
    "lib/**/*",         // ビルド成果物を無視
    "node_modules/**",
    "dist/**",
    ".eslintrc.js"      // この設定ファイル自体を無視
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    // 必要なら片方だけでOK。複数指定やパス不一致が原因で無視されることがあるためシンプルに。
    project: ["tsconfig.json"]
  },
  plugins: ["@typescript-eslint", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript"
    // "google" を使う場合は残してもOKですが、まずは最小構成で通すのを優先
  ],
  rules: {
    quotes: ["error", "double"],
    indent: ["error", 2],
    "import/no-unresolved": "off" // Functions 環境での型解決ズレ回避
  }
};
