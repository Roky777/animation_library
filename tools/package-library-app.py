"""Package the portable library app and only its active animation resources."""
from pathlib import Path
import json,zipfile
root=Path(__file__).resolve().parents[1]
lib=root/'animation-library'
files=['index.html','library.css','library.js','zip.js','player.js','manifest.json','demo.html','animator.css','README.md','APP_README.md','REVIEW.md','QUALITY_REVIEW.md','OPTIMIZATION.md']
for entry in json.loads((lib/'manifest.json').read_text())['animations']:
 files.extend(entry[k] for k in ['metadata','sheet','guide'])
out=root/'output/sparky-animation-library-app.zip'
out.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as archive:
 for name in dict.fromkeys(files):archive.write(lib/name,'sparky-animation-library/'+name)
print(out)
