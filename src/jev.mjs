const ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
const MODEL = 'jev-1.13.0';
const MAX_REQUEST_BYTES = 24_000;
const TIMEOUT_MS = 20_000;
export const ERROR_CODES = Object.freeze(['MISSING_API_KEY', 'INVALID_INPUT', 'REQUEST_REJECTED', 'TIMEOUT', 'NETWORK_ERROR', 'HTTP_ERROR', 'INVALID_RESPONSE', 'INTERNAL_ERROR']);

export class JevError extends Error {
  constructor(code) {
    super(code);
    this.name = 'JevError';
    this.code = ERROR_CODES.includes(code) ? code : 'INTERNAL_ERROR';
  }
}

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const probability = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;

// Inspect parsed keys and values: searching serialized JSON alone misses escaped credentials.
export function containsSecret(value, secret, seen = new Set()) {
  if (!secret) return false;
  if (typeof value === 'string') return value.includes(secret);
  if (!value || typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);
  return Object.entries(value).some(([key, item]) => key.includes(secret) || containsSecret(item, secret, seen));
}

export function makeRequest(input, key) {
  if (!object(input) || !object(input.state) || typeof input.instructions !== 'string' || !input.instructions.trim() || !object(input.criteria)) throw new JevError('INVALID_INPUT');
  const choices = Object.keys(input.criteria);
  if (choices.length < 2 || choices.length > 255 || !Object.values(input.criteria).every(value => typeof value === 'string' && value.trim())) throw new JevError('INVALID_INPUT');
  if (containsSecret(input, key)) throw new JevError('REQUEST_REJECTED');
  let body;
  try { body = JSON.stringify({model: MODEL, state: input.state, questions: {decision: {type: 'choice', instructions: input.instructions, criteria: input.criteria}}}); }
  catch { throw new JevError('INVALID_INPUT'); }
  if (!body || (key && (body.includes(key) || body.includes(JSON.stringify(key).slice(1, -1))))) throw new JevError('REQUEST_REJECTED');
  if (Buffer.byteLength(body) > MAX_REQUEST_BYTES) throw new JevError('REQUEST_REJECTED');
  return {body, choices};
}

export function validateAnswer(data, choices, key) {
  const answer = data?.answers?.decision;
  if (typeof data?.model !== 'string' || !/^[A-Za-z0-9._-]{1,100}$/.test(data.model) || answer?.type !== 'choice' || !choices.includes(answer.choice) || !probability(answer.confidence) || !object(answer.probabilities) || !choices.every(choice => probability(answer.probabilities[choice]))) throw new JevError('INVALID_RESPONSE');
  const usage = object(data.usage) ? Object.fromEntries(Object.entries(data.usage).filter(([name, value]) => /^[A-Za-z0-9_]{1,60}$/.test(name) && typeof value === 'number' && Number.isFinite(value))) : null;
  const result = {model: data.model, decision: answer.choice, confidence: answer.confidence, probabilities: Object.fromEntries(choices.map(choice => [choice, answer.probabilities[choice]])), usage};
  if (containsSecret(result, key)) throw new JevError('REQUEST_REJECTED');
  return result;
}

export async function evaluate(input, {key = process.env.TYPESAFE_API_KEY, fetchImpl = globalThis.fetch} = {}) {
  if (typeof key !== 'string' || !key.trim()) throw new JevError('MISSING_API_KEY');
  const token = key.trim();
  const {body, choices} = makeRequest(input, token);
  let response;
  try {
    response = await fetchImpl(ENDPOINT, {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`}, body, signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'error'});
  } catch (error) {
    throw new JevError(error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR');
  }
  if (!response?.ok) throw new JevError('HTTP_ERROR');
  let data;
  try { data = await response.json(); } catch { throw new JevError('INVALID_RESPONSE'); }
  return validateAnswer(data, choices, token);
}
