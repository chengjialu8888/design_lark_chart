"""Release behavior: complete standalone folders, reproducibility and safe failure."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('package_skills', ROOT / 'scripts/package_skills.py')
pack = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(pack)


class PackageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.root = self.base / 'repo'
        (self.root / 'assets').mkdir(parents=True)
        (self.root / 'skills/example-module/references').mkdir(parents=True)
        (self.root / 'SKILL.md').write_text('---\nname: design-lark-chart\nmetadata:\n  version: "1.4.0"\n---\n')
        (self.root / 'assets/extension-modules.json').write_text(json.dumps({'modules': [
            {'name': 'example-module', 'path': 'skills/example-module'}]}))
        (self.root / 'skills/example-module/SKILL.md').write_text('---\nname: example-module\n---\n')
        (self.root / 'skills/example-module/references/guide.md').write_text('standalone resource')

    def test_archives_complete_reproducible_and_hashes_match(self):
        a = pack.build_archives(self.root, self.base / 'a')
        b = pack.build_archives(self.root, self.base / 'b')
        self.assertEqual(a, b)
        for item in a['archives']:
            path = self.base / 'a' / item['file']
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), item['sha256'])
            with zipfile.ZipFile(path) as z:
                self.assertIsNone(z.testzip())
                self.assertIn(item['name'] + '/SKILL.md', z.namelist())
                self.assertTrue(all(n.startswith(item['name'] + '/') and '..' not in Path(n).parts
                                    for n in z.namelist()))
        with zipfile.ZipFile(self.base / 'a/example-module-1.4.0.zip') as z:
            self.assertEqual(z.read('example-module/references/guide.md'), b'standalone resource')
            self.assertNotIn('design-lark-chart/SKILL.md', z.namelist())

    def test_existing_release_not_overwritten(self):
        out = self.base / 'out'
        pack.build_archives(self.root, out)
        before = (out / 'manifest.json').read_bytes()
        with self.assertRaises(FileExistsError):
            pack.build_archives(self.root, out)
        self.assertEqual(before, (out / 'manifest.json').read_bytes())

    def test_symlink_rejected_before_archives_written(self):
        (self.root / 'linked').symlink_to(self.root / 'SKILL.md')
        out = self.base / 'out'
        with self.assertRaises(ValueError):
            pack.build_archives(self.root, out)
        self.assertFalse(out.exists())


if __name__ == '__main__':
    unittest.main()
