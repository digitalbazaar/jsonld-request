jsonld-request
==============

Introduction
------------

This JavaScript [Node.js][] library is used to read data from stdin, URLs, or
files and convert to [JSON-LD][] via [jsonld.js][]. It can process JSON-LD in
JSON and RDFa in HTML and output JSON-LD.

## Installation

```
npm install jsonld-request
```

## Usage

Import the main function:

```js
import {jsonldRequest} from 'jsonld-request';
```

Read from stdin:

```js
const {data} = await jsonldRequest('-');
```

Read from URL:

```js
const {response, data} = await jsonldRequest('https://www.example.com/resource');
```

Read from file:

```js
const {data} = await jsonldRequest('file.jsonld');
```

Read from URL with headers and agent:

```js
import https from 'https';
// use custom headers
const headers = {
  Example: 'example'
};
// use an agent to avoid self-signed certificate errors
const agent = new https.Agent({rejectUnauthorized: false});

const {response, data} = await jsonldRequest('https://www.example.com/resource', {
  headers, agent
});
```

Options include:
- **base**: The document base. (default: auto-detect)
- **encoding**: The data encoding. (default: utf8)
- **dataType**: The data type as a media type or shorthand. (default:
  auto-detect)
- **headers**: Headers for the request. (default: `Accept`).
- **agent**: An agent to use for HTTP/HTTPS requests. (default: none)
- **allow**: Array of allowed loaders. (default: `['stdin', 'file', 'http',
  'https']`)

See [`@digitalbazaar/http-client`](https://github.com/digitalbazaar/http-client)
for other options.

Security Considerations
-----------------------

**WARNING**: This code can load from stdin and arbitrary file locations! It is
intended to provide low level support for resource loading. Please make sure
the calling code sanitizes inputs to avoid security issues. Do not use this as
a plain [jsonld.js][] document loader without proper protections!

The `allow` option can assist in only enabling certain loaders.

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
