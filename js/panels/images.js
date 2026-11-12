// Imagens panel: adding images, the list of layers with their actions, the
// background colour, the stage toolbar and the compact view of the drawer.
import { isAccepted } from '../images.js';
import {
  addLayer,
  createLayer,
  duplicateLayer,
  effectiveDpi,
  fillLayer,
  fitLayer,
  isLowRes,
  layerBounds,
  lowerLayer,
  newId,
  raiseLayer,
  removeLayer,
} from '../layers.js';
import { formatDpi, formatPx, plural } from '../format.js';

const PASTED_NAME = 'imagem-colada.png';
const DISCARDED = 'descartada';
const FULL_CROP = { x: 0, y: 0, width: 1, height: 1 };
const THUMB_SIZE = 52;
const EMPTY_LIST_TEXT = 'Nenhuma imagem ainda.';
const SELECTED_BADGE_TEXT = 'Selecionada';
const LOW_RES_STRONG = 'Imagem com baixa resolução para impressão.';
const LOW_RES_TEXT = 'Abaixo de 150 DPI ela pode sair borrada. Use um arquivo maior ou reduza a imagem na capa.';

// Files of a batch split by type: images the studio opens and the rest.
export function splitFiles(files) {
  const accepted = [];
  const rejected = [];
  for (const file of files) (isAccepted(file) ? accepted : rejected).push(file);
  return { accepted, rejected };
}

// Notice for a file that is not an accepted image.
export function rejectionNotice(name) {
  return { kind: 'error', strong: `"${name}" não é uma imagem.`, text: 'Use PNG, JPEG ou WebP.' };
}

// Notice for an image file that could not be decoded.
export function decodeFailureNotice(name) {
  return { kind: 'error', strong: `Não foi possível abrir "${name}".`, text: 'O arquivo pode estar corrompido.' };
}

// Name shown for a file; a pasted image comes without one.
function fileName(file) {
  return file.name || PASTED_NAME;
}

function cropOf(layer) {
  return layer.crop ?? FULL_CROP;
}

// Pixel size of the visible part and its print resolution: '480 × 480 px · 222 DPI na capa'.
function layerDetail(layer) {
  const crop = cropOf(layer);
  const size = formatPx(crop.width * layer.naturalWidth, crop.height * layer.naturalHeight);
  return `${size} · ${formatDpi(effectiveDpi(layer))}`;
}

// What the "Camadas" section shows: the count text (null without layers) and
// one card per layer, the top layer first.
export function layerListView(project, ui) {
  const count = project.layers.length;
  return {
    count: count === 0 ? null : `${plural(count, 'imagem', 'imagens')} · a de cima fica na frente`,
    cards: project.layers
      .slice()
      .reverse()
      .map((layer) => ({
        id: layer.id,
        name: layer.name,
        detail: layerDetail(layer),
        selected: layer.id === ui.selectedLayerId,
        lowRes: isLowRes(layer),
      })),
  };
}

const SVG_NS = 'http://www.w3.org/2000/svg';

// Paths of each icon, drawn in a 24 × 24 box with the stroke in the current colour.
const ICON_PATHS = {
  upload: ['M12 16V4M6 10l6-6 6 6M4 20h16'],
  raise: ['M12 19V5M5 12l7-7 7 7'],
  lower: ['M12 5v14M5 12l7 7 7-7'],
  duplicate: ['M9 11a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2z', 'M5 15V6a2 2 0 0 1 2-2h9'],
  fill: ['M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'],
  fit: ['M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5'],
  crop: ['M6 2v14a2 2 0 0 0 2 2h14', 'M18 22V8a2 2 0 0 0-2-2H2'],
  remove: ['M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3'],
  warn: ['M12 3 2 20h20L12 3zM12 10v5M12 17.5v.5'],
};

