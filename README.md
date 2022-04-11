jsonld-request
==============

[![Dependency Status](https://img.shields.io/david/digitalbazaar/jsonld-request.svg)](https://david-dm.org/digitalbazaar/jsonld-request)

Introduction
------------

This JavaScript [Node.js][] library is used to read data from stdin, URLs, or
files and convert to [JSON-LD][] via [jsonld.js][].  It can process JSON-LD in
JSON and RDFa in HTML and output JSON-LD.

## Installation

```
npm install jsonld-request
```

```js
import {request} from 'jsonld-request';
```

## Usage

```js
// read from stdin
const {response, data} = await request('-');
});

// read from URL
const {response, data} = await request('https://www.example.com/resource');
});

// read from file
const {response, data} = await request('file.jsonld');
```

Commercial Support
------------------

Commercial support for this library is available upon request from
[Digital Bazaar][]: support@digitalbazaar.com

Source Code
-----------

https://github.com/digitalbazaar/jsonld-request

[Digital Bazaar]: https://digitalbazaar.com/
[JSON-LD]: https://json-ld.org/
[Node.js]: https://nodejs.org/
[RDFa]: http://www.w3.org/TR/rdfa-core/
[json-ld.org]: https://github.com/json-ld/json-ld.org
[jsonld.js]: https://github.com/digitalbazaar/jsonld.js
