#!/usr/bin/env node
import {constants, copyFileSync, existsSync, lstatSync, mkdirSync, realpathSync, statSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILES = {
  codex: ['jev_luna_low.toml', 'jev_luna_medium.toml', 'jev_luna_high.toml', 'jev_sol_high.toml'],
  claude: ['jev-haiku.md', 'jev-sonnet.md', 'jev-opus.md']
};

export function parseInstallArgs(args) {
  let host = null;
  let target = null;
  let apply = false;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--host' && !host && (args[index + 1] === 'codex' || args[index + 1] === 'claude')) host = args[++index];
    else if (args[index] === '--target' && !target && args[index + 1] && !args[index + 1].startsWith('--')) target = args[++index];
    else if (args[index] === '--apply' && !apply) apply = true;
    else throw Error('INVALID_INPUT');
  }
  if (!host || !target) throw Error('INVALID_INPUT');
  return {host, target, apply};
}

function assertRealDirectory(path) {
  if (!existsSync(path) || lstatSync(path).isSymbolicLink() || !statSync(path).isDirectory()) throw Error('INVALID_TARGET');
}

export function planInstall({host, target}) {
  if (!Object.hasOwn(PROFILES, host) || typeof target !== 'string' || !target.trim()) throw Error('INVALID_INPUT');
  const hostRoot = resolve(target);
  assertRealDirectory(hostRoot);
  const actualRoot = realpathSync(hostRoot);
  for (const name of ['skills', 'agents']) {
    const parent = join(actualRoot, name);
    if (existsSync(parent)) assertRealDirectory(parent);
  }
  const skill = join(actualRoot, 'skills', 'jev-lanepilot');
  const files = [
    {from: join(ROOT, 'templates', host, 'SKILL.md'), to: join(skill, 'SKILL.md')},
    {from: join(ROOT, 'src', 'route.mjs'), to: join(skill, 'scripts', 'route.mjs')},
    {from: join(ROOT, 'src', 'jev.mjs'), to: join(skill, 'scripts', 'jev.mjs')},
    ...PROFILES[host].map(name => ({from: join(ROOT, 'templates', host, 'agents', name), to: join(actualRoot, 'agents', name)}))
  ];
  if (existsSync(skill) || files.some(file => existsSync(file.to))) throw Error('COLLISION');
  return {host, target: actualRoot, skill, files, fragment: join(ROOT, 'templates', host, host === 'codex' ? 'AGENTS.fragment.md' : 'CLAUDE.fragment.md')};
}

export function applyInstall(plan) {
  // Recheck immediately before writes; never replace an existing installation or profile.
  planInstall({host: plan.host, target: plan.target});
  mkdirSync(join(plan.skill, 'scripts'), {recursive: true});
  mkdirSync(join(plan.target, 'agents'), {recursive: true});
  for (const file of plan.files) copyFileSync(file.from, file.to, constants.COPYFILE_EXCL);
}

function main() {
  try {
    const args = parseInstallArgs(process.argv.slice(2));
    const plan = planInstall(args);
    if (args.apply) applyInstall(plan);
    const label = args.apply ? 'Installed' : 'Preview';
    process.stdout.write(`${label} ${plan.files.length} files for ${args.host} in ${plan.target}\n`);
    for (const file of plan.files) process.stdout.write(`  ${file.to}\n`);
    process.stdout.write(`Manually review and merge the opt-in instructions from ${plan.fragment}; the installer never edits global instruction files.\n`);
  } catch (error) {
    const code = ['INVALID_INPUT', 'INVALID_TARGET', 'COLLISION'].includes(error?.message) ? error.message : 'INSTALL_FAILED';
    process.stderr.write(JSON.stringify({error: 'Installation could not proceed.', code}) + '\n');
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
