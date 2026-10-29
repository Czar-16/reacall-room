"""Content integrity and deterministic generation checks; standard library only."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]

class GuideChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.lessons = json.loads((ROOT / 'lessons.json').read_text())

    def test_existing_questions_and_ids_preserved(self):
        expected = [f'{project}-{n}' for project in ['mailloop', 'purepin', 'BuzzLine'] for n in range(4)]
        self.assertEqual([l['id'] for l in self.lessons], expected)
        self.assertTrue(all(len(l['questions']) == 10 for l in self.lessons))
        questions = json.dumps([(l['id'], l['questions']) for l in self.lessons], ensure_ascii=True, separators=(',', ':'))
        self.assertEqual(hashlib.sha256(questions.encode()).hexdigest(), '0be07c4721dc699c792a1835a2a7c855c48c4b0d49b8c769a93a95a094821872')

    def test_bilingual_sections_and_diagrams(self):
        for l in self.lessons:
            for language in ['english', 'hinglish']:
                sections = l[language]
                self.assertEqual(len(sections), 6, l['id'])
                self.assertGreater(len(' '.join(s['text'] for s in sections).split()), 300, l['id'])
            d = l['diagram']
            self.assertGreaterEqual(len(d['nodes']), 4)
            self.assertGreaterEqual(len(d['edges']), 5)
            ids = {n['id'] for n in d['nodes']}
            for edge in d['edges']:
                self.assertIn(edge['source'], ids)
                self.assertIn(edge['target'], ids)
            self.assertEqual(len(d['english']), len(d['hinglish']))
            svg = ET.parse(ROOT / 'diagrams' / (l['id'] + '.svg')).getroot()
            self.assertEqual(svg.attrib['role'], 'img')
            self.assertIsNotNone(svg.find('{http://www.w3.org/2000/svg}desc'))
            self.assertIsNotNone(svg.find('.//{http://www.w3.org/2000/svg}marker'))
            self.assertTrue(all((ROOT.parent / source[0]).exists() for source in l['sources']))

    def test_skills(self):
        skills=json.loads((ROOT/'skills.json').read_text())
        self.assertEqual(len(skills),41)
        expected_names={
            'Languages': ['C++','TypeScript','JavaScript'],
            'Frontend': ['React','Next.js','Tailwind CSS','shadcn/ui','HTML5','CSS3'],
            'Backend': ['Node.js','Express','Hono','Cloudflare Workers','Socket.io','REST APIs','Inngest','Gmail API','Zod'],
            'Databases & Auth': ['MongoDB','PostgreSQL','Prisma','NextAuth/Auth.js','JWT','OAuth 2.0'],
            'DevOps & Tools': ['Docker','AWS (EC2 & S3)','Git','GitHub','Postman','Claude Code','Cursor','Dodo Payments','Vercel Analytics'],
            'Concepts': ['DSA','OOP','System Design','WebSockets'],
            'Soft Skills': ['Project Management','Collaboration','Agility','Fast Learning'],
        }
        for category,names in expected_names.items():
            self.assertEqual({s['name'] for s in skills if s['category']==category},set(names))
        self.assertEqual(len({s['id'] for s in skills}),41)
        self.assertEqual(len({s['category'] for s in skills}),7)
        self.assertEqual(sum(len(s['questions']) for s in skills),205)
        md=(ROOT/'PROJECTS_INTERVIEW_GUIDE.md').read_text()
        for s in skills:
            self.assertTrue(s['id'].startswith('skill-'))
            self.assertTrue(s['reference'].startswith('https://'))
            self.assertTrue(s['evidence'])
            for key in ['english','hinglish']:
                self.assertEqual(len(s[key]),4)
                self.assertTrue(all(len(t.split())>=16 for t in s[key]))
                for t in s[key]: self.assertIn(t,md)
            for i,q in enumerate(s['questions'],1):
                self.assertIn(f'id="{s["id"]}-q{i}"',md)
                for k in ['question','english','hinglish']:
                    self.assertTrue(q[k]);self.assertIn(q[k],md)
                    if k != 'question': self.assertGreaterEqual(len(q[k].split()),16)
                if s['category']=='Soft Skills':
                    self.assertTrue(q['english'].startswith('Sample answer:'))
                    self.assertTrue(q['hinglish'].startswith('Sample answer:'))

    def test_regeneration_is_identical_and_markdown_complete(self):
        outputs = [ROOT/'content.js', ROOT/'PROJECTS_INTERVIEW_GUIDE.md', *sorted((ROOT/'diagrams').glob('*.svg'))]
        before = {p: p.read_bytes() for p in outputs}
        with tempfile.TemporaryDirectory() as folder:
            companion = Path(folder)/'guide.md'
            subprocess.run([sys.executable, str(ROOT/'generate.py'), '--companion', str(companion)], check=True, capture_output=True)
            self.assertEqual(companion.read_bytes(), (ROOT/'PROJECTS_INTERVIEW_GUIDE.md').read_bytes())
        self.assertEqual(before, {p: p.read_bytes() for p in outputs})
        md = (ROOT/'PROJECTS_INTERVIEW_GUIDE.md').read_text()
        self.assertEqual(md.count('```mermaid'), 12)
        for l in self.lessons:
            for language in ['english', 'hinglish']:
                for s in l[language]:self.assertIn(s['text'], md)
            for q,a in l['questions']:
                self.assertIn(q,md);self.assertIn(a,md)
        js=(ROOT/'content.js').read_text().split('window.LESSONS=',1)[1].split('\nwindow.SKILLS=',1)[0].strip().removesuffix(';')
        browser_lessons=json.loads(js)
        self.assertEqual([l['id'] for l in browser_lessons],[l['id'] for l in self.lessons])
        self.assertTrue(all('svg' in l['diagram'] and 'mermaid' in l['diagram'] for l in browser_lessons))

if __name__ == '__main__':
    unittest.main()
