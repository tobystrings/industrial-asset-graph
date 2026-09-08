"""Build an offline LOCAL_ONLY bundle from an evidence directory and a reviewed JSON plan.

No source is copied into public/ or dist/. The plan specifies sources, assertions,
subjects and tasks; archived prompts are retained as evidence, never executed.
"""
import argparse
import hashlib
import json
import mimetypes
from pathlib import Path
import zipfile


def prepare(root, plan, output):
    root = root.resolve()
    if root in output.resolve().parents:
        raise ValueError('Output must be outside the evidence directory')
    manifest_file = root / 'MANIFEST.json'
    if manifest_file.exists():
        for row in json.loads(manifest_file.read_text(encoding='utf-8')):
            path = (root / row['path']).resolve()
            if root not in path.parents or not path.is_file():
                raise ValueError(f'Invalid manifest path: {row["path"]}')
            data = path.read_bytes()
            if len(data) != row['bytes'] or hashlib.sha256(data).hexdigest() != row['sha256']:
                raise ValueError(f'Source integrity mismatch: {row["path"]}')
    plan['format'] = 'industrial-asset-graph-history'
    plan['version'] = 1
    plan['access'] = 'LOCAL_ONLY'
    plan['files'] = []
    entries = []
    for path in sorted(root.rglob('*')):
        if not path.is_file():
            continue
        if path.is_symlink() or root not in path.resolve().parents:
            raise ValueError('Source links are not accepted')
        relative = path.relative_to(root).as_posix()
        data = path.read_bytes()
        name = 'evidence/' + relative
        plan['files'].append(dict(path=name, sha256=hashlib.sha256(data).hexdigest(), size=len(data),
                                 mimeType=mimetypes.guess_type(relative)[0] or 'application/octet-stream',
                                 incomplete='.openai-download-' in relative or len(data) == 0))
        entries.append((name, data))
    for source in plan['sources']:
        source['paths'] = ['evidence/' + p for p in source['paths']]
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_STORED) as archive:
        for name, data in [('history.json', json.dumps(plan, ensure_ascii=False, indent=2).encode('utf-8'))] + entries:
            info = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0))
            archive.writestr(info, data)
    print(json.dumps(dict(bundle=str(output), assertions=len(plan['assertions']), sources=len(plan['sources']),
                          tasks=len(plan['tasks']), files=len(plan['files']), sha256=hashlib.sha256(output.read_bytes()).hexdigest()), indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('evidence', type=Path)
    parser.add_argument('plan', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    prepare(args.evidence, json.loads(args.plan.read_text(encoding='utf-8')), args.output)
