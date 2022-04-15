# jsonld-request ChangeLog

## 1.0.1 - 2022-04-15

## Fixed
- Improve error causes.
- Fix base usage.
- Fix RDFa type handling.
- Improve format detection.

## 1.0.0 - 2022-04-15

## Changed
- Update dependencies.
- Modernize.
- **BREAKING**: Convert to module.
- **BREAKING**: Change main export to `jsonledRequest`.
- **BREAKING**: Switch from callbacks to `async`/`await`.
- **BREAKING**: Switch from deprecated `request` to
  `@digitalbazaar/http-client`. Any/all options passed may need to be adjusted.
  Notably passing `agent` properly for `rejectUnauthorized` support.
- Switch from bundled `rdfa.js` to `rdfa` package.
- Switch from `jsdom` to `@xmldom/xmldom`.
- Switch from custom stream code to `get-stdin`.

## 0.2.0 - 2017-12-18

## Changed
- Update dependencies.

## 0.1.1 - 2016-02-02

### Changed
- Remove space before q parameters in Accept header.

## 0.1.0 - 2015-09-12

### Added
- Split out request code from jsonld.js.
