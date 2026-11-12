// Entry point of the studio: builds the shared context, wires the page shell and mounts the panels.
import { mount as mountModel } from './panels/model.js';
import { mount as mountImages } from './panels/images.js';
import { mount as mountExport } from './panels/export.js';

export const TABS = ['model', 'images', 'export'];

// Tab reached from `current` by a key of the tab list, or null when the key does not move.
export function nextTab(current, key) {
  const index = TABS.indexOf(current);
  const last = TABS.length - 1;
  switch (key) {
    case 'ArrowRight':
      return TABS[index >= last ? 0 : index + 1];
    case 'ArrowLeft':
      return TABS[index <= 0 ? last : index - 1];
    case 'Home':
      return TABS[0];
    case 'End':
      return TABS[last];
    default:
      return null;
  }
}

const NOTICE_VIEWS = {
  error: { className: 'notice notice--error notice--floating', role: 'alert' },
  warn: { className: 'notice notice--warn notice--floating', role: 'status' },
  info: { className: 'notice notice--info notice--floating', role: 'status' },
};

// Class list and ARIA role of a floating notice of the given kind.
export function noticeView({ kind }) {
  const view = NOTICE_VIEWS[kind] ?? NOTICE_VIEWS.info;
  return { className: view.className, role: view.role };
}

const SVG_NS = 'http://www.w3.org/2000/svg';

// Shapes of each icon, drawn in a 24 × 24 box with the stroke in the current colour.
const ICONS = {
  error: [['circle', { cx: '12', cy: '12', r: '9' }], ['path', { d: 'M12 7v6M12 16.5v.5' }]],
  warn: [['path', { d: 'M12 3 2 20h20L12 3zM12 10v5M12 17.5v.5' }]],
  info: [['rect', { x: '5', y: '11', width: '14', height: '9', rx: '2' }], ['path', { d: 'M8 11V8a4 4 0 0 1 8 0v3' }]],
  close: [['path', { d: 'M6 6l12 12M18 6L6 18' }]],
};

function icon(name, size, className) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  const attrs = {
    'aria-hidden': 'true',
    width: String(size),
    height: String(size),
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  };
  for (const [key, value] of Object.entries(attrs)) svg.setAttribute(key, value);
  if (className) svg.setAttribute('class', className);
  for (const [tag, shapeAttrs] of ICONS[name]) {
    const shape = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(shapeAttrs)) shape.setAttribute(key, value);
    svg.append(shape);
  }
  return svg;
}

const byId = (id) => document.getElementById(id);

// Bottom drawer of the panel below 900px: the handle toggles it open and closed.
function createDrawer() {
  const panel = byId('panel');
  const handle = byId('drawer-handle');
  function set(open) {
    panel.classList.toggle('drawer--open', open);
    handle.setAttribute('aria-expanded', String(open));
    handle.setAttribute('aria-label', open ? 'Recolher painel' : 'Expandir painel');
  }
  handle.addEventListener('click', () => {
    set(handle.getAttribute('aria-expanded') !== 'true');
  });
  return { set };
}

// Step tabs with roving tabindex; the Modelo and Exportar tabs expand the drawer, Imagens collapses it.
function createTabs(drawer) {
  const listeners = [];
  let current = TABS.find((name) => byId(`tab-${name}`).getAttribute('aria-selected') === 'true') ?? TABS[0];

  function show(name, { focus = false } = {}) {
    if (!TABS.includes(name)) return;
    for (const tab of TABS) {
      const selected = tab === name;
      const button = byId(`tab-${tab}`);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      byId(`panel-${tab}`).hidden = !selected;
    }
    if (focus) byId(`tab-${name}`).focus();
    drawer.set(name !== 'images');
    const changed = name !== current;
    current = name;
    if (changed) for (const fn of listeners) fn(name);
  }

  for (const name of TABS) {
    const button = byId(`tab-${name}`);
    button.addEventListener('click', () => show(name));
    button.addEventListener('keydown', (event) => {
      const target = nextTab(current, event.key);
      if (!target) return;
      event.preventDefault();
      show(target, { focus: true });
    });
  }

  return {
    show: (name) => show(name),
    onChange(fn) {
      listeners.push(fn);
    },
  };
}

