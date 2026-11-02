#!/usr/bin/env python3
"""Local conversion test with fixture data. Does not write to Feishu."""
import argparse,json,os,subprocess,sys
from pathlib import Path

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--output',type=Path,required=True);a=ap.parse_args();a.output.mkdir(parents=True,exist_ok=True)
    root=Path(__file__).resolve().parents[1];svg=root/'examples/quickstart.svg'
    base=['npx','-y','@larksuite/whiteboard-cli@'+os.environ.get('WHITEBOARD_CLI_VERSION','^0.2.13'),'-i',str(svg),'-f','svg']
    steps=[]
    commands=[('check',base+['--check']),('convert',base+['--to','openapi','-o',str(a.output/'board.openapi.json')]),('render',base+['-o',str(a.output/'preview.png')])]
    for name,cmd in commands:
        try:
            r=subprocess.run(cmd,capture_output=True,text=True,timeout=180)
            (a.output/(name+'.log')).write_text(r.stdout+r.stderr)
            ok=r.returncode==0;detail='exit '+str(r.returncode)
            if name=='check' and ok:
                try:
                    obj=json.loads(r.stdout);check=(obj.get('data') or {}).get('check')
                    ok=isinstance(check,dict) and 'errors' in check and int(check['errors'])==0
                    detail='errors must be present and zero; review any warnings in check.log'
                except (ValueError,TypeError):ok=False;detail='missing/invalid check JSON'
            if name=='convert':ok=ok and (a.output/'board.openapi.json').is_file() and (a.output/'board.openapi.json').stat().st_size>0
            if name=='render':ok=ok and (a.output/'preview.png').is_file() and (a.output/'preview.png').stat().st_size>0
            steps.append(dict(step=name,ok=ok,detail=detail))
        except (OSError,subprocess.TimeoutExpired) as e:steps.append(dict(step=name,ok=False,detail=type(e).__name__))
        if not steps[-1]['ok']:break
    result=dict(ok=len(steps)==3 and all(s['ok'] for s in steps),scope='local only',steps=steps,visual_review='not performed by script',cloud_round_trip='not performed')
    payload=json.dumps(result,indent=2);(a.output/'smoke_result.json').write_text(payload+'\n');print(payload)
    return 0 if result['ok'] else 1
if __name__=='__main__':raise SystemExit(main())
