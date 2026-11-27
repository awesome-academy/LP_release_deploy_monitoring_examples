const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/', 'migrations/', '_log/'] },
  js.configs.recommended,
  { languageOptions: { sourceType: 'commonjs', globals: globals.node } },
];
