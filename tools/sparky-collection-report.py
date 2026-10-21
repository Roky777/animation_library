"""Validate the local collection and refresh its human-readable status table."""
from pathlib import Path
import json
root = Path(__file__).resolve().parents[1]
folder = root / 'animation/sparky/improved'
manifest = json.loads((folder / 'manifest.json').read_text())
entries = manifest['entries']
assert len({entry['id'] for entry in entries}) == len(entries)
for entry in entries:
    for filename in [entry.get('input')] + entry.get('inputAlternatives', []):
        if filename:
            assert (root / filename).is_file(), filename
    if entry['status'] == 'ready':
        playback = entry['playback']
        assert (root / playback['file']).is_file(), playback['file']
        assert len(playback['holds']) == playback['count']
        assert all(hold > 0 for hold in playback['holds'])
        assert playback['count'] <= playback['columns'] * playback['rows']
ready = sum(entry['status'] == 'ready' for entry in entries)
available = sum(entry['status'] == 'input_available' for entry in entries)
lines = ['# Improved Sparky animation collection', '',
    f'{ready} of {len(entries)} animations playable; {available} source inputs pending improvement; {len(entries)-ready-available} awaiting input.', '',
    'Original Lucas clip names are preserved. Numbered inputs are in `unpolished anmations/`. Nine repeated versions are recoverably archived in `animation/sparky/source-archive/unpolished-duplicates/`.', '',
    '| # | Lucas clip | Status | Source |', '| --- | --- | --- | --- |']
for i,entry in enumerate(entries,1):
    lines.append(f"| {i:02} | `{entry['clip']}` | {entry['status'].replace('_',' ')} | {entry.get('input') or 'Not supplied'} |")
lines += ['', 'Each playable animation has a separate folder with its sprite sheet, PNG frames, `animation.json` timing, and generation notes. `ready` means available for playback review; it does not imply final artistic approval.', '',
    'The animator reads `manifest.json` at startup or through **Refresh collection**. Only playable entries are enabled. Breathing already baked into an export must not receive a second runtime breathing transform.', '',
    'Review one source at a time: inspect keys and contacts → correct construction → add necessary breakdowns → preview normal and half speed → save the accepted export. Partial or candidate inputs still require action-specific review. Do not mirror directional artwork to invent missing clips.', '',
    'See `INPUT_REVIEW.md` for input coverage, `unpolished anmations/rename-map.json` for preserved original filenames and hashes, and each output folder’s `GENERATION.md` for the prompt and assembly method.']
(folder / 'README.md').write_text('\n'.join(lines) + '\n')
print(f'Validated {len(entries)} entries: {ready} playable, {available} pending, {len(entries)-ready-available} missing.')
