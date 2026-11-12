// Exportar panel: the export options (format, resolution, cut, bleed, camera hole, mirror).
import { effectiveBleed } from '../geometry.js';
import { parseMm } from '../format.js';

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

export function mount(container, ctx) {
  // Without a store there are no options to change.
  if (!ctx.state) return;
  const content = element('div', 'panel-export');
  container.append(content);

  const options = buildOptions(content, ctx);

  ctx.state.subscribe((state, prev) => {
    if (state.exportOptions !== prev.exportOptions) options.sync();
    else if (state.project.modelId !== prev.project.modelId || state.project.customModel !== prev.project.customModel) {
      options.render();
    }
  });
}
