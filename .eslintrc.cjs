module.exports = {
  env: {
    browser: true,
    commonjs: true,
    node: true,
    es2020: true
  },
  parserOptions: {
    ecmaVersion: 2020
  },
  extends: [
    'digitalbazaar',
    'digitalbazaar/jsdoc'
  ],
  root: true
};
