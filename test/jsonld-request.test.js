import * as chai from 'chai';
import {promises as fs} from 'node:fs';
import http from 'node:http';
import {jsonldRequest} from '../lib/index.js';
import path from 'node:path';
import {spawn} from 'node:child_process';

const should = chai.should();

describe('jsonldRequest', function() {
  let fixturePath;
  let fixtureData;

  before(async () => {
    fixturePath = path.join(import.meta.dirname, 'data', 'sample.jsonld');
    fixtureData = await fs.readFile(fixturePath, 'utf8');
  });

  it('loads a local file (file://) and parses JSON-LD', async () => {
    const fileUrl = `file://${fixturePath}`;
    const {data} = await jsonldRequest(fileUrl, {allow: ['file']});
    should.exist(data);
    data.should.be.an('object');
    data.should.have.property('@context');
  });

  it('loads JSON-LD over HTTP and parses it', async () => {
    // start local HTTP server to serve the fixture
    const server = http.createServer((req, res) => {
      const headers = {
        'Content-Type': 'application/ld+json; charset=utf-8'
      };
      res.writeHead(200, headers);
      res.end(fixtureData);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address();
    const url = `http://127.0.0.1:${addr.port}/fixture.json`;
    try {
      const {data} = await jsonldRequest(url, {allow: ['http', 'https']});
      should.exist(data);
      data.should.be.an('object');
      data.should.have.property('@context');
    } finally {
      server.close();
    }
  });

  it('reads JSON-LD from stdin (child process runner)', async () => {
    const runner = path.join(import.meta.dirname, 'runner-stdin.js');
    const child = spawn(
      process.execPath,
      [runner, '-']
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => {
      stdout += d.toString();
    });
    child.stderr.on('data', d => {
      stderr += d.toString();
    });

    // write fixture to child's stdin
    child.stdin.write(fixtureData);
    child.stdin.end();

    const exitCode = await new Promise(resolve => child.on('close', resolve));
    if(exitCode !== 0) {
      throw new Error(`Runner exited with ${exitCode}: ${stderr}`);
    }
    const parsed = JSON.parse(stdout);
    should.exist(parsed);
    parsed.should.be.an('object');
    parsed.should.have.property('@context');
  });
});
