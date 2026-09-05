const config = {
  "*.{ts,tsx,mts,mjs,js,jsx}": ["prettier --write", "eslint --fix"],
  "*.{json,yml,yaml,css}": ["prettier --write"],
};

export default config;
