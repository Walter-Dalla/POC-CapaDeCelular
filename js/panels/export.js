// Exportar panel: the export options (format, resolution, cut, bleed, camera hole, mirror), the
// order field, the summary of the final file and the low-resolution warning.
import { effectiveBleed } from '../geometry.js';
import { formatDpi, formatPx, formatSize, parseMm, plural } from '../format.js';
import { effectiveDpi, lowResLayers } from '../layers.js';
import { LIMIT_MESSAGE, download, exportFile, renderPlan } from '../export.js';

const FORMATS = ['png', 'jpeg'];
const DPIS = [150, 300, 600];
const CLIPS = ['rect', 'contour'];
const BLEED_MIN = 0;
const BLEED_MAX = 10;
const BLEED_ERROR = 'Informe um valor entre 0 e 10 mm.';

function validBleed(value) {
  if (value === null) return true;
  return typeof value === 'number' && Number.isFinite(value) && value >= BLEED_MIN && value <= BLEED_MAX;
}

function validEntry(key, value) {
  switch (key) {
    case 'format':
      return FORMATS.includes(value);
    case 'dpi':
      return DPIS.includes(value);
    case 'clip':
      return CLIPS.includes(value);
    case 'bleedMm':
      return validBleed(value);
    case 'bleedOn':
    case 'cameraHole':
    case 'mirror':
      return typeof value === 'boolean';
    default:
      return false;
  }
}

// New export options after a change, or the same object when the change is refused: an unknown
// key or value, a bleed outside 0–10 mm, or a transparent option (contour cut, camera hole) while
// the format is JPEG. Choosing JPEG turns both transparent options off.
export function applyOption(exportOptions, patch) {
  for (const [key, value] of Object.entries(patch)) {
    if (!validEntry(key, value)) return exportOptions;
  }
  const next = { ...exportOptions, ...patch };
  if (next.format === 'jpeg') {
    if (patch.format !== 'jpeg' && (patch.clip === 'contour' || patch.cameraHole === true)) return exportOptions;
    next.clip = 'rect';
    next.cameraHole = false;
  }
  return next;
}

// Millimetres as the bleed field shows them: decimal comma, no forced decimal ('2 mm', '2,5 mm').
export function bleedText(mm) {
  return `${String(Math.round(mm * 10) / 10).replace('.', ',')} mm`;
}

// What each control shows for the current options: pressed buttons, switch states, disabled
// controls and the bleed field text (the bleed that applies when the bleed is on).
export function optionsView(exportOptions, model) {
  const jpeg = exportOptions.format === 'jpeg';
  const bleed = effectiveBleed({ ...exportOptions, bleedOn: true }, model);
  return {
    format: { png: exportOptions.format === 'png', jpeg },
    dpi: Object.fromEntries(DPIS.map((dpi) => [dpi, exportOptions.dpi === dpi])),
    clip: { rect: exportOptions.clip === 'rect', contour: exportOptions.clip === 'contour', contourDisabled: jpeg },
    bleed: { checked: exportOptions.bleedOn, text: bleedText(bleed), fieldDisabled: !exportOptions.bleedOn },
    cameraHole: { checked: exportOptions.cameraHole, disabled: jpeg },
    mirror: { checked: exportOptions.mirror },
  };
}

// Warning about the layers printed below the minimum resolution, naming the lowest one; null
// when every layer is sharp enough.
function lowResWarning(project) {
  const low = lowResLayers(project);
  if (low.length === 0) return null;
  const lowest = low.reduce((min, layer) => (effectiveDpi(layer) < effectiveDpi(min) ? layer : min));
  return {
    strong: `${plural(low.length, 'imagem', 'imagens')} com baixa resolução.`,
    text: `"${lowest.name}" está a ${formatDpi(effectiveDpi(lowest))}.`,
    layerId: lowest.id,
  };
}

