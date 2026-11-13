// Word (.docx) export of any printable report page.
// Walks the rendered report (each `.r-page` becomes its own Word section / page) and turns
// headings, paragraphs, coloured bars, tables, grids of boxes, photos and SVG charts into
// native Word content — so the bank can edit the report in Word.
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ImageRun,
  Packer,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import { saveBlob } from './xlsx';

const PX_TO_HALF_PT = 1.5; // 1px = 0.75pt = 1.5 half-points
const KANNADA = /[ಀ-೿]/;
const BLOCK_TAGS = new Set(['TABLE', 'IMG', 'SVG', 'CANVAS']);
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'BUTTON', 'NOSCRIPT', 'TEMPLATE', 'SELECT', 'DATALIST', 'OPTION']);

/* ---------------- colours & styles ---------------- */
function hex(color) {
  const m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)/.exec(color || '');
  if (!m) return null;
  if (m[4] !== undefined && Number(m[4]) < 0.15) return null; // (almost) transparent
  return [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase();
}
const isWhite = (h) => !h || h === 'FFFFFF';
const isDark = (h) => {
  if (!h) return false;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 60;
};
const bgOf = (cs) => {
  const h = hex(cs.backgroundColor);
  return isWhite(h) ? null : h;
};
const hasBorder = (cs) => ['Top', 'Right', 'Bottom', 'Left'].some((s) => parseFloat(cs[`border${s}Width`]) > 0 && hex(cs[`border${s}Color`]));

function align(cs) {
  return { center: AlignmentType.CENTER, right: AlignmentType.RIGHT, end: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED }[cs.textAlign];
}

/* ---------------- visibility ---------------- */
function skip(el) {
  if (SKIP_TAGS.has(el.tagName)) return true;
  if (el.classList?.contains('no-print') || el.classList?.contains('r-foot')) return true;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return true;
  const cs = getComputedStyle(el);
  if (cs.display === 'none' && !el.classList.contains('print-only')) return true;
  if (cs.visibility === 'hidden') return true;
  return false;
}
function isBlock(el) {
  if (BLOCK_TAGS.has(el.tagName.toUpperCase())) return true;
  if (el.classList.contains('print-only')) return true;
  const d = getComputedStyle(el).display;
  return !['inline', 'inline-block', 'inline-flex', 'inline-grid', 'contents'].includes(d);
}
const hasBlockChild = (el) => [...el.children].some((c) => !skip(c) && isBlock(c));

/* ---------------- images ---------------- */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image'));
    img.src = src;
  });
}
async function rasterize(src, w, h, scale = 2) {
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}