// Floating notices of the stage; a notice with `once` shows a given key a single time per page load.
function createNotices() {
  const container = byId('notices');
  const shownOnce = new Set();

  function show({ kind, strong, text, action, dismissible = true, once }) {
    if (once !== undefined) {
      if (shownOnce.has(once)) return () => {};
      shownOnce.add(once);
    }
    const view = noticeView({ kind });
    const notice = document.createElement('div');
    notice.className = view.className;
    notice.setAttribute('role', view.role);
    notice.append(icon(NOTICE_VIEWS[kind] ? kind : 'info', 20, 'notice__icon'));

    const body = document.createElement('span');
    body.className = 'notice__body';
    if (strong) {
      const title = document.createElement('strong');
      title.textContent = strong;
      body.append(title);
    }
    if (text) body.append(strong ? ` ${text}` : text);
    if (action) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'notice__action';
      button.textContent = action.label;
      button.addEventListener('click', () => action.run());
      body.append(' ', button);
    }
    notice.append(body);

    let open = true;
    const close = () => {
      if (!open) return;
      open = false;
      notice.remove();
    };

    if (dismissible) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'notice__close';
      button.setAttribute('aria-label', 'Fechar aviso');
      button.append(icon('close', 18));
      button.addEventListener('click', close);
      notice.append(button);
    }

    container.append(notice);
    return close;
  }

  return { show };
}

// Confirmation dialog: resolves true on the ok button, false on "Cancelar" or Esc.
function createConfirm() {
  const dialog = byId('dialog-confirm');
  const title = byId('dialog-title');
  const text = byId('dialog-text');
  const ok = byId('dialog-ok');
  let resolve = null;

  function finish(value) {
    if (!resolve) return;
    const done = resolve;
    resolve = null;
    if (dialog.open) dialog.close();
    done(value);
  }

  ok.addEventListener('click', () => finish(true));
  byId('dialog-cancel').addEventListener('click', () => finish(false));
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    finish(false);
  });
  // A close that arrives after the dialog was opened again belongs to the previous question.
  dialog.addEventListener('close', () => {
    if (!dialog.open) finish(false);
  });

  return function confirm({ title: titleText, text: bodyText, ok: okText }) {
    finish(false);
    title.textContent = titleText;
    text.textContent = bodyText;
    ok.textContent = okText;
    const answer = new Promise((done) => {
      resolve = done;
    });
    dialog.showModal();
    return answer;
  };
}

const NON_TEXT_INPUTS = new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit']);

function isTextField(element) {
  if (!element) return false;
  if (element.isContentEditable) return true;
  if (element.tagName === 'TEXTAREA') return true;
  return element.tagName === 'INPUT' && !NON_TEXT_INPUTS.has(element.type);
}

// File chooser, drop anywhere on the page and paste: each hands its files to the panel that set `handle`.
function createFiles() {
  const input = byId('file-input');
  const files = {
    handle: null,
    pick() {
      input.click();
    },
  };

  function deliver(list) {
    if (list.length > 0 && typeof files.handle === 'function') files.handle(list);
  }

  input.addEventListener('change', () => {
    const list = Array.from(input.files ?? []);
    input.value = '';
    deliver(list);
  });
  document.addEventListener('dragover', (event) => {
    event.preventDefault();
  });
  document.addEventListener('drop', (event) => {
    event.preventDefault();
    deliver(Array.from(event.dataTransfer?.files ?? []));
  });
  document.addEventListener('paste', (event) => {
    if (isTextField(document.activeElement)) return;
    const list = Array.from(event.clipboardData?.files ?? []);
    if (list.length === 0) return;
    event.preventDefault();
    deliver(list);
  });

  return files;
}

export function boot() {
  const drawer = createDrawer();
  const ctx = {
    state: null,
    catalog: null,
    images: null,
    stage: null,
    tabs: createTabs(drawer),
    notices: createNotices(),
    confirm: createConfirm(),
    files: createFiles(),
  };

  byId('model-chip').addEventListener('click', () => ctx.tabs.show('model'));
  byId('btn-empty-add').addEventListener('click', () => ctx.files.pick());

  mountModel(byId('panel-model'), ctx);
  mountImages(byId('panel-images'), ctx);
  mountExport(byId('panel-export'), ctx);
  return ctx;
}

if (typeof document !== 'undefined') boot();