// Texts of the "ARQUIVO FINAL" summary for the current state and model: size in mm and in px with
// their notes, the file name and the low-resolution warning.
// Size, bleed and file name come from the export plan, so the summary always matches the file.
export function summaryView(state, model) {
  const plan = renderPlan(state, model);
  return {
    sizeMm: formatSize(plan.widthMm, plan.heightMm),
    sizeNote: plan.bleedMm > 0 ? `capa + ${bleedText(plan.bleedMm)} de sangria por lado` : 'capa sem sangria',
    sizePx: formatPx(plan.widthPx, plan.heightPx),
    pxNote: `a ${plan.dpi} DPI · cores em RGB`,
    fileName: plan.fileName,
    warning: lowResWarning(state.project),
  };
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// A labelled `.segmented` group of pressed buttons; returns the block and the buttons by key.
function segmented(id, label, options) {
  const block = element('div', 'panel-export__option');
  const heading = element('div', 'panel-export__label', label);
  heading.id = id;
  const group = element('div', 'segmented');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-labelledby', id);
  const buttons = {};
  for (const { key, text } of options) {
    const button = element('button', '', text);
    button.type = 'button';
    button.setAttribute('aria-pressed', 'false');
    group.append(button);
    buttons[key] = button;
  }
  block.append(heading, group);
  return { block, buttons };
}

// A row of the options card: title, description, optional extra control and a switch.
function switchRow(id, title, description, extra) {
  const row = element('div', 'panel-export__row');
  const text = element('div', 'panel-export__row-text');
  const heading = element('div', 'panel-export__row-title', title);
  heading.id = id;
  text.append(heading, element('div', 'panel-export__row-note', description));
  const toggle = element('button', 'switch');
  toggle.type = 'button';
  toggle.setAttribute('role', 'switch');
  toggle.setAttribute('aria-checked', 'false');
  toggle.setAttribute('aria-labelledby', id);
  row.append(text);
  if (extra) row.append(...extra);
  row.append(toggle);
  return { row, toggle };
}

function setPressed(button, pressed) {
  button.setAttribute('aria-pressed', String(pressed));
}

function setChecked(toggle, checked) {
  toggle.setAttribute('aria-checked', String(checked));
}

// Format, resolution, cut and the options card; returns `render`, which shows the current options.
function buildOptions(content, ctx) {
  const { state } = ctx;
  const change = (patch) => state.setExportOptions(applyOption(state.getState().exportOptions, patch));

  const top = element('div', 'panel-export__pair');
  const format = segmented('export-format-label', 'Formato', [
    { key: 'png', text: 'PNG' },
    { key: 'jpeg', text: 'JPEG' },
  ]);
  const dpi = segmented('export-dpi-label', 'Resolução (DPI)', DPIS.map((value) => ({ key: value, text: String(value) })));
  top.append(format.block, dpi.block);

  const clip = segmented('export-clip-label', 'Recorte', [
    { key: 'rect', text: 'Retângulo inteiro' },
    { key: 'contour', text: 'No contorno' },
  ]);
  clip.block.append(
    element(
      'div',
      'support',
      'A impressora ou o gabarito fazem o corte. "No contorno" deixa o lado de fora transparente (só PNG).',
    ),
  );

  const card = element('div', 'card panel-export__card');
  const bleedLabel = element('label', 'visually-hidden', 'Sangria em milímetros');
  bleedLabel.htmlFor = 'export-bleed-mm';
  const bleedInput = element('input', 'field__input panel-export__bleed');
  bleedInput.id = 'export-bleed-mm';
  bleedInput.type = 'text';
  bleedInput.inputMode = 'decimal';
  bleedInput.autocomplete = 'off';
  const bleedError = element('p', 'field__error panel-export__error', BLEED_ERROR);
  bleedError.id = 'export-bleed-error';
  bleedError.hidden = true;
  const bleed = switchRow('export-bleed-label', 'Sangria', 'Margem extra para o corte', [bleedLabel, bleedInput]);
  const camera = switchRow('export-camera-label', 'Furo da câmera transparente', 'Deixa a área da câmera sem tinta');
  const mirror = switchRow('export-mirror-label', 'Espelhar horizontalmente', 'Ligue para sublimação');
  card.append(bleed.row, bleedError, camera.row, mirror.row);

  content.append(top, clip.block, card);

  function showBleedError(show) {
    bleedError.hidden = !show;
    if (show) {
      bleedInput.setAttribute('aria-invalid', 'true');
      bleedInput.setAttribute('aria-describedby', bleedError.id);
    } else {
      bleedInput.removeAttribute('aria-invalid');
      bleedInput.removeAttribute('aria-describedby');
    }
  }

  for (const [key, button] of Object.entries(format.buttons)) button.addEventListener('click', () => change({ format: key }));
  for (const value of DPIS) dpi.buttons[value].addEventListener('click', () => change({ dpi: value }));
  for (const [key, button] of Object.entries(clip.buttons)) button.addEventListener('click', () => change({ clip: key }));
  bleed.toggle.addEventListener('click', () => change({ bleedOn: !state.getState().exportOptions.bleedOn }));
  camera.toggle.addEventListener('click', () => change({ cameraHole: !state.getState().exportOptions.cameraHole }));
  mirror.toggle.addEventListener('click', () => change({ mirror: !state.getState().exportOptions.mirror }));
  bleedInput.addEventListener('change', () => {
    const value = parseMm(bleedInput.value);
    if (!validBleed(value) || value === null) {
      showBleedError(true);
      return;
    }
    showBleedError(false);
    change({ bleedMm: value });
    render();
  });

  function render() {
    const view = optionsView(state.getState().exportOptions, ctx.model());
    setPressed(format.buttons.png, view.format.png);
    setPressed(format.buttons.jpeg, view.format.jpeg);
    for (const value of DPIS) setPressed(dpi.buttons[value], view.dpi[value]);
    setPressed(clip.buttons.rect, view.clip.rect);
    setPressed(clip.buttons.contour, view.clip.contour);
    clip.buttons.contour.disabled = view.clip.contourDisabled;
    setChecked(bleed.toggle, view.bleed.checked);
    bleedInput.disabled = view.bleed.fieldDisabled;
    if (bleedInput.getAttribute('aria-invalid') !== 'true') bleedInput.value = view.bleed.text;
    setChecked(camera.toggle, view.cameraHole.checked);
    camera.toggle.disabled = view.cameraHole.disabled;
    setChecked(mirror.toggle, view.mirror.checked);
  }

  // A change of the options from elsewhere (undo of a project load, reset) drops a pending error.
  function sync() {
    showBleedError(false);
    render();
  }

  render();
  return { render, sync };
}

const SVG_NS = 'http://www.w3.org/2000/svg';

// Stroke icon in a 24 × 24 box drawn in the current text colour.
function icon(paths, size, strokeWidth, className) {
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
  if (className) attrs.class = className;
  for (const [key, value] of Object.entries(attrs)) svg.setAttribute(key, String(value));
  for (const [tag, shapeAttrs] of paths) {
    const shape = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(shapeAttrs)) shape.setAttribute(key, value);
    svg.append(shape);
  }
  return svg;
}

