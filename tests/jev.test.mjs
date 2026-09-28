import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate, makeRequest, validateAnswer} from '../src/jev.mjs';

const input = {state: {task: 'Fix a typo.'}, instructions: 'Classify state.task.', criteria: {SMALL: 'Small change', UNKNOWN: 'Insufficient evidence'}};
const response = {ok: true, json: async () => ({model: 'jev-1.13.0', answers: {decision: {type: 'choice', choice: 'SMALL', confidence: 0.8, probabilities: {SMALL: 0.8, UNKNOWN: 0.2}}}, usage: {input_tokens: 8}})};

test('request pins endpoint, model, timeout, and redirect policy', async () => {
  let called = false;
  const result = await evaluate(input, {key: 'local-test-secret', fetchImpl: async (url, options) => {
    called = true;
    assert.equal(url, 'https://api.typesafe.ai/v1/systemone');
    assert.equal(options.redirect, 'error');
    assert.equal(options.signal.aborted, false);
    assert.equal(JSON.parse(options.body).model, 'jev-1.13.0');
    assert.equal(options.headers.Authorization, 'Bearer local-test-secret');
    return response;
  }});
  assert.equal(called, true);
  assert.equal(result.decision, 'SMALL');
  assert.deepEqual(result.usage, {input_tokens: 8});
});

test('credential in parsed context is rejected before fetch even when JSON escapes it', async () => {
  const key = 'quote"slash\\secret';
  let called = false;
  await assert.rejects(evaluate({...input, state: {task: `Contains ${key}`}}, {key, fetchImpl: async () => { called = true; return response; }}), {code: 'REQUEST_REJECTED'});
  assert.equal(called, false);
  assert.throws(() => makeRequest({...input, criteria: {[key]: 'Secret key', UNKNOWN: 'Unknown'}}, key), {code: 'REQUEST_REJECTED'});
  assert.throws(() => makeRequest({...input, state: {nested: {value: key}}}, key), {code: 'REQUEST_REJECTED'});
});

test('missing key, oversized context, malformed response and endpoint failures have safe codes', async () => {
  await assert.rejects(evaluate(input, {key: ''}), {code: 'MISSING_API_KEY'});
  await assert.rejects(evaluate({...input, state: {task: 'x'.repeat(25_000)}}, {key: 'test', fetchImpl: async () => { throw Error('must not call'); }}), {code: 'REQUEST_REJECTED'});
  await assert.rejects(evaluate(input, {key: 'test', fetchImpl: async () => ({ok: false, status: 403, text: async () => 'private'})}), {code: 'HTTP_ERROR'});
  await assert.rejects(evaluate(input, {key: 'test', fetchImpl: async () => { throw Error('private'); }}), {code: 'NETWORK_ERROR'});
  await assert.rejects(evaluate(input, {key: 'test', fetchImpl: async () => ({ok: true, json: async () => ({model: 'jev-1.13.0'})})}), {code: 'INVALID_RESPONSE'});
  await assert.rejects(evaluate(input, {key: 'test', fetchImpl: async () => { throw Object.assign(Error('private'), {name: 'TimeoutError'}); }}), {code: 'TIMEOUT'});
});

test('provider result suppresses credential and rejects invalid choice', () => {
  const valid = {model: 'jev-1.13.0', answers: {decision: {type: 'choice', choice: 'SMALL', confidence: 0.8, probabilities: {SMALL: 0.8, UNKNOWN: 0.2}}}};
  assert.throws(() => validateAnswer({...valid, model: 'secret-key'}, ['SMALL', 'UNKNOWN'], 'secret-key'), {code: 'REQUEST_REJECTED'});
  assert.throws(() => validateAnswer({...valid, answers: {decision: {...valid.answers.decision, choice: 'OTHER'}}}, ['SMALL', 'UNKNOWN'], 'key'), {code: 'INVALID_RESPONSE'});
  const filtered = validateAnswer({...valid, usage: {input_tokens: 4, private_text: 'do not echo', 'bad\nkey': 3}}, ['SMALL', 'UNKNOWN'], 'key');
  assert.deepEqual(filtered.usage, {input_tokens: 4});
});
