/**
 * JSON-LD extension to load JSON-LD from stdin, a URL, or a file.
 *
 * @author David I. Lehn <dlehn@digitalbazaar.com>
 *
 * BSD 3-Clause License
 * Copyright (c) 2013-2022 Digital Bazaar, Inc.
 * All rights reserved.
 */
import contentType from 'content-type';
import {DOMParser} from '@xmldom/xmldom';
import {promises as fs} from 'node:fs';
import getStdin from 'get-stdin';
import {httpClient} from '@digitalbazaar/http-client';
import jsonld from 'jsonld';
import rdfa from 'rdfa';

/**
 * Custom error container.
 */
class JsonLdRequestError extends Error {
  constructor(message, options) {
    super(message, options);
    if(!('cause' in this) && ('cause' in options)) {
      this.cause = options.cause;
    }
    if('details' in options) {
      this.details = options.details;
    }
  }
}

/**
 * Clones an object, array, or string/number.
 *
 * @param {*} value - The value to clone.
 *
 * @returns {*} The cloned value.
 */
function _clone(value) {
  if(value && typeof value === 'object') {
    const rval = Array.isArray(value) ? [] : {};
    for(const i in value) {
      rval[i] = _clone(value[i]);
    }
    return rval;
  }
  return value;
}

/**
 * Parse data with given type.
 *
 * @param {string} options - Parse options.
 * @param {string} options.loc - Location string came from.
 * @param {string} options.base - Content base.
 * @param {string} options.type - Content type of the string.
 * @param {string} options.data - The data to parse.
 *
 * @returns {object} Result data.
 */
async function _typedParse({loc, base, type, data}) {
  const _type = type.toLowerCase();
  switch(_type) {
    case 'text':
    case 'plain':
    case 'text/plain':
      return data;
      break;
    case 'json':
    case 'jsonld':
    case 'json-ld':
    case 'ld+json':
    case 'application/json':
    case 'application/ld+json':
      try {
        return JSON.parse(data);
      } catch(ex) {
        throw new JsonLdRequestError('Error parsing JSON.', {
          cause: ex,
          details: {
            contentType: type,
            url: loc
          }
        });
      }
      break;
    case 'xml':
    case 'text/xml':
    case 'html':
    case 'xhtml':
    case 'text/html':
    case 'application/xhtml+xml':
      try {
        let rdfaType;
        let rdfaProcessor;
        switch(_type) {
          case 'xml':
          case 'text/xml':
            rdfaType = 'text/xml';
            rdfaProcessor = rdfa.RDFaXMLParser;
            break;
          case 'html':
          case 'text/html':
            rdfaType = 'text/html';
            rdfaProcessor = rdfa.RDFaHTMLParser;
            break;
          case 'xhtml':
          case 'application/xhtml+xml':
            rdfaType = 'application/xhtml+xml';
            rdfaProcessor = rdfa.RDFaXHTMLParser;
            break;
        }
        // input is RDFa
        const document = new DOMParser().parseFromString(data, rdfaType);
        const result = rdfa.parseDOM(rdfaProcessor, base, document, {});
        const lines = [];
        // FIXME: toTurtle/toNT/toNQ
        result.outputGraph.forEach(n => lines.push(n.toNT()));
        const rdf = lines.join('\n');
        //return jsonld.fromRDF(rdf, {format: 'rdfa-api'});
        return jsonld.fromRDF(rdf, {format: 'application/n-quads'});
      } catch(e) {
        // FIXME: expose RDFa/jsonld ex?
        throw new JsonLdRequestError('RDFa extraction error.', {
          cause: e,
          details: {
            contentType: type,
            url: loc
          }
        });
      }
      break;
    default:
      throw new JsonLdRequestError('Unknown Content-Type.', {
        details: {
          contentType: type,
          url: loc
        }
      });
  }
}

// check if data is a string or buffer sequence of data
function isSequence(data) {
  return typeof data === 'string' || Buffer.isBuffer(data);
}

/**
 * Parse data.
 *
 * @param {string} options - Parse options.
 * @param {string} options.loc - Location data came from.
 * @param {string} options.base - Content base.
 * @param {string} options.type - Content type of the string or null to attempt
 *   to auto-detect.
 * @param {string} options.data - The data to parse.
 *
 * @returns {object|null} Result data.
 */
