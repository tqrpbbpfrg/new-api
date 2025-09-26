/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

// Basic allowlist HTML sanitizer (mirrors backend logic subset) + optional highlight
export function sanitizeHTML(raw) {
  if (!raw || typeof raw !== 'string') return '';
  // strip script/style
  let s = raw
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  const allowedTags = new Set([
    'a',
    'b',
    'strong',
    'em',
    'code',
    'pre',
    'ul',
    'ol',
    'li',
    'p',
    'br',
    'span',
    'img',
    'h1',
    'h2',
    'h3',
    'h4',
    'mark',
  ]);
  const allowedAttrs = new Set(['href', 'src', 'alt', 'title', 'class']);
  let sanitized = s.replace(/<\/?.*?>/g, (tag) => {
    const match = /^<\/?([a-zA-Z0-9]+)(.*?)>$/.exec(tag);
    if (!match) return '';
    const [, name, attrPart] = match;
    const lower = name.toLowerCase();
    if (!allowedTags.has(lower)) return '';
    if (tag.startsWith('</')) return `</${lower}>`;
    if (lower === 'br') return '<br />';
    // parse attrs
    let attrs = '';
    attrPart.replace(/([a-zA-Z0-9:_-]+)\s*=\s*"([^"]*)"/g, (_m, k, v) => {
      const lk = k.toLowerCase();
      const lv = v.trim();
      if (!allowedAttrs.has(lk)) return;
      if (lk === 'href' || lk === 'src') {
        if (/^javascript:/i.test(lv)) return; // drop js: urls
      }
      attrs += ` ${lk}="${lv}"`;
    });
    if (lower === 'img' && !/\sloading=/i.test(attrs))
      attrs += ' loading="lazy"';
    return `<${lower}${attrs}>`;
  });
  return sanitized;
}

export function highlight(html, keyword) {
  if (!keyword) return html;
  try {
    const safe = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(${safe})`, 'gi');
    // Avoid replacing inside tags
    return html.replace(re, (m) => `<mark>${m}</mark>`);
  } catch {
    return html;
  }
}