function icon(name, size = 20, strokeWidth = 2) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  const attrs = {
    'aria-hidden': 'true',
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': strokeWidth,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  };
  for (const [key, value] of Object.entries(attrs)) svg.setAttribute(key, String(value));
  for (const d of ICON_PATHS[name]) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(className, text) {
  const node = element('button', className, text);
  node.type = 'button';
  return node;
}

// Decodes every accepted file of a batch, adds one layer per image in the
// batch order, then selects the last one and closes a single undo step.
async function intake(files, ctx) {
  const { accepted, rejected } = splitFiles(files);
  for (const file of rejected) ctx.notices.show(rejectionNotice(fileName(file)));
  if (accepted.length === 0 || !ctx.images) return;

  const results = await Promise.allSettled(accepted.map((file) => ctx.images.add(file, fileName(file))));
  let lastId = null;
  results.forEach((result, index) => {
    const name = fileName(accepted[index]);
    if (result.status === 'rejected') {
      if (result.reason?.message !== DISCARDED) ctx.notices.show(decodeFailureNotice(name));
      return;
    }
    const { imageId, naturalWidth, naturalHeight } = result.value;
    const model = ctx.model();
    const layer = createLayer({ id: newId(), name, imageId, naturalWidth, naturalHeight }, model, model.bleed);
    ctx.state.updateProject((project) => addLayer(project, layer));
    lastId = layer.id;
  });
  if (lastId === null) return;
  ctx.state.setUi({ selectedLayerId: lastId });
  ctx.state.commit();
  ctx.tabs.show('images');
}

// Square canvas with the visible part of the layer's image, contained and centred.
function thumbnail(layer, size, ctx, className) {
  const canvas = element('canvas', className);
  canvas.setAttribute('aria-hidden', 'true');
  const ratio = globalThis.devicePixelRatio || 1;
  canvas.width = Math.round(size * ratio);
  canvas.height = Math.round(size * ratio);
  const bitmap = ctx.images?.getBitmap(layer.imageId) ?? null;
  const g = canvas.getContext('2d');
  if (!bitmap || !g) return canvas;
  const crop = cropOf(layer);
  const sw = crop.width * layer.naturalWidth;
  const sh = crop.height * layer.naturalHeight;
  const scale = Math.min(canvas.width / sw, canvas.height / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  g.imageSmoothingQuality = 'high';
  g.drawImage(
    bitmap,
    crop.x * layer.naturalWidth,
    crop.y * layer.naturalHeight,
    sw,
    sh,
    (canvas.width - dw) / 2,
    (canvas.height - dh) / 2,
    dw,
    dh,
  );
  return canvas;
}

// Bounds and bleed of the current model, used by every action that places a layer.
function placement(ctx) {
  const model = ctx.model();
  return { model, bleed: model.bleed, bounds: layerBounds(model, model.bleed) };
}

// Replaces the project with change(project) and closes one undo step.
function apply(ctx, change) {
  ctx.state.updateProject(change);
  ctx.state.commit();
}

// Buttons acting on one layer, in the order of the row, each with its icon.
const LAYER_ACTIONS = [
  { key: 'raise', label: 'Trazer para frente', run: (id, ctx) => apply(ctx, (p) => raiseLayer(p, id)) },
  { key: 'lower', label: 'Enviar para trás', run: (id, ctx) => apply(ctx, (p) => lowerLayer(p, id)) },
  {
    key: 'duplicate',
    label: 'Duplicar',
    run: (id, ctx) => {
      const copyId = newId();
      ctx.state.updateProject((p) => duplicateLayer(p, id, copyId, placement(ctx).bounds));
      ctx.state.setUi({ selectedLayerId: copyId });
      ctx.state.commit();
    },
  },
  {
    key: 'fill',
    label: 'Preencher a capa',
    run: (id, ctx) => {
      const { model, bleed } = placement(ctx);
      apply(ctx, (p) => fillLayer(p, id, model, bleed));
    },
  },
  { key: 'fit', label: 'Caber na capa', run: (id, ctx) => apply(ctx, (p) => fitLayer(p, id, ctx.model())) },
  { key: 'crop', label: 'Recortar', run: (id, ctx) => ctx.state.setUi({ selectedLayerId: id, cropLayerId: id }) },
  {
    key: 'remove',
    label: 'Remover',
    danger: true,
    run: (id, ctx) => {
      ctx.state.updateProject((p) => removeLayer(p, id));
      const { ui } = ctx.state.getState();
      const patch = {};
      if (ui.selectedLayerId === id) patch.selectedLayerId = null;
      if (ui.cropLayerId === id) Object.assign(patch, { cropLayerId: null, cropDraft: null });
      ctx.state.setUi(patch);
      ctx.state.commit();
    },
  },
];

// Row of icon buttons of a layer; shared by the full list and the compact view.
function actionRow(layerId, ctx) {
  const row = element('div', 'layer-card__actions');
  for (const action of LAYER_ACTIONS) {
    if (action.key === 'remove') row.append(element('span', 'layer-card__spacer'));
    const node = button(action.danger ? 'btn btn--icon btn--danger' : 'btn btn--icon');
    node.setAttribute('aria-label', action.label);
    node.dataset.key = `${layerId}:${action.key}`;
    node.append(icon(action.key));
    node.addEventListener('click', (event) => {
      event.stopPropagation();
      action.run(layerId, ctx);
    });
    row.append(node);
  }
  return row;
}

function lowResNotice() {
  const notice = element('div', 'notice notice--warn layer-card__warn');
  notice.setAttribute('role', 'status');
  const svg = icon('warn');
  svg.setAttribute('class', 'notice__icon');
  const body = element('span');
  body.append(element('strong', null, LOW_RES_STRONG), ` ${LOW_RES_TEXT}`);
  notice.append(svg, body);
  return notice;
}

// Card of one layer: thumbnail, name and detail (a button that selects it), the
// actions row and, for a low-resolution layer, the warning.
function layerCard(card, layer, ctx) {
  const node = element('div', card.selected ? 'card card--layer-selected layer-card' : 'card layer-card');
  const head = button('layer-card__head');
  head.dataset.key = `${card.id}:select`;
  head.setAttribute('aria-pressed', String(card.selected));
  const text = element('span', 'layer-card__text');
  text.append(element('span', 'layer-card__name', card.name), element('span', 'layer-card__detail', card.detail));
  head.append(thumbnail(layer, THUMB_SIZE, ctx, 'layer-card__thumb'), text);
  if (card.selected) head.append(element('span', 'badge--selected', SELECTED_BADGE_TEXT));
  node.addEventListener('click', () => ctx.state.setUi({ selectedLayerId: card.id }));
  node.append(head, actionRow(card.id, ctx));
  if (card.lowRes) node.append(lowResNotice());
  return node;
}

// The element with focus inside root, by its data-key, to give it back after a rebuild.
function focusedKey(root) {
  const focused = document.activeElement;
  return focused && root.contains(focused) ? focused.dataset.key ?? null : null;
}

function refocus(root, key) {
  if (key === null) return;
  const again = [...root.querySelectorAll('[data-key]')].find((node) => node.dataset.key === key);
  if (again) again.focus();
}

// Text that changes only when something the cards show changes (not while a layer is dragged).
function listSignature(view, project, ctx) {
  const images = project.layers.map((layer) => [
    layer.imageId,
    cropOf(layer),
    Boolean(ctx.images?.getBitmap(layer.imageId)),
  ]);
  return JSON.stringify([view, images]);
}

// "Camadas" section; returns `render`, which rebuilds the cards when what they show changed.
function buildList(content, ctx) {
  const section = element('section', 'panel-images__section');
  const header = element('div', 'panel-images__header');
  const count = element('span', 'support');
  header.append(element('h2', 'title', 'Camadas'), count);
  const list = element('div', 'panel-images__list');
  const empty = element('p', 'support panel-images__empty', EMPTY_LIST_TEXT);
  section.append(header, list, empty);
  content.append(section);

  let signature = null;
  function render() {
    const { project, ui } = ctx.state.getState();
    const view = layerListView(project, ui);
    const next = listSignature(view, project, ctx);
    if (next === signature) return;
    signature = next;
    count.textContent = view.count ?? '';
    count.hidden = view.count === null;
    empty.hidden = view.cards.length > 0;
    const key = focusedKey(list);
    const byId = new Map(project.layers.map((layer) => [layer.id, layer]));
    list.replaceChildren(...view.cards.map((card) => layerCard(card, byId.get(card.id), ctx)));
    refocus(list, key);
  }

  render();
  return render;
}

// Dashed button at the top of the panel that opens the file chooser.
function dropButton(ctx) {
  const drop = button('inset panel-images__drop');
  const badge = element('span', 'panel-images__drop-icon');
  badge.append(icon('upload', 22));
  const text = element('span', 'panel-images__drop-text');
  text.append(
    element('span', 'panel-images__drop-title', 'Adicionar imagens'),
    element('span', 'support', 'Solte aqui, cole ou clique para escolher. PNG, JPEG ou WebP.'),
  );
  drop.append(badge, text);
  drop.addEventListener('click', () => ctx.files.pick());
  return drop;
}

export function mount(container, ctx) {
  // Without a store there is no project to add layers to.
  if (!ctx.state) return;
  const content = element('div', 'panel-images');
  content.append(dropButton(ctx));
  container.append(content);
  const renderList = buildList(content, ctx);

  ctx.files.handle = (files) => intake(files, ctx);
  ctx.state.subscribe(() => {
    renderList();
  });
}