async function _parse({loc, base, type, data}) {
  // empty string or buffer
  const seq = isSequence(data);
  if(seq && data.length === 0) {
    return null;
  }
  // already parsed
  if(!seq && typeof data === 'object') {
    return data;
  }
  // explicit type
  if(type) {
    return _typedParse({loc, base, type, data});
  }
  // typed via text-like extension
  if(loc && (loc.endsWith('.txt'))) {
    return _typedParse({loc, base, type: 'text', data});
  }
  // typed via JSON-like extension
  if(loc && (loc.endsWith('.json') ||
    loc.endsWith('.jsonld') ||
    loc.endsWith('.json-ld'))) {
    return _typedParse({loc, base, type: 'json', data});
  }
  // typed via HTML-like extension
  if(loc && (loc.endsWith('.xml') ||
    loc.endsWith('.html') ||
    loc.endsWith('.xhtml'))) {
    return _typedParse({loc, base, type: 'html', data});
  }
  // try ~JSON
  try {
    return await _typedParse({loc, base, type: 'application/ld+json', data});
  } catch(err) {
    // try ~HTML
    try {
      return await _typedParse({loc, base, type: 'text/html', data});
    } catch(err) {
      throw new JsonLdRequestError('Unable to auto-detect format.', {
        cause: err,
        details: {
          url: loc
        }
      });
    }
  }
}

// stdin
async function _requestStdin(loc, options) {
  return {
    response: null,
    data: await _parse({
      loc,
      base: options.base || 'stdin:',
      type: options.dataType,
      data: await getStdin()
    })
  };
}

// http
async function _requestHttp(loc, options) {
  // clone and setup request options
  const opts = _clone(options);
  opts.encoding = opts.encoding || 'utf8';
  opts.headers = opts.headers || {};
  if(!('Accept' in opts.headers)) {
    opts.headers.Accept =
      'application/ld+json;q=1.0, ' +
      'application/json;q=0.8, ' +
      'text/html;q=0.6, ' +
      'application/xhtml+xml;q=0.6';
  }

  let response;
  let body;
  try {
    response = await httpClient.get(loc, opts);
    body = response.data;
  } catch(e) {
    /*
    const data = await e.response.text();
    if(data) {
      // attempt to auto-parse error body data
      try {
        body = await _parse(loc, null, data);
      } catch(e2) {
        body = data;
      }
    }
    */
    throw new JsonLdRequestError('Bad status code.', {
      details: {
        status: e.status,
        url: loc,
        //...(body ? {body} : {})
      }
    });
  }

  // done if no content
  if(!body ||
    (isSequence(body) && body.length === 0)) {
    return {response, data: null};
  }
  // parse data
  const ctHeader = response.headers.get('content-type');
  return {
    response,
    data: await _parse({
      loc,
      base: options.base || loc,
      typer: options.dataType || contentType.parse(ctHeader).type,
      data: body
    })
  };
}

// file
async function _requestFile(loc, options) {
  const fileprefix = 'file://';
  if(loc.indexOf(fileprefix) === 0) {
    loc = loc.substr(fileprefix.length);
  }
  const filedata = await fs.readFile(loc, options.encoding || 'utf8');
  return {
    response: null,
    data: await _parse({
      loc,
      base: options.base || `file://${loc}`,
      type: options.dataType,
      data: filedata
    })
  };
}

/**
 * Request JSON-LD data from a location. Fetching remote resources depends on
 * the node 'request' module. Parsing of RDFa depends on the jsdom and
 * green-turtle RDFa modules.
 *
 * @param {null|string|URL} loc - The location of the resource, one of the
 *   following:
 *   - falsey or -: to read data from stdin.
 *   - URL: URL string beginning with 'http://' or 'https://'.
 *   - *: a filename.
 * @param {object} [options] - Options for request.
 *   See `@digitalbazaar/http-client` docs for other options such as `agent`.
 * @param {string} [options.encoding = 'utf8'] - Input character encoding.
 * @param {string|null} [options.dataType = false] - Data type to expect and
 *   use for parsing the response. Omit or falsy to auto-detect.
 * @param {string|null} [options.base = auto] - Base of document.
 * @param {Array<string>} [options.allow = ['stdin', 'file', 'http', 'https']]
 *   - List of allowed loaders.
 *
 * @returns {object} - Response/data pair {response, data} with a Response for
 *   URLs otherwise null, and the result data.
 */
export async function jsonldRequest(loc, options = {}) {
  const allow = options.allow || ['stdin', 'file', 'http', 'https'];
  if((!loc || loc === '-') && allow.includes('stdin')) {
    return _requestStdin(loc, options);
  } else if(loc.startsWith('http://') && allow.includes('http')) {
    return _requestHttp(loc, options);
  } else if(loc.startsWith('https://') && allow.includes('https')) {
    return _requestHttp(loc, options);
  } else if(allow.includes('file')) {
    return _requestFile(loc, options);
  } else {
    throw new Error(`No allowed loader for "${loc}".`);
  }
}
