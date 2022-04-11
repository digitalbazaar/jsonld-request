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
import getStdin from 'get-stdin';
import got from 'got';
import jsonld from 'jsonld';
import rdfa from 'rdfa';
import {DOMParser} from '@xmldom/xmldom';
import {promises as fs} from 'node:fs';

/**
 * Custom error container.
 */
class JsonLdRequestError extends Error {
  constructor(message, options) {
    super(message, options);
    if('details' in options) {
      this.details = options.details;
    }
  }
}

/**
 * Clones an object, array, or string/number.
 *
 * @param value the value to clone.
 *
 * @return the cloned value.
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
 * @param loc location string came from
 * @param type content type of the string
 * @param data the data string or buffer
 *
 * @return result data
 */
async function _typedParse(loc, type, data) {
  switch(type.toLowerCase()) {
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
        const rdfaProcessor = {
          xml: rdfa.RDFaXMLParser,
          'text/xml': rdfa.RDFaXMLParser,
          html: rdfa.RDFaHTMLParser,
          xhtml: rdfa.RDFaXHTMLParser,
          'text/html': rdfa.RDFaHTMLParser,
          'application/xhtml+xml': rdfa.RDFaXHTMLParser
        }[type.toLowerCase()];
        // input is RDFa
        const document = new DOMParser()
          .parseFromString(data, type.toLowerCase());
        const result = rdfa.parseDOM(rdfaProcessor, loc, document, {});
        const lines = [];
        // FIXME: toTurtle/toNT/toNQ
        result.outputGraph.forEach(n => lines.push(n.toNT()));
        const rdf = lines.join('');
        //return jsonld.fromRDF(rdf, {format: 'rdfa-api'});
        return jsonld.fromRDF(rdf, {format: 'application/n-quads'});
      } catch(e) {
        // FIXME: expose RDFa/jsonld ex?
        throw new JsonLdRequestError('RDFa extraction error.', {
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

// http://stackoverflow.com/questions/280634/endswith-in-javascript
function endsWith(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

// check if data is a string or buffer sequence of data
function isSequence(data) {
  return typeof data === 'string' || Buffer.isBuffer(data);
}

/**
 * Parse data.
 *
 * @param loc location the data came from
 * @param type content type of the string or null to attempt to auto-detect
 * @param data the data string or buffer
 *
 * @return result data
 */
async function _parse(loc, type, data) {
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
  if(type && type !== 'auto') {
    return _typedParse(loc, type, data);
  }
  // typed via text-like extension
  if(loc && (endsWith(loc, '.txt'))) {
    return _typedParse(loc, 'text', data);
  }
  // typed via JSON-like extension
  if(loc && (endsWith(loc, '.json') ||
    endsWith(loc, '.jsonld') ||
    endsWith(loc, '.json-ld'))) {
    return _typedParse(loc, 'json', data);
  }
  // typed via HTML-like extension
  if(loc && (endsWith(loc, '.xml') ||
    endsWith(loc, '.html') ||
    endsWith(loc, '.xhtml'))) {
    return _typedParse(loc, 'html', data);
  }
  // try ~JSON
  try {
    return _typedParse(loc, 'application/ld+json', data);
  } catch(err) {
    // try ~HTML
    try {
      return _typedParse(loc, 'text/html', data);
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
  return _parse(loc, options.dataType, await getStdin());
}

// http
async function _requestHttp(loc, options) {
  // clone and setup request options
  const opts = _clone(options);
  opts.url = loc;
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
  try {
    response = await got(opts);
  } catch(e) {
    /*
    let body;
    if(e.response.body) {
      // attempt to auto-parse error body
      try {
        body = await _parse(loc, null, e.response.body);
      } catch(e2) {
        //body = e.response.body;
      }
    }
    */
    throw new JsonLdRequestError('Bad status code.', {
      details: {
        statusCode: e.response.statusCode,
        code: e.code,
        url: loc,
        //...(body ? {body} : {})
      }
    });
  }

  // done if no content
  if(!response.body ||
    (isSequence(response.body) && response.body.length === 0)) {
    return {response, data: null};
  }
  // parse data
  const dataType = options.dataType || contentType.parse(response).type;
  const data = await _parse(loc, dataType, response.body);
  return {response, data};
}

// file
async function _requestFile(loc, options) {
  const fileprefix = 'file://';
  if(loc.indexOf(fileprefix) === 0) {
    loc = loc.substr(fileprefix.length);
  }
  const filedata = await fs.readFile(loc, options.encoding || 'utf8');
  const data = await _parse(loc, options.type, filedata);
  return {response: null, data};
}

/**
 * Request JSON-LD data from a location. Fetching remote resources depends on
 * the node 'request' module. Parsing of RDFa depends on the jsdom and
 * green-turtle RDFa modules.
 *
 * @param loc the location of the resource, one of the following:
 *        falsey or -: to read data from stdin.
 *        URL: URL string beginning with 'http://' or 'https://'.
 *        *: a filename
 * @param [options] options
 *          encoding: input character encoding (default: 'utf8')
 *          dataType: data type to expect and use for parsing the response.
 *            omit or falsy to auto-detect. (default: auto)
 *          *: see 'got' module options
 *
 * @return {response, data} called when done with possible
 *          error, http.ClientResponse for URLS else null, and the result
 *          data.
 */
export async function request(loc, options = {}) {
  let response = null;
  let data;
  if(!loc || loc === '-') {
    data = await _requestStdin(loc, options);
  } else if(loc.indexOf('http://') === 0 || loc.indexOf('https://') === 0) {
    ({response, data} = await _requestHttp(loc, options));
  } else {
    data = await _requestFile(loc, options);
  }
  return {response, data: await _parse(loc, options.dataType, data)};
}