const WARN_ICON = [['path', { d: 'M12 3 2 20h20L12 3zM12 10v5M12 17.5v.5' }]];
const ORDER_MAX_CHARS = 40;

// The "Pedido ou cliente" field, the final file summary and the low-resolution warning; returns
// `render`, which shows them for the current state.
function buildSummary(content, ctx) {
  const { state } = ctx;

  const order = element('div', 'field');
  const orderLabel = element('label', 'field__label', 'Pedido ou cliente');
  orderLabel.htmlFor = 'export-order';
  const orderInput = element('input', 'field__input');
  orderInput.id = 'export-order';
  orderInput.type = 'text';
  orderInput.maxLength = ORDER_MAX_CHARS;
  orderInput.autocomplete = 'off';
  orderInput.setAttribute('aria-describedby', 'export-order-help');
  const orderHelp = element('p', 'support panel-export__help', 'Opcional. Entra no começo do nome do arquivo.');
  orderHelp.id = 'export-order-help';
  order.append(orderLabel, orderInput, orderHelp);
  orderInput.addEventListener('input', () => state.setOrderId(orderInput.value));

  const summary = element('section', 'inset panel-export__summary');
  summary.setAttribute('aria-labelledby', 'export-summary-title');
  const title = element('h2', 'label-caps panel-export__summary-title', 'ARQUIVO FINAL');
  title.id = 'export-summary-title';
  const values = element('div', 'panel-export__values');
  const sizeMm = element('div', 'panel-export__value');
  const sizeNote = element('div', 'support');
  const sizePx = element('div', 'panel-export__value');
  const pxNote = element('div', 'support');
  const mmBlock = element('div');
  mmBlock.append(sizeMm, sizeNote);
  const pxBlock = element('div');
  pxBlock.append(sizePx, pxNote);
  values.append(mmBlock, pxBlock);
  const fileName = element('div', 'panel-export__file');
  summary.append(title, values, fileName);

  const warning = element('div', 'notice notice--warn');
  warning.setAttribute('role', 'status');
  warning.hidden = true;
  const warningBody = element('span');
  const warningStrong = element('strong');
  const warningText = document.createTextNode('');
  const showLayer = element('button', 'panel-export__link', 'Ver camada');
  showLayer.type = 'button';
  warningBody.append(warningStrong, warningText, showLayer);
  warning.append(icon(WARN_ICON, 20, 2, 'panel-export__icon'), warningBody);
  let warningLayerId = null;
  showLayer.addEventListener('click', () => {
    if (warningLayerId === null) return;
    state.setUi({ selectedLayerId: warningLayerId });
    ctx.tabs.show('images');
  });

  content.append(order, summary, warning);

  function render() {
    const current = state.getState();
    if (document.activeElement !== orderInput && orderInput.value !== current.orderId) orderInput.value = current.orderId;
    const view = summaryView(current, ctx.model());
    sizeMm.textContent = view.sizeMm;
    sizeNote.textContent = view.sizeNote;
    sizePx.textContent = view.sizePx;
    pxNote.textContent = view.pxNote;
    fileName.textContent = view.fileName;
    warning.hidden = view.warning === null;
    warningLayerId = view.warning ? view.warning.layerId : null;
    warningStrong.textContent = view.warning ? view.warning.strong : '';
    warningText.textContent = view.warning ? ` ${view.warning.text} ` : '';
  }

  render();
  return render;
}