// SVG → PNG, with the computed styles inlined so CSS-styled charts keep their colours
const SVG_PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'opacity', 'fill-opacity', 'font-size', 'font-family', 'font-weight', 'text-anchor', 'dominant-baseline', 'letter-spacing'];
async function svgToPng(svg, w, h) {
  const clone = svg.cloneNode(true);
  const src = [svg, ...svg.querySelectorAll('*')];
  const dst = [clone, ...clone.querySelectorAll('*')];
  src.forEach((node, i) => {
    const cs = getComputedStyle(node);
    dst[i].setAttribute('style', SVG_PROPS.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(';'));
  });
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', w);
  clone.setAttribute('height', h);
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
  try {
    return await rasterize(url, w, h);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function imageBlock(el, ctx) {
  const rect = el.getBoundingClientRect();
  let w = rect.width;
  let h = rect.height;
  if (!w || !h) return [];
  const k = Math.min(1, ctx.maxWidth / w);
  w = Math.round(w * k);
  h = Math.round(h * k);
  let data;
  let type = 'png';
  try {
    if (el.tagName.toUpperCase() === 'SVG') {
      data = await svgToPng(el, rect.width, rect.height);
    } else if (el.tagName === 'CANVAS') {
      data = new Uint8Array(await (await new Promise((r) => el.toBlob(r, 'image/png'))).arrayBuffer());
    } else {
      const src = el.currentSrc || el.src;
      const blob = await (await fetch(src)).blob();
      if (blob.type === 'image/jpeg' || blob.type === 'image/png' || blob.type === 'image/gif') {
        data = new Uint8Array(await blob.arrayBuffer());
        type = blob.type === 'image/jpeg' ? 'jpg' : blob.type.slice(6);
      } else {
        // webp / svg files → png
        const url = URL.createObjectURL(blob);
        try {
          data = await rasterize(url, rect.width, rect.height);
        } finally {
          URL.revokeObjectURL(url);
        }
      }
    }
  } catch {
    return [new Paragraph({ children: [new TextRun({ text: `[${el.getAttribute('alt') || 'image'}]`, italics: true, color: '888888' })] })];
  }
  return [
    new Paragraph({
      alignment: align(getComputedStyle(el.parentElement)) || AlignmentType.LEFT,
      spacing: { after: 60 },
      children: [new ImageRun({ type, data, transformation: { width: w, height: h } })],
    }),
  ];
}

/* ---------------- text ---------------- */
function textRuns(nodes, base) {
  const runs = [];
  const walk = (node, cs) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const pre = /pre/.test(cs.whiteSpace);
      let text = pre ? node.textContent : node.textContent.replace(/\s+/g, ' ');
      if (!text) return;
      if (cs.textTransform === 'uppercase') text = text.toUpperCase();
      const color = hex(cs.color);
      const size = Math.round(Math.min(parseFloat(cs.fontSize) || 14, 40) * PX_TO_HALF_PT);
      const font = KANNADA.test(text) ? { ascii: 'Nirmala UI', hAnsi: 'Nirmala UI', cs: 'Nirmala UI', eastAsia: 'Nirmala UI' } : undefined;
      const opts = {
        bold: Number(cs.fontWeight) >= 600 || cs.fontWeight === 'bold',
        italics: cs.fontStyle === 'italic',
        underline: /underline/.test(cs.textDecorationLine) ? {} : undefined,
        color: color && color !== '000000' ? color : undefined,
        size,
        font,
      };
      const parts = pre ? text.split('\n') : [text];
      parts.forEach((t, i) => runs.push(new TextRun({ ...opts, text: t, break: i > 0 ? 1 : undefined })));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || skip(node)) return;
    if (node.tagName === 'BR') {
      runs.push(new TextRun({ text: '', break: 1 }));
      return;
    }
    const ncs = getComputedStyle(node);
    node.childNodes.forEach((c) => walk(c, ncs));
  };
  nodes.forEach((n) => walk(n, n.nodeType === Node.ELEMENT_NODE ? getComputedStyle(n.parentElement) : base));
  return runs;
}

function paragraphFrom(nodes, container, extra = {}) {
  const cs = getComputedStyle(container);
  // trim whitespace at both ends of the paragraph
  const runs = textRuns(nodes, cs);
  const plain = nodes.map((n) => n.textContent).join('').trim();
  const hasBreak = nodes.some((n) => n.nodeType === Node.ELEMENT_NODE && (n.tagName === 'BR' || n.querySelector?.('br')));
  if (!plain && !hasBreak) return null;
  const fs = parseFloat(cs.fontSize) || 14;
  return new Paragraph({
    alignment: align(cs),
    spacing: { before: 0, after: Math.round(Math.min(fs, 20) * 6) },
    children: runs,
    ...extra,
  });
}

/* ---------------- blocks ---------------- */
async function blockChildren(el, ctx) {
  const out = [];
  let inline = [];
  const flush = () => {
    if (inline.length) {
      const p = paragraphFrom(inline, el);
      if (p) out.push(p);
      inline = [];
    }
  };
  for (const child of el.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) inline.push(child);
    else if (child.nodeType === Node.ELEMENT_NODE && !skip(child)) {
      if (isBlock(child)) {
        flush();
        out.push(...(await convertBlock(child, ctx)));
      } else inline.push(child);
    }
  }
  flush();
  return out;
}

const thin = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const borders = (on) => ({ top: on ? thin : none, bottom: on ? thin : none, left: on ? thin : none, right: on ? thin : none, insideHorizontal: on ? thin : none, insideVertical: on ? thin : none });

async function cellChildren(el, ctx) {
  const kids = await blockChildren(el, { ...ctx, maxWidth: ctx.cellWidth || ctx.maxWidth / 2 });
  return kids.length ? kids : [new Paragraph('')];
}

