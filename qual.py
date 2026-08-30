import re, sys, os

doms = set(open(r'W:\Projects\hacks\GoatWhistle\dom_syms.txt').read().split())

# type-position patterns: capture prefix, symbol
pats = [
    # struct field:  Name   Type  `tag`   ->  qualify Type
    re.compile(r'^(\t[A-Za-z_][A-Za-z0-9_]*\s+(?:\[\])?\*?(?:map\[[A-Za-z0-9_\.\[\]\*]+\])?)([A-Z][A-Za-z0-9_]*)\b'),
    # embedded/anonymous or continuation after [] * ( chan etc within a line
]

def qual(path):
    out = []
    changed = False
    for line in open(path, encoding='utf-8').read().split('\n'):
        orig = line
        m = pats[0].match(line)
        if m and m.group(2) in doms:
            line = m.group(1) + 'models.' + m.group(2) + line[m.end(2):]
        out.append(line)
        if line != orig:
            changed = True
    open(path, 'w', encoding='utf-8', newline='').write('\n'.join(out))
    return changed

for f in sys.argv[1:]:
    qual(f)
