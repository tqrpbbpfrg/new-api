# -*- coding: utf-8 -*-
"""
Check for duplicate top-level keys in the JSON file (by scanning raw lines).
Print total keys and any duplicates found.
"""
import re
from collections import Counter

path = r"d:\develop\new-api\web\src\i18n\locales\en.json"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

key_pattern = re.compile(r'^\s*"(.*?)"\s*:')
keys = []
for line in lines:
    m = key_pattern.match(line)
    if m:
        keys.append(m.group(1))

cnt = Counter(keys)
dups = [k for k,v in cnt.items() if v>1]
print('Total top-level keys found:', len(keys))
print('Unique keys:', len(cnt))
if dups:
    print('Duplicates detected (key -> occurrences):')
    for k in dups:
        print(k, '->', cnt[k])
else:
    print('No duplicate keys detected.')
