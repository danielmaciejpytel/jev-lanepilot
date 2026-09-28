import test from 'node:test';
import assert from 'node:assert/strict';
import {parseArgs, route, selectRoute, validateState} from '../src/route.mjs';

const state = {task: 'Fix a bounded local bug.', evidence: 'Function and expected behavior are known.'};
const answer = decision => ({model: 'jev-1.13.0', decision, confidence: 0.8, usage: {input_tokens: 10}});

test('all known lanes map to host workers', () => {
  for (const [host, mapping] of Object.entries({
    codex: {LUNA_LOW: ['gpt-6-luna', 'low'], LUNA_MEDIUM: ['gpt-6-luna', 'medium'], LUNA_HIGH: ['gpt-6-luna', 'high'], SOL_HIGH: ['gpt-6-sol', 'high']},
    claude: {HAIKU: ['haiku'], SONNET: ['sonnet'], OPUS: ['opus']}
  })) {
    for (const [lane, [model, effort]] of Object.entries(mapping)) {
      const result = selectRoute(host, state, answer(lane));
      assert.equal(result.lane, lane);
      assert.equal(result.model, model);
      assert.equal(result.reasoning_effort, effort);
      assert.equal(result.source, 'jev');
    }
  }
});

test('unknown has no actionable worker', async () => {
  const result = await route('codex', state, {evaluateImpl: async () => answer('UNKNOWN')});
  assert.equal(result.lane, 'UNKNOWN');
  assert.equal(result.needs_context, true);
  assert.equal('agent' in result, false);
  assert.equal('model' in result, false);
});

test('risk and repeated failures enforce local floors without calling Jev', async () => {
  for (const host of ['codex', 'claude']) {
    for (const patch of [{security_sensitive: true}, {architectural_uncertainty: true}, {failed_attempts: 2}]) {
      const result = await route(host, {...state, ...patch}, {evaluateImpl: () => { throw Error('must not call'); }});
      assert.equal(result.lane, host === 'codex' ? 'SOL_HIGH' : 'OPUS');
      assert.equal(result.source, 'local_policy');
    }
  }
});

test('offline and service failure are disclosed local fallbacks', async () => {
  const offline = await route('claude', state, {offline: true, evaluateImpl: () => { throw Error('must not call'); }});
  assert.equal(offline.lane, 'SONNET');
  assert.equal(offline.source, 'offline');
  const unavailable = await route('codex', state, {evaluateImpl: async () => { throw {code: 'HTTP_ERROR', secret: 'private'}; }});
  assert.equal(unavailable.lane, 'LUNA_MEDIUM');
  assert.equal(unavailable.source, 'local_fallback');
  assert.equal(unavailable.fallback_reason, 'HTTP_ERROR');
  assert.equal(JSON.stringify(unavailable).includes('private'), false);
});

test('invalid input and unsupported flags are rejected', () => {
  for (const invalid of [{}, {...state, other: true}, {...state, failed_attempts: -1}, {...state, security_sensitive: 'yes'}]) assert.throws(() => validateState(invalid), {code: 'INVALID_INPUT'});
  for (const args of [[], ['--host', 'other'], ['--host', 'codex', '--x'], ['--host', 'claude', '--host', 'codex']]) assert.throws(() => parseArgs(args), {code: 'INVALID_INPUT'});
});
