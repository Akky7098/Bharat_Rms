"""Static API/question backlog. Reads source only; never imports the app or connects to DB."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def without_comments(source):
    result = []; i = 0; quote = None
    while i < len(source):
        char = source[i]
        if quote:
            result.append(char)
            if char == '\\' and i + 1 < len(source):
                i += 1; result.append(source[i])
            elif char == quote:
                quote = None
            i += 1; continue
        if char in ('"', "'", '`'):
            quote = char; result.append(char); i += 1; continue
        if source.startswith('//', i):
            end = source.find('\n', i)
            if end < 0: end = len(source)
            result.append(' ' * (end-i)); i = end; continue
        if source.startswith('/*', i):
            end = source.find('*/', i+2)
            end = len(source) if end < 0 else end+2
            result.append(''.join('\n' if c == '\n' else ' ' for c in source[i:end])); i = end; continue
        result.append(char); i += 1
    return ''.join(result)

def call_end(source, start):
    depth = 1; quote = None; i = start
    while i < len(source):
        c = source[i]
        if quote:
            if c == '\\': i += 2; continue
            if c == quote: quote = None
        elif c in ('"', "'", '`'): quote = c
        elif c == '(': depth += 1
        elif c == ')':
            depth -= 1
            if depth == 0: return i
        i += 1
    raise ValueError('Unbalanced route call')

def build():
    app = without_comments((ROOT/'app.js').read_text())
    imports = dict(re.findall(r'(\w+)\s*=\s*require\(\s*["\']\./routes/([^"\']+)["\']\s*\)', app))
    mounts = {}
    for prefix, variable in re.findall(r'app\.use\(\s*["\']([^"\']+)["\']\s*,\s*(\w+)\s*\)', app):
        filename = imports.get(variable)
        if filename:
            values=mounts.setdefault(filename.removesuffix('.js')+'.js', [])
            if prefix not in values: values.append(prefix)
    lines = ['# API-backed question coverage and implementation backlog', '',
        'Generated from active router calls, excluding commented-out code. Paths are relative when a mount',
        'could not be resolved statically. This inventory does not execute any API. Handler names describe',
        'API functionality; candidate questions below are a backlog, not enabled chatbot features.', '',
        'Write/approval/authentication endpoints remain app actions, never free-form chat commands.',
        'GET does not automatically mean harmless: PDF/download/send/diagnostic routes need individual review.', '',
        'See ask-bharat-api-question-plan.md for reviewed question families and access decisions.', '']
    count = 0
    for path in [*sorted((ROOT/'routes').glob('*.js')), ROOT/'app.js', ROOT/'server.js']:
        source = without_comments(path.read_text()); entries = []
        for match in re.finditer(r'(?:router|app)\.(get|post|put|patch|delete|all)\s*\(\s*(["\'`])(.*?)\2\s*,', source, re.S):
            end = call_end(source, source.index('(', match.start())+1)
            args = source[match.end():end]
            names = re.findall(r'\b[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*\b', args)
            handler = 'inline handler' if '=>' in args else ', '.join(names)
            prefixes = [''] if path.name in ('app.js','server.js') else mounts.get(path.name, ['(mount unresolved)'])
            route_paths=[match[3]]
            if '${' in match[3]:
                if path.name!='attendanceRoutes.js': raise ValueError('Review newly added dynamic routes: '+path.name)
                route_paths=[match[3].replace('${path}', name) for name in ('work-from-home','short-leave')]
                if '${action}' in match[3]:route_paths=[p.replace('${action}', action) for p in route_paths for action in ('approve','reject')]
            line = source.count('\n', 0, match.start())+1
            action = 'Review read/report candidate' if match[1]=='get' else 'App action; no automatic chat execution'
            if re.search(r'approve|restart|/qr|/webhook|public-key|/token',match[3]) or 'whatsappApproval' in path.name: action='Operational/access/action route; not a chat report'
            for route_path in route_paths:
                endpoint = ', '.join(prefix.rstrip('/')+'/'+route_path.lstrip('/') for prefix in prefixes)
                entries.append(f'| {match[1].upper()} | `{endpoint}` | {handler} | {action} | {path.name}:{line} |')
        if entries:
            count += len(entries)
            lines += [f'## {path.name}', '', '| Method | API | Middleware / handler | Chat decision | Source |', '| --- | --- | --- | --- | --- |', *entries, '']
    lines.insert(2, f'Inventory: {count} defined endpoints across {len(list((ROOT/"routes").glob("*.js")))} route files plus app.js/server.js. Dynamic attendance routes are expanded; unresolved mounts are not claimed as live APIs.')
    target = ROOT/'docs/ask-bharat-api-inventory.md'
    target.write_text('\n'.join(lines)+'\n')
    print(f'{count} endpoint declarations inventoried in {target.relative_to(ROOT)}')

if __name__ == '__main__': build()
