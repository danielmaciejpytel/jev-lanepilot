import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {applyInstall, parseInstallArgs, planInstall} from '../scripts/install.mjs';

function temporaryTarget(t, prefix) {
  const target = mkdtempSync(join(tmpdir(), prefix));
  assert.equal(dirname(target), resolve(tmpdir()));
  t.after(() => rmSync(target, {recursive: true, force: true}));
  return target;
}

for (const host of ['codex', 'claude']) test(`${host} preview is read-only; apply copies self-contained skill and profiles`, t => {
  const target = temporaryTarget(t, 'jev-lanepilot-test-');
  const plan = planInstall({host, target});
  assert.equal(existsSync(join(target, 'skills')), false);
  assert.equal(existsSync(join(target, 'agents')), false);
  applyInstall(plan);
  assert.equal(existsSync(join(target, 'skills', 'jev-lanepilot', 'scripts', 'route.mjs')), true);
  assert.equal(existsSync(join(target, 'skills', 'jev-lanepilot', 'scripts', 'jev.mjs')), true);
  assert.equal(plan.files.length, host === 'codex' ? 7 : 6);
  assert.match(readFileSync(join(target, 'skills', 'jev-lanepilot', 'SKILL.md'), 'utf8'), /--host/);
  assert.throws(() => planInstall({host, target}), /COLLISION/);
});

test('existing profile collision is refused without writing skill', t => {
  const target = temporaryTarget(t, 'jev-lanepilot-collision-');
  mkdirSync(join(target, 'agents'));
  writeFileSync(join(target, 'agents', 'jev_luna_low.toml'), 'existing');
  assert.throws(() => planInstall({host: 'codex', target}), /COLLISION/);
  assert.equal(existsSync(join(target, 'skills')), false);
});

test('installer needs explicit host and target; unsupported args fail', () => {
  for (const args of [[], ['--host', 'codex'], ['--target', 'x'], ['--host', 'wrong', '--target', 'x'], ['--host', 'claude', '--target', 'x', '--force']]) assert.throws(() => parseInstallArgs(args), /INVALID_INPUT/);
});
