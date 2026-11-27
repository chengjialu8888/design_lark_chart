#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { restoreIndex } from './state.mjs';
import { validateScenes, frameIndexAt, pauseVisualAnimations } from './scene-model.mjs';
import { normalizePlayback, createPlayback } from './playback.mjs';
import {resolveRelations,auditScenes} from './scene-contract.mjs';
import {routePoints,fitNodeSize,canvasGeometry,logicalBox,cubicProgress,transferPoint} from './scene-geometry.mjs';
import {visualProgress,transferVisual,legendEntries} from './scene-visuals.mjs';
import {semanticIcons} from './icons.mjs';
import {resolveStyle,stylePresets,styleId,newStory} from './styles.mjs';

const fail = message => { throw new Error(message); };
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const requiredText = (value, field) => typeof value === 'string' && value.trim() ? value : fail(`${field}: expected nonempty text`);
const identifier = (value, field) => /^[a-z][a-z0-9-]*$/.test(requiredText(value, field)) ? value : fail(`${field}: invalid identifier`);

/** Validate references before rendering. The prototype supports up to six diagram nodes. */
export function validate(spec) {
  normalizePlayback(spec?.playback);
  if (spec?.version === 2) {
    spec=resolveStyle(spec);
    const resolved=resolveRelations(spec);validateScenes(resolved);
    const report=auditScenes(resolved);
    if(report.errors.length)fail(report.errors.map(e=>`${e.where}: ${e.message}`).join('\n'));
    return spec;
  }
  if (!isRecord(spec) || spec.version !== 1) fail('Expected story version 1');
  identifier(spec.id, 'id');
  requiredText(spec.title, 'title');
  requiredText(spec.notice, 'notice');
  if (!Array.isArray(spec.nodes) || spec.nodes.length < 2 || spec.nodes.length > 6) fail('nodes: expected 2–6 nodes');
  if (!Array.isArray(spec.edges) || !Array.isArray(spec.steps) || !spec.steps.length) fail('edges and nonempty steps are required');
  const nodes = new Set(), edges = new Set();
  const lanes = new Set(), slots = new Set();
  if (spec.lanes !== undefined) {
    if (!Array.isArray(spec.lanes) || spec.lanes.length < 2 || spec.lanes.length > 3) fail('lanes: expected 2–3 lanes');
    for (const lane of spec.lanes) {
      if (!isRecord(lane)) fail('Invalid lane');
      identifier(lane.id, 'lane.id'); requiredText(lane.label, 'lane.label');
      if (lanes.has(lane.id)) fail(`Duplicate lane: ${lane.id}`);
      lanes.add(lane.id);
    }
  }
  for (const node of spec.nodes) {
    if (!isRecord(node)) fail('Invalid node');
    identifier(node.id, 'node.id');
    if (nodes.has(node.id)) fail(`Duplicate node: ${node.id}`);
    nodes.add(node.id);
    requiredText(node.label, 'node.label'); requiredText(node.role, 'node.role');
    if (lanes.size) {
      if (!lanes.has(node.lane) || !Number.isInteger(node.row) || node.row < 0 || node.row > 2) fail(`Invalid lane/row: ${node.id}`);
      const slot = `${node.lane}:${node.row}`;
      if (slots.has(slot)) fail(`Overlapping nodes at ${slot}`);
      slots.add(slot);
    }
  }
  for (const edge of spec.edges) {
    if (!isRecord(edge)) fail('Invalid edge');
    identifier(edge.id, 'edge.id');
    if (edges.has(edge.id)) fail(`Duplicate edge: ${edge.id}`);
    if (!nodes.has(edge.from) || !nodes.has(edge.to) || edge.from === edge.to) fail(`Invalid edge endpoints: ${edge.id}`);
    edges.add(edge.id);
  }
  spec.steps.forEach((step, i) => {
    if (!isRecord(step)) fail(`Invalid step ${i}`);
    for (const key of ['label', 'detail', 'payload', 'task']) requiredText(step[key], `steps[${i}].${key}`);
    for (const [key, ids] of [['active', nodes], ['edges', edges]]) {
      if (!Array.isArray(step[key]) || step[key].some(id => !ids.has(id))) fail(`steps[${i}].${key}: unknown reference`);
      if (new Set(step[key]).size !== step[key].length) fail(`steps[${i}].${key}: duplicate reference`);
    }
    if (!isRecord(step.status) || Object.entries(step.status).some(([id, value]) => !nodes.has(id) || typeof value !== 'string')) fail(`steps[${i}].status: invalid node status`);
  });
  return spec;
}

/** Each step is a full snapshot: jumping backward never carries stale state. */
export function stateAt(spec, index) {
  if (!Number.isInteger(index) || index < 0 || index >= spec.steps.length) fail('Step index out of range');
  const step = spec.steps[index];
  return {...step, status: Object.fromEntries(spec.nodes.map(n => [n.id, step.status[n.id] || '待命']))};
}

