#!/usr/bin/env python3
"""Read-only preflight. --online may download the npx renderer, never logs in or writes docs."""
import argparse,json,os,re,shutil,subprocess,sys
from pathlib import Path

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--online',action='store_true');ap.add_argument('--output',type=Path);a=ap.parse_args()
    checks=[]
    def record(name,ok,detail):checks.append(dict(name=name,ok=bool(ok),detail=detail))
    def command(name,args,timeout=90):
        try:
            r=subprocess.run(args,capture_output=True,text=True,timeout=timeout)
            # Auth output is intentionally not logged; it can contain user/account details.
            detail=('exit '+str(r.returncode)) if name=='lark_auth' else (r.stdout+r.stderr).strip()[:400]
            record(name,r.returncode==0,detail);return r
        except (OSError,subprocess.TimeoutExpired) as e:record(name,False,type(e).__name__);return None
    root=Path(__file__).resolve().parents[1]
    record('python',sys.version_info>=(3,10),sys.version.split()[0])
    for name in ['SKILL.md','references/feishu-operations.md','assets/style-tokens/_catalog.json','examples/quickstart.svg']:
        record(name,(root/name).is_file(),'present' if (root/name).is_file() else 'missing')
    node=shutil.which('node');record('node_present',node is not None,'installed' if node else 'install Node >=20')
    if node:
        r=command('node_version',[node,'--version'])
        if r and r.returncode==0:
            m=re.search(r'(\d+)',r.stdout);record('node_minimum',m is not None and int(m.group(1))>=20,'>=20 required')
    for exe in ['npx','lark-cli']:record(exe,shutil.which(exe) is not None,'installed' if shutil.which(exe) else 'missing')
    if a.online:
        if shutil.which('lark-cli'):
            command('lark_version',['lark-cli','--version'])
            command('lark_auth',['lark-cli','auth','status'])
        if shutil.which('npx'):
            version=os.environ.get('WHITEBOARD_CLI_VERSION','^0.2.13')
            command('whiteboard_version',['npx','-y','@larksuite/whiteboard-cli@'+version,'-v'])
    result=dict(ok=all(c['ok'] for c in checks),mode='online' if a.online else 'local',checks=checks,
                not_verified=['source/target document permissions','image review','cloud write/export round trip'])
    payload=json.dumps(result,ensure_ascii=False,indent=2);print(payload)
    if a.output:a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(payload+'\n')
    return 0 if result['ok'] else 1
if __name__=='__main__':raise SystemExit(main())
