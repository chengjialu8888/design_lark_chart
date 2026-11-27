import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function parseArguments(argumentsList) {
  const options = { width: 1440, height: 1000, scripts: false, force: false };
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === '--allow-scripts') options.scripts = true;
    else if (argument === '--force') options.force = true;
    else if (['--out', '--browser', '--width', '--height'].includes(argument)) {
      const value = argumentsList[++index];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${argument}`);
      options[argument.slice(2)] = ['--width', '--height'].includes(argument) ? Number(value) : value;
    } else if (!argument.startsWith('--') && !options.input) options.input = argument;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!options.input || !options.out) throw new Error('Usage: node check_render.mjs input.html --out preview.png [--browser PATH] [--width 1440 --height 1000] [--allow-scripts] [--force]');
  if (!['.html', '.htm', '.svg'].includes(path.extname(options.input).toLowerCase())) throw new Error('Input must be HTML or SVG');
  if (path.extname(options.out).toLowerCase() !== '.png') throw new Error('Output must use .png');
  for (const key of ['width', 'height']) {
    if (!Number.isInteger(options[key]) || options[key] < 200 || options[key] > 10000) throw new Error(`${key} must be an integer in [200,10000]`);
  }
  return options;
}

function inspectPage() {
  const errors = [];
  const warnings = [];
  const skipped = [];
  const rectangle = element => {
    const bounds = element.getBoundingClientRect();
    return { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom, width: bounds.width, height: bounds.height };
  };
  const contains = (outer, inner, tolerance = 1) => inner.left >= outer.left - tolerance && inner.top >= outer.top - tolerance && inner.right <= outer.right + tolerance && inner.bottom <= outer.bottom + tolerance;
  const overlaps = (first, second) => Math.min(first.right, second.right) - Math.max(first.left, second.left) > 2 && Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top) > 2;
  const visible = element => {
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && element.getBoundingClientRect().width > 0;
  };
  const unrotated = element => {
    const matrix = element.getScreenCTM();
    return matrix && Math.abs(matrix.b) < 0.00001 && Math.abs(matrix.c) < 0.00001;
  };
  const nodes = new Map();
  for (const element of document.querySelectorAll('[data-viz-node]')) {
    if (!element.id || nodes.has(element.id)) {
      errors.push('NODE_ID_MISSING_OR_DUPLICATE');
      continue;
    }
    if (element.localName !== 'rect' || !unrotated(element) || !visible(element)) {
      skipped.push(`NODE_GEOMETRY_UNSUPPORTED: ${element.id}`);
      continue;
    }
    nodes.set(element.id, { element, bounds: rectangle(element), parent: element.dataset.vizParent, kind: element.dataset.vizNode });
  }
  const ancestors = identity => {
    const found = new Set();
    let parent = nodes.get(identity)?.parent;
    while (parent) {
      if (found.has(parent) || parent === identity) {
        errors.push(`PARENT_CYCLE: ${identity}`);
        break;
      }
      found.add(parent);
      if (!nodes.has(parent)) {
        errors.push(`PARENT_NOT_CHECKABLE: ${identity} -> ${parent}`);
        break;
      }
      parent = nodes.get(parent).parent;
    }
    return found;
  };
  const nodeEntries = [...nodes.entries()];
  for (const [identity, node] of nodeEntries) {
    ancestors(identity);
    const svg = node.element.ownerSVGElement;
    if (!svg || !contains(rectangle(svg), node.bounds)) errors.push(`NODE_OUTSIDE_SVG: ${identity}`);
    if (node.parent && nodes.has(node.parent)) {
      const parent = nodes.get(node.parent);
      if (parent.kind !== 'container' || !contains(parent.bounds, node.bounds)) errors.push(`INVALID_CONTAINMENT: ${identity}`);
    }
  }
  for (let first = 0; first < nodeEntries.length; first += 1) {
    for (let second = first + 1; second < nodeEntries.length; second += 1) {
      const [firstId, firstNode] = nodeEntries[first];
      const [secondId, secondNode] = nodeEntries[second];
      if (firstNode.element.ownerSVGElement !== secondNode.element.ownerSVGElement) continue;
      if (ancestors(firstId).has(secondId) || ancestors(secondId).has(firstId)) continue;
      if (overlaps(firstNode.bounds, secondNode.bounds)) errors.push(`NODE_OVERLAP: ${firstId}, ${secondId}`);
    }
  }
  const textEntries = [];
  for (const element of document.querySelectorAll('svg text')) {
    if (!visible(element)) continue;
    const bounds = rectangle(element);
    const label = element.textContent.trim().slice(0, 100);
    const svg = element.ownerSVGElement;
    if (!contains(rectangle(svg), bounds)) errors.push(`TEXT_OUTSIDE_SVG: ${label}`);
    const owner = element.dataset.vizOwner;
    if (owner && (!nodes.has(owner) || !contains(nodes.get(owner).bounds, bounds))) errors.push(`TEXT_OUTSIDE_OWNER: ${label}`);
    const matrix = element.getScreenCTM();
    const effectiveSize = parseFloat(getComputedStyle(element).fontSize) * Math.hypot(matrix?.a || 0, matrix?.b || 0);
    if (effectiveSize < 12) warnings.push(`SMALL_TEXT_REVIEW: ${label} (${effectiveSize.toFixed(1)}px)`);
    textEntries.push({ svg, bounds, label });
  }
  for (let first = 0; first < textEntries.length; first += 1) {
    for (let second = first + 1; second < textEntries.length; second += 1) {
      const firstText = textEntries[first];
      const secondText = textEntries[second];
      if (firstText.svg === secondText.svg && overlaps(firstText.bounds, secondText.bounds)) warnings.push(`TEXT_OVERLAP_REVIEW: ${firstText.label} / ${secondText.label}`);
    }
  }
  const segmentHits = (start, end, bounds) => {
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    let lower = 0;
    let upper = 1;
    const constraints = [[-deltaX, start.x - bounds.left - 2], [deltaX, bounds.right - 2 - start.x], [-deltaY, start.y - bounds.top - 2], [deltaY, bounds.bottom - 2 - start.y]];
    for (const [coefficient, distance] of constraints) {
      if (Math.abs(coefficient) < 1e-10) {
        if (distance < 0) return false;
      } else if (coefficient < 0) lower = Math.max(lower, distance / coefficient);
      else upper = Math.min(upper, distance / coefficient);
    }
    return lower <= upper && upper > 0.001 && lower < 0.999;
  };
  let checkedEdges = 0;
  const edgeElements = [...document.querySelectorAll('[data-viz-from], [data-viz-to], [data-viz-kind]')];
  for (const element of edgeElements) {
    const source = element.dataset.vizFrom;
    const target = element.dataset.vizTo;
    const label = element.id || `${source} -> ${target}`;
    if (!nodes.has(source) || !nodes.has(target)) {
      errors.push(`EDGE_ENDPOINT_NOT_CHECKABLE: ${label}`);
      continue;
    }
    if (!element.dataset.vizKind) errors.push(`EDGE_KIND_MISSING: ${label}`);
    if (!['line', 'polyline'].includes(element.localName) || !unrotated(element)) {
      skipped.push(`EDGE_GEOMETRY_UNSUPPORTED: ${label}`);
      continue;
    }
    const matrix = element.getScreenCTM();
    const original = element.localName === 'line'
      ? [{ x: element.x1.baseVal.value, y: element.y1.baseVal.value }, { x: element.x2.baseVal.value, y: element.y2.baseVal.value }]
      : Array.from({ length: element.points.numberOfItems }, (unused, index) => element.points.getItem(index));
    if (original.length < 2) {
      errors.push(`EDGE_POINTS_MISSING: ${label}`);
      continue;
    }
    const points = original.map(point => new DOMPoint(point.x, point.y).matrixTransform(matrix));
    checkedEdges += 1;
    const ignored = new Set([source, target, ...ancestors(source), ...ancestors(target)]);
    for (const [identity, node] of nodeEntries) {
      if (ignored.has(identity) || node.element.ownerSVGElement !== element.ownerSVGElement) continue;
      if (points.slice(1).some((end, index) => segmentHits(points[index], end, node.bounds))) errors.push(`EDGE_THROUGH_NODE: ${label}, ${identity}`);
    }
    for (const [identity, point] of [[source, points[0]], [target, points.at(-1)]]) {
      const bounds = nodes.get(identity).bounds;
      const within = point.x >= bounds.left - 3 && point.x <= bounds.right + 3 && point.y >= bounds.top - 3 && point.y <= bounds.bottom + 3;
      const distance = Math.min(Math.abs(point.x - bounds.left), Math.abs(point.x - bounds.right), Math.abs(point.y - bounds.top), Math.abs(point.y - bounds.bottom));
      if (!within || distance > 3) errors.push(`EDGE_OFF_BOUNDARY: ${label}, ${identity}`);
    }
  }
  const svgCount = document.querySelectorAll('svg').length;
  for (const image of document.querySelectorAll('img')) {
    if (!image.complete || image.naturalWidth === 0) errors.push(`IMAGE_NOT_LOADED: ${image.getAttribute('src')}`);
  }
  if (document.querySelector('canvas')) warnings.push('CANVAS_PIXELS_REQUIRE_VISUAL_REVIEW');
  if (!svgCount && !document.querySelector('img, canvas') && !document.body?.innerText?.trim()) errors.push('EMPTY_VISIBLE_CONTENT');
  const graphSvgs = [...document.querySelectorAll('svg')].filter(svg => svg.getAttribute('aria-hidden') !== 'true' && svg.dataset.vizType !== 'chart');
  for (const svg of graphSvgs) {
    if (!svg.querySelector('[data-viz-node]')) skipped.push(`GRAPH_GEOMETRY_NOT_CHECKED: ${svg.id || 'unmarked SVG'}`);
  }
  if (document.documentElement.scrollWidth > window.innerWidth + 1) errors.push('PAGE_HORIZONTAL_OVERFLOW');
  return {
    errors: [...new Set(errors)], warnings: [...new Set(warnings)], skipped: [...new Set(skipped)],
    counts: { svg: svgCount, nodes: nodes.size, edges: checkedEdges, text: textEntries.length },
    page: { width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, fontStatus: document.fonts.status },
    coverage: { graph_geometry: nodes.size ? skipped.length ? 'partial' : 'checked_supported_subset' : graphSvgs.length ? 'not_run' : 'not_applicable', rendered_svg_text: 'checked_bounds_only', source_fidelity: 'not_run', visual_review: 'not_run', css_clipping_and_glyph_coverage: 'not_run' }
  };
}

async function main() {
  let browser;
  let wrapperDirectory;
  try {
    const options = parseArguments(process.argv.slice(2));
    const input = await fs.realpath(options.input);
    const output = path.resolve(options.out);
    if (!options.force) {
      try {
        await fs.access(output);
        throw new Error('Preview exists; choose a new path or explicitly use --force');
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    await fs.access(path.dirname(output));
    const raw = await fs.readFile(input);
    let renderInput = input;
    if (path.extname(input).toLowerCase() === '.svg') {
      const svg = raw.toString('utf8').replace(/^\uFEFF/, '').replace(/^\s*<\?xml[^?]*\?>\s*/i, '');
      if (/<!\s*(DOCTYPE|ENTITY)\b/i.test(svg)) throw new Error('SVG DTD/entity declarations are outside the supported preview subset');
      wrapperDirectory = await fs.mkdtemp(path.join(tmpdir(), 'research-viz-preview-'));
      renderInput = path.join(wrapperDirectory, 'preview.html');
      const base = pathToFileURL(`${path.dirname(input)}${path.sep}`).href.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
      await fs.writeFile(renderInput, `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><base href="${base}"><title>SVG preview</title><style>html,body{margin:0;padding:0}body>svg{display:block;width:100%;height:auto}</style></head><body>${svg}</body></html>`);
      renderInput = await fs.realpath(renderInput);
    }
    const require = createRequire(import.meta.url);
    let chromium;
    try {
      ({ chromium } = require('playwright'));
    } catch {
      throw new Error('Playwright is unavailable. Use an existing installation via NODE_PATH; no dependency was installed.');
    }
    browser = await chromium.launch({ headless: true, chromiumSandbox: true, ...(options.browser ? { executablePath: options.browser } : {}) });
    const context = await browser.newContext({ viewport: { width: options.width, height: options.height }, deviceScaleFactor: 1, javaScriptEnabled: options.scripts, reducedMotion: 'reduce', serviceWorkers: 'block' });
    const blocked = [];
    const failures = [];
    const runtimeErrors = [];
    await context.route('**/*', async route => {
      const url = route.request().url();
      let allowed = url.startsWith('data:') || url === 'about:blank';
      if (url.startsWith('file:')) {
        try {
          const resource = await fs.realpath(fileURLToPath(url));
          const relative = path.relative(path.dirname(input), resource);
          allowed = resource === renderInput || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
        } catch {
          allowed = false;
        }
      }
      if (allowed) await route.continue();
      else {
        blocked.push(url);
        await route.abort();
      }
    });
    const page = await context.newPage();
    page.on('pageerror', error => runtimeErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
    page.on('requestfailed', request => failures.push(request.url()));
    await page.goto(pathToFileURL(renderInput).href, { waitUntil: 'load', timeout: 20000 });
    const fontDeadline = Date.now() + 5000;
    while (await page.evaluate(() => document.fonts.status) !== 'loaded') {
      if (Date.now() >= fontDeadline) throw new Error('Font readiness timed out');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const result = await page.evaluate(inspectPage);
    if (blocked.length) result.errors.push('RESOURCE_REQUEST_BLOCKED');
    if (failures.length) result.errors.push('RESOURCE_LOAD_FAILED');
    if (runtimeErrors.length) result.errors.push('PAGE_SCRIPT_ERRORS');
    const fullPage = result.page.height <= 16000;
    if (!fullPage) result.warnings.push('PREVIEW_VIEWPORT_ONLY: page exceeds 16000px');
    await page.screenshot({ path: output, fullPage, animations: 'disabled', timeout: 20000 });
    result.status = result.errors.length ? 'failed' : result.warnings.length || result.skipped.length ? 'needs_review' : 'checks_passed';
    Object.assign(result, { source: input, sha256: createHash('sha256').update(raw).digest('hex'), preview: output, svg_preview_wrapper: renderInput !== input, scripts_enabled: options.scripts, blocked, failed_requests: [...new Set(failures)], runtime_errors: runtimeErrors });
    console.log(JSON.stringify(result, null, 2));
    return result.errors.length ? 1 : 0;
  } catch (error) {
    console.log(JSON.stringify({ status: 'not_run', error: error.message, coverage: { visual_review: 'not_run' } }, null, 2));
    return 2;
  } finally {
    if (browser) await browser.close();
    if (wrapperDirectory) await fs.rm(wrapperDirectory, { recursive: true, force: true });
  }
}

process.exitCode = await main();