export async function compile(spec) {
  validate(spec);
  if(spec.version===2)spec=resolveRelations(resolveStyle(spec));
  const prefix = spec.version === 2 ? 'scene-' : '';
  const template = await readFile(new URL(`./${prefix}template.html`, import.meta.url), 'utf8');
  const runtime = await readFile(new URL(`./${prefix}player.js`, import.meta.url), 'utf8');
  // JSON is data, not executable markup; escape script termination and line separators.
  const json = JSON.stringify(spec).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const player = runtime.replaceAll('__STORY_ID__', spec.id).replace('__STORY_STATE__', () => restoreIndex.toString()).replace('__STORY_FRAME__', () => frameIndexAt.toString()).replace('__STORY_PAUSE__',()=>pauseVisualAnimations.toString()).replace('__STORY_ROUTE__',()=>routePoints.toString()).replace('__STORY_FIT__',()=>fitNodeSize.toString()).replace('__STORY_VISUAL_PROGRESS__',()=>visualProgress.toString()).replace('__STORY_ICONS__',()=>JSON.stringify(semanticIcons)).replace('__STORY_LEGEND__',()=>legendEntries.toString()).replace('__STORY_PLAYBACK__', () => `${normalizePlayback.toString()}\n${createPlayback.toString()}`);
  const sharedPlayer=player.replace('__STORY_GEOMETRY__',()=>`${canvasGeometry.toString()}\n${logicalBox.toString()}\n${cubicProgress.toString()}\n${transferPoint.toString()}\n${transferVisual.toString()}`);
  const html=template.replaceAll('__STORY_ID__', spec.id).replace('__STORY_DATA__', () => json).replace('__STORY_PLAYER__', () => sharedPlayer);
  if(spec.version!==2)return html;
  const theme=await readFile(new URL('./module-theme.css',import.meta.url),'utf8');
  // Apply the bundled visual rules before the player starts, avoiding startup
  // color transitions and keeping both inline and offline scenes self-contained.
  return html.replace('<script>\n',()=>`<style>${theme.replaceAll('__ROOT__','#'+spec.id)}</style><script>\n`);
}

/** Standalone output has no dependency on Codex, a CDN, or a web server. */
export async function exportPage(spec) {
  const html = await compile(spec);
  const css = await readFile(new URL('./standalone.css', import.meta.url), 'utf8');
  const title = spec.title.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return `<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"><title>${title}</title><style>${css}</style></head><body><main>${html}</main></body></html>\n`;
}

async function main(args) {
  if(args[0]==='styles'&&args.length===1)return console.log(JSON.stringify(stylePresets,null,2));
  const styleIndex=args.indexOf('--style');
  let selection;
  if(styleIndex!==-1){
    selection=styleId(args[styleIndex+1]);
    args=[...args.slice(0,styleIndex),...args.slice(styleIndex+2)];
  }
  if (args.length === 1 && args[0] === '--version') return console.log('architecture-story '+JSON.parse(await readFile(new URL('./package.json',import.meta.url),'utf8')).version);
  if (args.length === 1 && args[0] === '--help') return console.log('architecture-story styles\narchitecture-story select <story.json> <selected.json> --style compact|module|sequence\narchitecture-story check <story.json> [--style compact|module|sequence]\narchitecture-story audit <story.json> [--strict] [--style compact|module|sequence]\narchitecture-story build <story.json> <fragment.html> [--style compact|module|sequence]\narchitecture-story export <story.json> <standalone.html> [--style compact|module|sequence]\nChinese style labels are also accepted. select persists the choice without changing poses or explicit visuals.');
  const [command, input, output, ...rest] = args;
  if(command==='select'){
    if(!input||!output||rest.length||!selection)fail('Usage: architecture-story select <story.json> <selected.json> --style compact|module|sequence');
    const spec=newStory(JSON.parse(await readFile(input,'utf8')),selection);
    validate(spec);
    await writeFile(output,JSON.stringify(spec,null,2)+'\n',{flag:'wx'});
    return console.log(`Selected ${stylePresets[selection].label}: ${output}`);
  }
  if(command==='audit'&&input&&!rest.length&&(!output||output==='--strict')){
    const spec=resolveStyle(JSON.parse(await readFile(input,'utf8')),selection);
    let report;
    if(spec.version===2){normalizePlayback(spec.playback);const resolved=resolveRelations(spec);validateScenes(resolved);report=auditScenes(resolved);}
    else {validate(spec);report={errors:[],warnings:[{where:'version',message:'Semantic audit requires scene schema v2.'}]};}
    console.log(JSON.stringify(report,null,2));if(report.errors.length||(output==='--strict'&&report.warnings.length))process.exitCode=1;return;
  }
  if (!['check', 'build', 'export'].includes(command) || !input || rest.length || (command === 'check' && output) || (command !== 'check' && !output)) {
    fail('Usage: architecture-story check <story.json> | audit <story.json> [--strict] | build|export <story.json> <output.html>');
  }
  const spec = validate(resolveStyle(JSON.parse(await readFile(input, 'utf8')),selection));
  if (command === 'check') return console.log(spec.version === 2 ? `OK: ${spec.actors.length} actors, ${spec.scenes.length} scenes` : `OK: ${spec.nodes.length} nodes, ${spec.steps.length} steps`);
  // Exclusive creation protects hand-edited or unrelated output from accidental overwrite.
  await writeFile(output, command === 'export' ? await exportPage(spec) : await compile(spec), {flag: 'wx'});
  console.log(`Built ${output}`);
}
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
