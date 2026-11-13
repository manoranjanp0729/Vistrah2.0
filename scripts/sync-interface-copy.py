from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[1]
source=root/'shared/interface-copy.json'
shutil.copyfile(source,root/'frontend/lib/interface-copy.json')
(root/'mobile/src/lib/interface-copy.ts').write_text('const copy = '+source.read_text().rstrip()+' as const;\nexport default copy;\n')
