// Imagens panel: adding images, the list of layers with their actions, the
// background colour, the stage toolbar and the compact view of the drawer.
import { isAccepted } from '../images.js';
import { addLayer, createLayer, newId } from '../layers.js';

const PASTED_NAME = 'imagem-colada.png';
const DISCARDED = 'descartada';

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

const SVG_NS = 'http://www.w3.org/2000/svg';

// Paths of each icon, drawn in a 24 × 24 box with the stroke in the current colour.
const ICON_PATHS = {
  upload: ['M12 16V4M6 10l6-6 6 6M4 20h16'],
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

  ctx.files.handle = (files) => intake(files, ctx);
}
