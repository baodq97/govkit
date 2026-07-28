#!/usr/bin/env node
// Renders docs/domain/view/domain-view.html from model.json + template.html.
// model.json is the single source of truth; the HTML is a build artifact.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const model = JSON.parse(readFileSync(join(here, 'model.json'), 'utf8'));
const template = readFileSync(join(here, 'template.html'), 'utf8');

// Inline the payload so the page opens from file:// with no server and no network.
const payload = JSON.stringify(model).replace(/<\//g, '<\\/');
const out = template.replace('__MODEL_JSON__', payload);
if (out === template) throw new Error('marker __MODEL_JSON__ not found in template.html');

writeFileSync(join(here, 'domain-view.html'), out);
console.log(
  `domain-view.html written — ${model.contexts.length} contexts, ` +
  `${model.eventFlow.length} events, ${model.conflicts.length} conflicts, ` +
  `${model.unknowns.length} unknowns, ${model.decisions.length} decisions`
);
