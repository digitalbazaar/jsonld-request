jsonld-request
==============

[![Dependency Status](https://img.shields.io/david/digitalbazaar/jsonld-request.svg)](https://david-dm.org/digitalbazaar/jsonld-request)

Introduction
------------

This JavaScript [node.js][] library is used to read data from stdin, URLs, or
files and convert to [JSON-LD][] via [jsonld.js][].  It can process JSON-LD in
JSON and RDFa in HTML and output JSON-LD.

## Installation

```
npm install jsonld-request
```

```js
var jsonld_request = require('jsonld-request');
```

## Usage

```js
// read from stdin
var jsonld_request('-', function(err, res, data) {
  // handle errors or use data
});

// read from URL
var jsonld_request('https://www.example.com/resource', function(err, res, data) {
  // handle errors or use data
});

// read from file
var jsonld_request('file.jsonld', function(err, res, data) {
  // handle errors or use data
});
```

Commercial Support
------------------

Commercial support for this library is available upon request from
[Digital Bazaar][]: support@digitalbazaar.com

Source Code
-----------

http://github.com/digitalbazaar/jsonld-request

[Digital Bazaar]: http://digitalbazaar.com/
[JSON-LD]: http://json-ld.org/
[RDFa]: http://www.w3.org/TR/rdfa-core/
[json-ld.org]: https://github.com/json-ld/json-ld.org
[jsonld.js]: https://github.com/digitalbazaar/jsonld.js
[node.js]: https://nodejs.org/
