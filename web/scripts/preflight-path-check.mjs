#!/usr/bin/env node
/**
 * Preflight path & import resolution check before Vite build.
 * 目的：在 CI / Docker 构建阶段，及早发现因为复制目录结构、相对路径层级变化、大小写差异或遗漏文件导致的
 * "Could not resolve '../../context/Options'" 这类问题，并输出更清晰的诊断信息。
 */
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd(); // 应为 web/ 目录

function fail(msg, extra = {}) {
  const payload = { ok: false, msg, ...extra };
  console.error('\n[preflight-path-check] FAIL =>');
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

function info(msg) {
  console.log(`[preflight-path-check] ${msg}`);
}

function assertExists(rel) {
  const abs = path.join(projectRoot, rel);
  if (!fs.existsSync(abs)) {
    fail(`缺失文件/目录: ${rel}`, { expectedPath: abs });
  }
  return abs;
}

// 1. 关键文件是否存在
const pageLayoutPath = assertExists('src/components/layout/PageLayout.jsx');
const optionsDir = assertExists('src/context/Options');
const optionsIndex = assertExists('src/context/Options/index.jsx');

// 2. 读取 PageLayout 验证 import 语句
const pageLayoutSource = fs.readFileSync(pageLayoutPath, 'utf8');
const IMPORT_PATTERN =
  /import\s+\{?\s*useOptions\s*\}?\s+from\s+['"]\.\.\/\.\.\/context\/Options['"];?/;
if (!IMPORT_PATTERN.test(pageLayoutSource)) {
  // 允许存在大小写错误或不同写法，做进一步提示
  const anyOptionsImport = /from\s+['"][^'";]*context\/Options['"]/i.test(
    pageLayoutSource,
  );
  if (anyOptionsImport) {
    fail('检测到疑似错误的 useOptions 导入（大小写或语法不匹配）', {
      snippet: pageLayoutSource.split('\n').slice(0, 60).join('\n'),
    });
  } else {
    info('未直接在 PageLayout.jsx 找到 useOptions 导入——如果你已重构可忽略');
  }
}

// 3. 模拟 bundler 相对路径解析: 计算 ../../context/Options 实际落点
const IMPORT_REL = '../../context/Options';
const resolvedBase = path.normalize(
  path.join(path.dirname(pageLayoutPath), IMPORT_REL),
);

// 兼容 index.* 常见扩展
const candidateFiles = [
  resolvedBase,
  resolvedBase + '.js',
  resolvedBase + '.jsx',
  resolvedBase + '.ts',
  resolvedBase + '.tsx',
  path.join(resolvedBase, 'index.js'),
  path.join(resolvedBase, 'index.jsx'),
  path.join(resolvedBase, 'index.ts'),
  path.join(resolvedBase, 'index.tsx'),
];

const foundCandidate = candidateFiles.find((p) => fs.existsSync(p));
if (!foundCandidate) {
  fail('相对路径解析失败：未在候选列表中找到任何文件', {
    resolvedBase,
    candidateFiles,
  });
}

// 4. 简单大小写校验：确保真实路径 segment 大小写与源码中保持一致（Linux 下会严格区分）
function segmentCaseMismatch(targetPath) {
  const segs = targetPath.replace(projectRoot + path.sep, '').split(path.sep);
  let cur = projectRoot;
  for (const s of segs) {
    const items = fs.readdirSync(cur);
    const match = items.find((it) => it.toLowerCase() === s.toLowerCase());
    if (!match) return `目录列举中未找到段: ${s}`;
    if (match !== s) return `大小写不一致: 期望 ${s} 实际 ${match}`;
    cur = path.join(cur, match);
  }
  return null;
}

const mismatch = segmentCaseMismatch(path.relative(projectRoot, optionsIndex));
if (mismatch) {
  fail('大小写不一致导致潜在解析失败', { detail: mismatch });
}

// 5. 输出成功信息
info('路径解析检查通过');
info(`PageLayout => ${path.relative(projectRoot, pageLayoutPath)}`);
info(`Options => ${path.relative(projectRoot, optionsIndex)}`);
info('继续执行 Vite 构建...');
