#!/usr/bin/env node
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

import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(process.cwd(), '.');
const srcDir = path.join(projectRoot, 'src');

// 需要扫描的后缀
const exts = ['.js', '.jsx', '.ts', '.tsx', '.css'];

// 触发判定的可疑模式（正则）
const patterns = [
  // calc(100vh - 60px) / 64px / 66px
  /calc\s*\(\s*100vh\s*-\s*(60|64|66)px\s*\)/i,
  // margin-top: 60px;  padding-top:66px;  top:64px 等
  /(?:margin|padding|top|height|line-height)\s*[:=]\s*['"]?(60|64|66)px['"]?/i,
  // className 中类似 mt-[60px]
  /mt-\[60px\]/,
  /h-\[calc\(100vh-60px\)\]/,
  /h-\[calc\(100vh-66px\)\]/,
];

// 白名单：允许包含这些关键词的行跳过（描述性注释）
const whitelistRegex =
  /(--app-header-height|HEADER HEIGHT UNIFICATION|统一消除硬编码)/i;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name === 'build')
      continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (exts.includes(path.extname(e.name))) scanFile(full);
  }
}

const violations = [];

function scanFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (whitelistRegex.test(line)) return; // skip whitelisted informative lines
    for (const p of patterns) {
      if (p.test(line)) {
        // 允许 index.css 中的覆盖行（已使用属性选择器且无新增 magic），避免误判
        if (
          file.endsWith('index.css') &&
          line.includes("[class~='h-[calc(100vh-60px)]']")
        )
          return;
        violations.push({
          file,
          line: idx + 1,
          text: line.trim(),
          pattern: p.toString(),
        });
        break;
      }
    }
  });
}

if (!fs.existsSync(srcDir)) {
  console.error('找不到 src 目录，跳过扫描');
  process.exit(0);
}

walk(srcDir);

if (violations.length > 0) {
  console.error('\n❌ 布局硬编码高度扫描失败，发现违规用法:');
  violations.forEach((v) => {
    console.error(
      `- ${v.file}:${v.line}\n  代码: ${v.text}\n  匹配: ${v.pattern}`,
    );
  });
  console.error(
    '\n请改为使用 CSS 变量 var(--app-header-height) 或语义类 mt-header / h-screen-minus-header。',
  );
  process.exit(1);
}

console.log('✅ 布局扫描通过：未发现新的硬编码 header 高度。');
