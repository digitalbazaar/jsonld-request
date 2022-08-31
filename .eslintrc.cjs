module.exports = {
  root: true,
  env: {
    browser: true,
    node: true
  },
  extends: [
    'digitalbazaar',
    'digitalbazaar/module',
    'digitalbazaar/jsdoc'
  ],
  rules: {
    'unicorn/prefer-node-protocol': 'error'
  }
};
