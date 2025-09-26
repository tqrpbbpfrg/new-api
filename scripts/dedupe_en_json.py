# -*- coding: utf-8 -*-
"""
Simple script to deduplicate keys in web/src/i18n/locales/en.json.
Keeps the first occurrence of each key and writes back a pretty-printed JSON file.

Run with: python dedupe_en_json.py
"""
import json
from collections import OrderedDict

in_path = r"d:\develop\new-api\web\src\i18n\locales\en.json"
out_path = in_path

with open(in_path, 'r', encoding='utf-8') as f:
    raw = f.read()

# The file may be JSONC (comments allowed). We'll try to strip comments crudely: remove lines starting with // or /* */ style blocks.
lines = raw.splitlines()
clean_lines = []
in_block = False
for line in lines:
    s = line.strip()
    if s.startswith('/*'):
        in_block = True
        continue
    if in_block:
        if '*/' in s:
            in_block = False
        continue
    if s.startswith('//'):
        continue
    clean_lines.append(line)

clean = '\n'.join(clean_lines)
# Parse as JSON
obj = json.loads(clean)

# Deduplicate keeping first occurrence: since json.loads already keeps last occurrence, we need to reparse manually.
# Instead, we'll scan the cleaned lines for top-level string keys and record first occurrences.
import re
key_pattern = re.compile(r'^\s*"(.*?)"\s*:\s*(.*)')
seen = set()
out_lines = []
for line in clean_lines:
    m = key_pattern.match(line)
    if m:
        key = m.group(1)
        if key in seen:
            # skip this line entirely
            continue
        seen.add(key)
        out_lines.append(line)
    else:
        out_lines.append(line)

out_text = '\n'.join(out_lines)
# Try to load to ensure valid JSON
try:
    parsed = json.loads(out_text)
except Exception as e:
    print('Failed to parse JSON after dedupe:', e)
    # fallback: write original
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(raw)
    print('Wrote original file back.')
else:
    # Write pretty-printed JSON to file
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(parsed, f, ensure_ascii=False, indent=2)
    print('Deduped and wrote back to', out_path)
