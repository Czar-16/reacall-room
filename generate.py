"""Generate offline browser content, SVGs and the Markdown companion from lessons.json and skills.json."""
from pathlib import Path
import argparse
import html
import json

ROOT = Path(__file__).resolve().parent
DEFAULT_COMPANION = Path('/home/anoop/Placement-Resume/NEWW CV/PROJECTS_INTERVIEW_GUIDE.md')

def esc(value):
    return html.escape(str(value), quote=True)

SVG_STYLE = '''svg{--ink:#182a44;--paper:#ffffff;--line:#71829a;--blue:#245bb5;--rose:#a02d49;--teal:#087365;--violet:#7541b3;color:var(--ink);background:var(--paper)} text{fill:var(--ink);font:14px system-ui,sans-serif} .node{fill:var(--paper);stroke:var(--blue);stroke-width:1.8}.decision{fill:var(--paper);stroke:var(--blue);stroke-width:2.5}.success{stroke:var(--teal)}.error{stroke:var(--rose)}.proposed{stroke:var(--violet);stroke-dasharray:7 4}.edge{fill:none;stroke:var(--line);stroke-width:1.8}.edge.error{stroke:var(--rose)}.edge.proposed{stroke:var(--violet);stroke-dasharray:7 4}.edge.response{stroke-dasharray:4 4}.edge-label{paint-order:stroke;stroke:var(--paper);stroke-width:7px;stroke-linejoin:round;font-size:12px}.lifeline{stroke:var(--line);stroke-dasharray:4 6;opacity:.6} @media(prefers-color-scheme:dark){svg{--ink:#e0e9f9;--paper:#162338;--line:#93a4bf;--blue:#8ab8ff;--rose:#ff9cb1;--teal:#6cdecb;--violet:#ccadff}}'''

def svg_for(lesson):
    d = lesson['diagram']; lid = lesson['id']; nodes = {n['id']: n for n in d['nodes']}
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {d["width"]} {d["height"]}" role="img" aria-labelledby="{lid}-svg-title {lid}-svg-desc"><title id="{lid}-svg-title">{esc(d["title"])}</title><desc id="{lid}-svg-desc">{esc(d["description"])}</desc>', f'<style>{SVG_STYLE}</style>', '<defs>']
    for kind in ['current', 'error', 'proposed', 'response']:
        color = {'current':'var(--line)','response':'var(--line)','error':'var(--rose)','proposed':'var(--violet)'}[kind]
        out.append(f'<marker id="{lid}-arrow-{kind}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="{color}"/></marker>')
    out.append('</defs>')
    if d['kind'] == 'sequence':
        for n in d['nodes']:
            out.append(f'<path class="lifeline" d="M {n["x"]+115} 82 V {d["height"]-15}"/>')
    for e in d['edges']:
        kind=e['kind']
        if d['kind']=='sequence':
            x1=nodes[e['source']]['x']+115; x2=nodes[e['target']]['x']+115; y=e['y']
            points=[[x1,y],[x2,y]] if x1!=x2 else [[x1,y],[x1+90,y],[x1+90,y+25],[x1,y+25]]
            tx=(x1+x2)/2 if x1!=x2 else x1;ty=y-10
        else:
            points=e['points']; tx,ty=e['labelAt']
        path='M '+' L '.join(f'{x} {y}' for x,y in points)
        out.extend([f'<path class="edge {kind}" d="{path}" marker-end="url(#{lid}-arrow-{kind})"/>', f'<text class="edge-label" text-anchor="middle" x="{tx}" y="{ty}">{esc(e["label"])}</text>'])
    for n in d['nodes']:
        x=n['x'];y=n['y'];kind=n['kind'];label=n['label']
        out.append(f'<rect class="node {kind}" x="{x}" y="{y}" width="230" height="64" rx="{24 if kind=="decision" else 10}"/>')
        # Wrap at words for a consistent, readable node width.
        lines=[]; line=''
        for word in label.split():
            if len(line+' '+word)>28:
                lines.append(line);line=word
            else:line=(line+' '+word).strip()
        if line:lines.append(line)
        for j,line in enumerate(lines):
            out.append(f'<text text-anchor="middle" x="{x+115}" y="{y+36-(len(lines)-1)*9+j*18}">{esc(line)}</text>')
    out.append('</svg>')
    return ''.join(out)

