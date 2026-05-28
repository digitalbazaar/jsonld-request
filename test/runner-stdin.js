#!/usr/bin/env node
import {jsonldRequest} from '../lib/index.js';

const loc = process.argv[2] || '-';
const options = {allow: ['stdin']};

jsonldRequest(loc, options).then(({data}) => {
  // print only the data as JSON to stdout
  console.log(JSON.stringify(data));
}).catch(err => {
  // print error to stderr
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
});
