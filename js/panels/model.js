// Modelo panel: search and brand filter over the catalog, the list of models with a drawn
// thumbnail, the custom model form, and the choice of the project's model.
import { formatSize, parseMm } from '../format.js';
import { validateCustom, CUSTOM_MODEL_ID } from '../catalog.js';

const ALL_BRANDS = 'Todas';
const EMPTY_LIST_TEXT = 'Nenhum modelo encontrado. Use o modelo personalizado abaixo.';
const APPROX_BADGE_TEXT = 'Medidas aproximadas';
const THUMB_HEIGHT = 54;
const THUMB_MIN_WIDTH = 20;

// What the list shows for a search text, a brand (null = every brand) and the selected model.
export function modelListView(catalog, { query = '', brand = null, selectedId = null } = {}) {
  const cards = catalog.listModels({ brand, query }).map((model) => ({
    id: model.id,
    name: model.name,
    detail: `${model.brand} · ${formatSize(model.case.width, model.case.height)}`,
    approx: model.verified === false,
    selected: model.id === selectedId,
  }));
  return {
    brands: [ALL_BRANDS, ...catalog.listBrands()],
    cards,
    empty: cards.length === 0 ? EMPTY_LIST_TEXT : null,
  };
}

// Size in px of the thumbnail: the case outline 54px high, the width in proportion.
export function thumbBox(model) {
  const width = Math.round((model.case.width / model.case.height) * THUMB_HEIGHT);
  return { width: Math.max(THUMB_MIN_WIDTH, width), height: THUMB_HEIGHT };
}

const CUSTOM_FIELDS = ['width', 'height', 'cornerRadius', 'bleed'];

// Numbers typed in the custom model fields and the pt-BR message of each invalid one.
export function customFormResult(texts) {
  const values = {};
  for (const field of CUSTOM_FIELDS) values[field] = parseMm(texts[field]);
  return { values, errors: validateCustom(values) };
}

// A measure as the custom fields show it: decimal comma, no forced decimal (12 -> '12', 71.6 -> '71,6').
export function customFieldText(n) {
  return String(n).replace('.', ',');
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const STROKE = 2;

function svgElement(tag, attrs) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
  return element;
}

const round2 = (n) => Math.round(n * 100) / 100;

// Case outline and cutouts drawn from the model's millimetres, in the current text colour.
function thumbnail(model) {
  const box = thumbBox(model);
  const inner = { width: box.width - STROKE, height: box.height - STROKE };
  const sx = inner.width / model.case.width;
  const sy = inner.height / model.case.height;
  const s = Math.min(sx, sy);
  const svg = svgElement('svg', {
    class: 'model-card__thumb',
    'aria-hidden': 'true',
    width: box.width,
    height: box.height,
    viewBox: `0 0 ${box.width} ${box.height}`,
  });
  const radius = Math.min(model.case.cornerRadius * s, inner.width / 2, inner.height / 2);
  svg.append(
    svgElement('rect', {
      x: STROKE / 2,
      y: STROKE / 2,
      width: round2(inner.width),
      height: round2(inner.height),
      rx: round2(radius),
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': STROKE,
    }),
  );
  for (const cutout of model.cutouts) {
    if (cutout.shape === 'circle') {
      svg.append(
        svgElement('circle', {
          cx: round2(STROKE / 2 + cutout.cx * sx),
          cy: round2(STROKE / 2 + cutout.cy * sy),
          r: round2(cutout.r * s),
          fill: 'currentColor',
        }),
      );
    } else {
      svg.append(
        svgElement('rect', {
          x: round2(STROKE / 2 + cutout.x * sx),
          y: round2(STROKE / 2 + cutout.y * sy),
          width: round2(cutout.width * sx),
          height: round2(cutout.height * sy),
          rx: round2(cutout.radius * s),
          fill: 'currentColor',
        }),
      );
    }
  }
  return svg;
}

function checkIcon() {
  const svg = svgElement('svg', {
    class: 'model-card__check',
    'aria-hidden': 'true',
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 2.5,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  });
  svg.append(svgElement('path', { d: 'M5 12l5 5 9-10' }));
  return svg;
}