def mermaid(d):
    if 'mermaid' in d:return d['mermaid']
    def label(t):return t.replace('"',"'").replace('&','and')
    if d['kind']=='sequence':
        lines=['sequenceDiagram']+[f' participant {n["id"]} as {label(n["label"])}' for n in d['nodes']]
        for e in d['edges']:
            if e['kind']=='proposed':lines.append(f' Note over {e["source"]},{e["target"]}: Proposed: {label(e["label"])}')
            else:lines.append(f' {e["source"]}{"-->>" if e["kind"]=="response" else "->>"}{e["target"]}: {label(e["label"])}')
        return '\n'.join(lines)
    if d['kind']=='state':
        return '\n'.join(['stateDiagram-v2']+[f' state "{label(n["label"])}" as {n["id"]}' for n in d['nodes']]+[f' {e["source"]} --> {e["target"]}: {"Proposed: " if e["kind"]=="proposed" else ""}{label(e["label"])}' for e in d['edges']])
    return '\n'.join(['flowchart TD']+[f' {n["id"]}["{label(n["label"])}"]' for n in d['nodes']]+[f' {e["source"]} {"-." if e["kind"]=="proposed" else "--"} "{label(e["label"])}" {".->" if e["kind"]=="proposed" else "-->"} {e["target"]}' for e in d['edges']])

def generate(companion=None):
    lessons=json.loads((ROOT/'lessons.json').read_text())
    skills=json.loads((ROOT/'skills.json').read_text())
    assert len(skills)==41 and all(len(s['questions'])==5 for s in skills)
    assert len(lessons)==12 and sum(len(l['questions']) for l in lessons)==120
    md=['# Fieldnotes — bilingual interview study guide', 'All examples are illustrative, not measured production results. Current behavior and proposed safeguards are labeled separately. Original resume/code discrepancy notes are retained.','Diagram legend: solid arrows = current flow; dashed violet = proposed safeguard; rose = failure/caution; teal = success/accepted; dotted response arrows = returned data. State names may be explanatory rather than literal code enums.']
    (ROOT/'diagrams').mkdir(exist_ok=True)
    for l in lessons:
        d=l['diagram'];d['svg']=svg_for(l);d['mermaid']=mermaid(d)
        (ROOT/'diagrams'/f'{l["id"]}.svg').write_text(d['svg'])
        md.extend([f'<a id="{l["id"]}"></a>', f'## {l["project"]} — {l["title"]}','### Original English explanation',l['explanation']])
        for key,title in [('english','Detailed English'),('hinglish','Hinglish · Roman script')]:
            md.append('### '+title)
            for s in l[key]:md.extend(['#### '+s['title'],s['text']])
        md.extend(['### Trace the flow',d['description'],'```mermaid\n'+d['mermaid']+'\n```','#### English walkthrough','\n'.join(f'{i}. {s}' for i,s in enumerate(d['english'],1)),'#### Hinglish walkthrough','\n'.join(f'{i}. {s}' for i,s in enumerate(d['hinglish'],1)),'### Original illustrative example',l['example'],'### Interview practice'])
        for i,(q,a) in enumerate(l['questions']):md.extend([f'<a id="{l["id"]}-{i}"></a>',f'#### {i+1}. {q}',a])
        md.append('### Source excerpts (selected snapshots)')
        for path,code in l['sources']:md.extend(['`'+path+'`','```typescript\n'+code+'\n```'])
    md.extend(['<a id="skills"></a>', '## Skills & Tools', '41 entries and 205 answered bilingual questions. Illustrative examples and sample answers do not claim personal experience. Project references identify verified use; other entries are explicitly unverified.', '\n'.join('- ['+c+'](#skills-'+c.lower().replace(' & ', '-').replace(' ', '-')+')' for c in dict.fromkeys(s['category'] for s in skills))])
    category=None
    for s in skills:
        if s['category'] != category:
            category=s['category']
            md.extend(['<a id="skills-'+category.lower().replace(' & ', '-').replace(' ', '-')+'"></a>', '### '+category])
        md.extend([f'<a id="{s["id"]}"></a>', '#### '+s['name'], s['evidence'], '**English**', *s['english'], '**Hinglish · Roman script**', *s['hinglish'], '[Official reference]('+s['reference']+')'])
        for i,q in enumerate(s['questions'],1):
            md.extend([f'<a id="{s["id"]}-q{i}"></a>', f'##### Q{i}. {q["question"]}', '**Sample answer · hypothetical**' if category=='Soft Skills' else '**Answer**', '**EN:** '+q['english'], '**HI:** '+q['hinglish']])
    (ROOT/'content.js').write_text('// Generated by generate.py; edit lessons.json and skills.json.\nwindow.LESSONS='+json.dumps(lessons,ensure_ascii=False)+';\nwindow.SKILLS='+json.dumps(skills,ensure_ascii=False)+';\n')
    text='\n\n'.join(md)+'\n';(ROOT/'PROJECTS_INTERVIEW_GUIDE.md').write_text(text)
    if companion:
        companion.parent.mkdir(parents=True,exist_ok=True);companion.write_text(text)
    elif DEFAULT_COMPANION.parent.exists():DEFAULT_COMPANION.write_text(text)
    print(f'Generated {len(lessons)} bilingual lessons, 120 original answers, 41 skills / 205 new answers, 12 SVGs and Markdown.')

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--companion',type=Path);args=parser.parse_args();generate(args.companion)