async function convertTable(table, ctx) {
  const rows = [];
  const nCols = Math.max(1, ...[...table.rows].map((r) => [...r.cells].reduce((n, c) => n + (c.colSpan || 1), 0)));
  for (const tr of table.rows) {
    if (skip(tr)) continue;
    const cells = [];
    for (const td of tr.cells) {
      if (skip(td)) continue;
      const cs = getComputedStyle(td);
      const fill = bgOf(cs) || bgOf(getComputedStyle(tr));
      cells.push(
        new TableCell({
          children: await cellChildren(td, { ...ctx, cellWidth: (ctx.maxWidth / nCols) * (td.colSpan || 1) }),
          columnSpan: td.colSpan > 1 ? td.colSpan : undefined,
          rowSpan: td.rowSpan > 1 ? td.rowSpan : undefined,
          shading: fill ? { type: ShadingType.CLEAR, fill, color: 'auto' } : undefined,
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
        }),
      );
    }
    if (cells.length) rows.push(new TableRow({ children: cells, tableHeader: tr.parentElement?.tagName === 'THEAD' }));
  }
  if (!rows.length) return [];
  // keep the on-screen column proportions (first row without merged cells)
  let columnWidths;
  const model = [...table.rows].find((r) => r.cells.length === nCols);
  if (model) {
    const px = [...model.cells].map((c) => c.getBoundingClientRect().width);
    const total = px.reduce((a, b) => a + b, 0) || 1;
    const twips = (ctx.cellWidth || ctx.maxWidth) * 15;
    columnWidths = px.map((w) => Math.max(300, Math.round((w / total) * twips)));
  }
  return [
    new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths, borders: borders(true) }),
    new Paragraph({ spacing: { after: 80 }, children: [] }),
  ];
}

// A bar track: children sized with inline % widths (bar charts, meters) → one proportional table row
function isTrack(el) {
  const kids = [...el.children].filter((k) => !skip(k));
  return kids.length > 0 && kids.every((k) => /%$/.test(k.style?.width || ''));
}
function convertTrack(el) {
  const kids = [...el.children].filter((k) => !skip(k));
  const trackFill = bgOf(getComputedStyle(el)) || 'EEEEEE';
  const cells = [];
  let used = 0;
  for (const k of kids) {
    const pct = Math.max(0, Math.min(100 - used, parseFloat(k.style.width) || 0));
    if (pct < 0.5) continue;
    used += pct;
    const fill = bgOf(getComputedStyle(k)) || '999999';
    const text = k.textContent.trim();
    cells.push(
      new TableCell({
        width: { size: Math.max(1, Math.round(pct)), type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill, color: 'auto' },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, size: 14, bold: true, color: isDark(fill) || fill !== 'F2B705' ? 'FFFFFF' : '000000' })] })],
      }),
    );
  }
  if (100 - used >= 0.5 || !cells.length) {
    cells.push(new TableCell({ width: { size: Math.max(1, Math.round(100 - used)), type: WidthType.PERCENTAGE }, shading: { type: ShadingType.CLEAR, fill: trackFill, color: 'auto' }, children: [new Paragraph({ children: [new TextRun({ text: '', size: 14 })] })] }));
  }
  return [new Table({ rows: [new TableRow({ children: cells })], width: { size: 100, type: WidthType.PERCENTAGE }, borders: borders(false) }), new Paragraph({ spacing: { after: 40 }, children: [] })];
}

async function gridCell(item, ctx) {
  if (isTrack(item)) return convertTrack(item);
  const tag = item.tagName.toUpperCase();
  if (tag === 'IMG' || tag === 'SVG' || tag === 'CANVAS') {
    const img = await imageBlock(item, { ...ctx, maxWidth: ctx.cellWidth });
    return img.length ? img : [new Paragraph('')];
  }
  if (tag === 'TABLE') return [...(await convertTable(item, ctx)), new Paragraph('')];
  if (isBlock(item) && hasBlockChild(item)) return cellChildren(item, ctx);
  return [paragraphFrom([...item.childNodes], item) || new Paragraph('')];
}

// CSS grid / row-flex of boxes (photo grid, KPI tiles, outcome boxes…) → a layout table
async function convertGrid(el, cs, ctx) {
  const items = [...el.children].filter((c) => !skip(c));
  let cols = cs.display.includes('grid') ? cs.gridTemplateColumns.split(' ').filter((t) => t && t !== 'none').length : items.length;
  cols = Math.max(1, Math.min(cols || 1, 6, items.length));
  const cellWidth = ctx.maxWidth / cols - 12;
  const bordered = items.some((c) => hasBorder(getComputedStyle(c)));
  const containerFill = bgOf(cs); // e.g. a dark title band holding a heading + a kicker
  const rows = [];
  for (let i = 0; i < items.length; i += cols) {
    const slice = items.slice(i, i + cols);
    const cells = [];
    for (const item of slice) {
      const ics = getComputedStyle(item);
      const fill = bgOf(ics) || containerFill;
      cells.push(
        new TableCell({
          width: { size: Math.floor(100 / cols), type: WidthType.PERCENTAGE },
          children: await gridCell(item, { ...ctx, cellWidth }),
          shading: fill ? { type: ShadingType.CLEAR, fill, color: 'auto' } : undefined,
          verticalAlign: VerticalAlign.TOP,
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
        }),
      );
    }
    while (cells.length < cols)
      cells.push(
        new TableCell({
          children: [new Paragraph('')],
          width: { size: Math.floor(100 / cols), type: WidthType.PERCENTAGE },
          shading: containerFill ? { type: ShadingType.CLEAR, fill: containerFill, color: 'auto' } : undefined,
        }),
      );
    rows.push(new TableRow({ children: cells, cantSplit: true }));
  }
  return [new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE }, borders: borders(bordered) }), new Paragraph({ spacing: { after: 80 }, children: [] })];
}