function searchIcon() {
  const svg = svgElement('svg', {
    'aria-hidden': 'true',
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 2,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  });
  svg.append(svgElement('circle', { cx: 11, cy: 11, r: 7 }), svgElement('path', { d: 'M21 21l-4.3-4.3' }));
  return svg;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Search box, brand chips and model cards; returns `render`, which redraws them for the current state.
function buildPicker(content, ctx) {
  const { catalog, state } = ctx;
  let query = '';
  let brand = null;

  const searchBlock = element('div', 'panel-model__search');
  const label = element('label', 'panel-model__label', 'Buscar modelo');
  label.htmlFor = 'model-search';
  const search = element('div', 'search');
  const input = document.createElement('input');
  input.id = 'model-search';
  input.type = 'search';
  input.placeholder = 'Ex.: Galaxy S24';
  input.autocomplete = 'off';
  search.append(searchIcon(), input);
  searchBlock.append(label, search);

  const brands = element('div', 'panel-model__brands');
  brands.setAttribute('role', 'group');
  brands.setAttribute('aria-label', 'Marca');

  const list = element('div', 'panel-model__list');
  const empty = element('p', 'support panel-model__empty');
  empty.hidden = true;

  content.append(searchBlock, brands, list, empty);

  function renderBrands(view) {
    brands.replaceChildren(
      ...view.brands.map((name) => {
        const chip = element('button', 'chip', name);
        chip.type = 'button';
        const value = name === ALL_BRANDS ? null : name;
        chip.setAttribute('aria-pressed', String(value === brand));
        chip.addEventListener('click', () => {
          brand = value;
          render();
        });
        return chip;
      }),
    );
  }

  function renderCards(view) {
    list.replaceChildren(
      ...view.cards.map((card) => {
        const button = element('button', card.selected ? 'card card--selected model-card' : 'card model-card');
        button.type = 'button';
        button.setAttribute('aria-pressed', String(card.selected));
        const text = element('span', 'model-card__text');
        text.append(element('span', 'model-card__name', card.name), element('span', 'model-card__detail', card.detail));
        button.append(thumbnail(catalog.getModel(card.id)), text);
        if (card.approx) button.append(element('span', 'badge--approx', APPROX_BADGE_TEXT));
        if (card.selected) button.append(checkIcon());
        button.addEventListener('click', () => {
          if (state.getState().project.modelId === card.id) return;
          state.updateProject((project) => ({ ...project, modelId: card.id }));
          state.commit();
        });
        return button;
      }),
    );
    empty.textContent = view.empty ?? '';
    empty.hidden = view.empty === null;
  }

  function render() {
    const view = modelListView(catalog, { query, brand, selectedId: state.getState().project.modelId });
    renderBrands(view);
    renderCards(view);
  }

  input.addEventListener('input', () => {
    query = input.value;
    render();
  });

  render();
  return render;
}

const CUSTOM_LABELS = {
  width: 'Largura (mm)',
  height: 'Altura (mm)',
  cornerRadius: 'Raio dos cantos (mm)',
  bleed: 'Sangria (mm)',
};

// Custom model section; returns `fill`, which puts the project's custom measures back in the fields.
function buildCustomForm(content, ctx) {
  const { state } = ctx;
  const form = element('form', 'inset panel-model__custom');
  form.noValidate = true;

  const header = element('div');
  header.append(
    element('h2', 'title', 'Modelo personalizado'),
    element('p', 'support panel-model__custom-text', 'Não achou o seu? Informe as medidas do gabarito da capa.'),
  );

  const grid = element('div', 'panel-model__fields');
  const inputs = {};
  const errors = {};
  for (const field of CUSTOM_FIELDS) {
    const id = `model-custom-${field}`;
    const wrapper = element('div', 'field');
    const label = element('label', 'field__label', CUSTOM_LABELS[field]);
    label.htmlFor = id;
    const input = element('input', 'field__input');
    input.id = id;
    input.type = 'text';
    input.inputMode = 'decimal';
    input.autocomplete = 'off';
    const error = element('p', 'field__error panel-model__error');
    error.id = `${id}-error`;
    error.hidden = true;
    wrapper.append(label, input, error);
    grid.append(wrapper);
    inputs[field] = input;
    errors[field] = error;
  }

  const submit = element('button', 'btn btn--secondary', 'Usar estas medidas');
  submit.type = 'submit';
  form.append(header, grid, submit);
  content.append(form);

  function showErrors(messages) {
    for (const field of CUSTOM_FIELDS) {
      const message = messages[field];
      const input = inputs[field];
      errors[field].textContent = message ?? '';
      errors[field].hidden = !message;
      if (message) {
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', errors[field].id);
      } else {
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
      }
    }
  }

  function fill(customModel) {
    for (const field of CUSTOM_FIELDS) inputs[field].value = customFieldText(customModel[field]);
    showErrors({});
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const texts = {};
    for (const field of CUSTOM_FIELDS) texts[field] = inputs[field].value;
    const result = customFormResult(texts);
    showErrors(result.errors);
    const firstInvalid = CUSTOM_FIELDS.find((field) => result.errors[field]);
    if (firstInvalid) {
      inputs[firstInvalid].focus();
      return;
    }
    state.updateProject((project) => ({ ...project, customModel: { ...result.values }, modelId: CUSTOM_MODEL_ID }));
    state.commit();
    fill(state.getState().project.customModel);
  });

  fill(state.getState().project.customModel);
  return fill;
}

export function mount(container, ctx) {
  // Without a store there is no project whose model could be chosen.
  if (!ctx.state) return;
  const content = element('div', 'panel-model');
  container.append(content);

  const renderPicker = ctx.catalog ? buildPicker(content, ctx) : null;
  const fillCustom = buildCustomForm(content, ctx);

  ctx.state.subscribe((state, prev) => {
    if (renderPicker && state.project.modelId !== prev.project.modelId) renderPicker();
    if (state.project.customModel !== prev.project.customModel) fillCustom(state.project.customModel);
  });
}