// The two fixed notes at the end of the panel: where the file is made and its colour space.
export function exportNotes() {
  return {
    privacy: {
      strong: 'Suas imagens não saem deste aparelho.',
      text: 'O arquivo é gerado aqui, no seu navegador.',
    },
    colour: 'O arquivo sai em RGB (sRGB). A conversão para as cores da impressora fica com o programa de impressão.',
  };
}

const LOCK_ICON = [
  ['rect', { x: '5', y: '11', width: '14', height: '9', rx: '2' }],
  ['path', { d: 'M8 11V8a4 4 0 0 1 8 0v3' }],
];

function buildNotes(content) {
  const notes = exportNotes();
  const privacy = element('div', 'notice notice--info');
  const body = element('span');
  body.append(element('strong', '', notes.privacy.strong), document.createTextNode(` ${notes.privacy.text}`));
  privacy.append(icon(LOCK_ICON, 20, 2, 'panel-export__icon'), body);
  content.append(privacy, element('p', 'support panel-export__colour', notes.colour));
}

const DOWNLOAD_ICON = [['path', { d: 'M12 4v12M6 10l6 6 6-6M4 20h16' }]];
const EXPORT_FAILED = 'Não foi possível gerar o arquivo.';

// The "Baixar arquivo" button: renders the file, downloads it, and shows an error notice when the
// export fails. The button stays disabled while a file is being made.
function buildDownload(footer, ctx) {
  const button = element('button', 'btn btn--primary panel-export__download');
  button.type = 'button';
  button.append(icon(DOWNLOAD_ICON, 22, 2.5), document.createTextNode('Baixar arquivo'));
  footer.append(button);

  let closeError = null;
  button.addEventListener('click', async () => {
    if (button.disabled) return;
    button.disabled = true;
    if (closeError) closeError();
    closeError = null;
    try {
      const getBitmap = (id) => (ctx.images ? ctx.images.getBitmap(id) : null);
      const { blob, fileName } = await exportFile(ctx.state.getState(), ctx.model(), getBitmap);
      download(blob, fileName);
    } catch (error) {
      closeError = ctx.notices.show({
        kind: 'error',
        strong: EXPORT_FAILED,
        text: error && error.message === LIMIT_MESSAGE ? LIMIT_MESSAGE : undefined,
      });
    } finally {
      button.disabled = false;
    }
  });
}

export function mount(container, ctx) {
  // Without a store there are no options to change.
  if (!ctx.state) return;
  const content = element('div', 'panel-export');
  const footer = element('div', 'panel__footer');
  container.append(content, footer);

  const options = buildOptions(content, ctx);
  const renderSummary = buildSummary(content, ctx);
  buildNotes(content);
  buildDownload(footer, ctx);

  ctx.state.subscribe((state, prev) => {
    const modelChanged =
      state.project.modelId !== prev.project.modelId || state.project.customModel !== prev.project.customModel;
    if (state.exportOptions !== prev.exportOptions) options.sync();
    else if (modelChanged) options.render();
    if (
      modelChanged ||
      state.exportOptions !== prev.exportOptions ||
      state.orderId !== prev.orderId ||
      state.project.layers !== prev.project.layers
    ) {
      renderSummary();
    }
  });
}