async function convertBlock(el, ctx) {
  const tag = el.tagName.toUpperCase();
  if (tag === 'TABLE') return convertTable(el, ctx);
  if (tag === 'IMG' || tag === 'SVG' || tag === 'CANVAS') return imageBlock(el, ctx);
  if (isTrack(el)) return convertTrack(el);
  const cs = getComputedStyle(el);
  const kids = [...el.children].filter((c) => !skip(c));
  const rowFlex = cs.display.includes('flex') && !cs.flexDirection.startsWith('column');
  const isGrid = cs.display.includes('grid');
  // logo + text, photo grids, tiles, outcome boxes
  if ((isGrid || rowFlex) && kids.length >= 2 && kids.some((k) => isBlock(k) || k.tagName.toUpperCase() === 'SVG' || k.tagName === 'IMG')) {
    return convertGrid(el, cs, ctx);
  }
  const fill = bgOf(cs);
  if (!hasBlockChild(el)) {
    // a leaf block — one paragraph (coloured bars keep their colour)
    // dark bars get a little padding; their white text colour comes from the computed style
    const pad = fill && isDark(fill) ? { spacing: { before: 120, after: 80 } } : {};
    const p = paragraphFrom([...el.childNodes], el, fill ? { shading: { type: ShadingType.CLEAR, fill, color: 'auto' }, ...pad } : {});
    return p ? [p] : [];
  }
  // boxed container (grey remark box…) → single-cell table to keep the box
  if ((fill || hasBorder(cs)) && !el.classList.contains('r-page')) {
    const children = await blockChildren(el, { ...ctx, maxWidth: ctx.maxWidth - 20 });
    if (!children.length) return [];
    return [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: borders(hasBorder(cs)),
        rows: [new TableRow({ children: [new TableCell({ children, shading: fill ? { type: ShadingType.CLEAR, fill, color: 'auto' } : undefined, margins: { top: 80, bottom: 80, left: 120, right: 120 } })] })],
      }),
      new Paragraph({ spacing: { after: 80 }, children: [] }),
    ];
  }
  return blockChildren(el, ctx);
}

/* ---------------- document ---------------- */
function footerFor(page) {
  const foot = page.querySelector('.r-foot');
  if (!foot) return undefined;
  const parts = [...foot.children].map((c) => c.textContent.trim()).filter(Boolean);
  const text = parts.length ? parts.join('     |     ') : foot.textContent.trim();
  return new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, size: 15, color: '6B7280' })] })] });
}

/**
 * Builds a .docx from the report element (default `.report`) and downloads it.
 * Each `.r-page` becomes a Word page; `.r-land` pages are landscape.
 */
export async function exportToWord(root, filename) {
  if (!root) throw new Error('Nothing to export.');
  const pages = root.querySelectorAll(':scope > .r-page').length ? [...root.querySelectorAll(':scope > .r-page')] : [root];
  const sections = [];
  for (const page of pages) {
    if (skip(page)) continue;
    const landscape = page.classList.contains('r-land') || page.getBoundingClientRect().width > 1000;
    const ctx = { maxWidth: landscape ? 980 : 640 };
    const children = await blockChildren(page, ctx);
    sections.push({
      properties: {
        page: {
          size: landscape ? { orientation: PageOrientation.LANDSCAPE } : {},
          margin: { top: 720, bottom: 720, left: 720, right: 720 },
        },
      },
      footers: footerFor(page) ? { default: footerFor(page) } : undefined,
      children: children.length ? children : [new Paragraph('')],
    });
  }
  const doc = new Document({
    creator: 'Reliable Services',
    title: filename.replace(/\.docx$/i, ''),
    styles: { default: { document: { run: { font: 'Calibri', size: 20 } } } },
    sections,
  });
  const blob = await Packer.toBlob(doc);
  saveBlob(blob, filename.endsWith('.docx') ? filename : `${filename}.docx`);
}
