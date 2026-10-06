const config = {
  '{src,tests}/**/*.{js,cjs,mjs,ts,tsx}': ['eslint --fix --max-warnings=0', 'prettier --write'],
  '*.config.{js,cjs,mjs,ts}': ['eslint --fix --max-warnings=0', 'prettier --write'],
  '*.{json,css,md,yml,yaml}': 'prettier --write --ignore-unknown',
};

export default config;
