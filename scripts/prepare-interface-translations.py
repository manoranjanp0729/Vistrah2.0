"""Offline translation preparation. Sends static UI phrases only, never runtime data."""
import hashlib
import json
from pathlib import Path
import re
import sys
import urllib.parse
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
def read(path):return json.loads(path.read_text(encoding='utf-8'))
def flatten(value,prefix=''):
    result={}
    for key,item in value.items():
        name=prefix+'.'+key if prefix else key
        if isinstance(item,str):result[name]=item
        elif isinstance(item,dict):result.update(flatten(item,name))
    return result
phrases=read(ROOT/'scripts/interface-phrases.json')
english={**flatten(read(ROOT/'shared/interface-copy.json')),**read(ROOT/'shared/locales/en.json')}
locales={locale:read(ROOT/f'shared/locales/{locale}.json') for locale in ['kn','hi']}
cache_path=ROOT/'scripts/.interface-translations.json'
cache=read(cache_path) if cache_path.exists() else {'kn':{},'hi':{}}
brands=r'\{\w+\}|VISTRAH|V Ads|AgriConnect|HealthConnect|Google|MapTiler|H\.264|MP4|AAC|GST|PAN|Razorpay|OTP|IFSC|UPI'
def translate(batch,locale):
    protected={}
    def protect(match):
        key='ZXQ'+str(len(protected))+'QXZ';protected[key]=match.group();return key
    text='\n'.join(re.sub(brands,protect,phrase) for phrase in batch)
    query=urllib.parse.urlencode({'client':'gtx','sl':'en','tl':locale,'dt':'t','q':text})
    request=urllib.request.Request('https://translate.googleapis.com/translate_a/single?'+query,headers={'User-Agent':'Mozilla/5.0'})
    with urllib.request.urlopen(request,timeout=30) as response:data=json.load(response)
    translated=''.join(segment[0] for segment in data[0] if segment[0]).split('\n')
    if len(translated)!=len(batch):raise ValueError('Translation line alignment failed')
    result=[]
    for value,original in zip(translated,batch):
        for key,replacement in protected.items():value=value.replace(key,replacement)
        if 'ZXQ' in value or 'QXZ' in value:raise ValueError('Translation changed a protected token')
        if set(re.findall(r'\{\w+\}',value))!=set(re.findall(r'\{\w+\}',original)):raise ValueError('Translation changed placeholders')
        result.append(value.strip())
    return result

for locale in locales:
    for phrase in phrases:
        matches=[key for key,value in english.items() if value==phrase and key in locales[locale]]
        if matches:cache[locale][phrase]=locales[locale][matches[0]]
    pending=[phrase for phrase in phrases if phrase not in cache[locale]]
    if pending and '--fetch' not in sys.argv:
        raise SystemExit(f'{locale}: {len(pending)} phrases need translation. Add reviewed local copy or explicitly use --fetch for static-copy translation preparation.')
    for offset in range(0,len(pending),12):
        batch=pending[offset:offset+12]
        try:values=translate(batch,locale)
        except ValueError:values=[translate([phrase],locale)[0] for phrase in batch]
        for phrase,value in zip(batch,values):cache[locale][phrase]=value
        cache_path.with_suffix('.tmp').write_text(json.dumps(cache,ensure_ascii=False,indent=2),encoding='utf-8')
        cache_path.with_suffix('.tmp').replace(cache_path)
        print(json.dumps({'locale':locale,'completed':min(offset+len(batch),len(pending)),'total':len(pending)}),flush=True)

en=read(ROOT/'shared/locales/en.json')
for phrase in phrases:
    key='interface.'+hashlib.sha256(phrase.encode()).hexdigest()[:12]
    en[key]=phrase
    for locale in locales:locales[locale][key]=cache[locale][phrase]
for locale,data in [('en',en),*locales.items()]:
    (ROOT/f'shared/locales/{locale}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Prepared local interface dictionaries.',flush=True)
