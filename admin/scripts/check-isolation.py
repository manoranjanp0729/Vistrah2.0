"""Isolated HTTP checks. Starts an in-memory API and the already-built admin app."""
import json,os,subprocess,time,urllib.request,urllib.error
from pathlib import Path
from threading import Thread
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
class Fixture(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def send(self,data,status=200):
  self.send_response(status);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps(data).encode())
 def do_GET(self):
  if self.path=='/health':return self.send({'status':'ok'})
  if self.path=='/me':
   token=self.headers.get('Authorization','')
   if token=='Bearer qa-admin':return self.send({'id':1,'name':'QA Admin','email':'admin@example.test','role':'ADMIN','phone':''})
   if token=='Bearer qa-customer':return self.send({'id':2,'name':'QA Customer','role':'CUSTOMER'})
   return self.send({'detail':'Unauthorized'},401)
  if self.path.startswith('/admin/'):return self.send({'fixture':'authorized admin response'})
  return self.send({},404)
 def do_POST(self):
  if self.path=='/auth/login':
   body=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
   admin=body.get('email')=='admin@example.test'
   return self.send({'access_token':'qa-admin' if admin else 'qa-customer','user':{'id':1 if admin else 2,'role':'ADMIN' if admin else 'CUSTOMER'}})
  if self.path=='/auth/logout':return self.send({'ok':True})
  return self.send({},404)
def run():
 root=Path(__file__).resolve().parents[1];fixture=ThreadingHTTPServer(('127.0.0.1',0),Fixture);Thread(target=fixture.serve_forever,daemon=True).start()
 port=int(os.environ.get('ADMIN_QA_PORT','13200'));base='http://127.0.0.1:'+str(port)
 env={**os.environ,'API_URL':'http://127.0.0.1:'+str(fixture.server_port),'ALLOWED_ORIGINS':base}
 process=subprocess.Popen(['node','node_modules/next/dist/bin/next','start','--port',str(port),'--hostname','127.0.0.1'],cwd=root,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 def request(path,body=None,cookie='',origin=None):
  headers={'Cookie':cookie}
  if body is not None:headers.update({'Content-Type':'application/json','Origin':origin or base})
  req=urllib.request.Request(base+path,json.dumps(body).encode() if body is not None else None,headers)
  try:
   with urllib.request.urlopen(req,timeout=5) as response:return response.status,response.headers,response.read()
  except urllib.error.HTTPError as response:return response.code,response.headers,response.read()
 try:
  for _ in range(100):
   try:
    if request('/login')[0]==200:break
   except (OSError,urllib.error.URLError):pass
   time.sleep(.1)
  else:raise AssertionError('Admin app failed to start')
  for path in ['/admin','/admin/requests','/admin/ownership-claims','/admin/publication-drafts']:assert request(path)[0]==200,path
  assert request('/services')[0]==404
  assert request('/api/auth/register',{})[0]==404
  assert request('/api/admin/overview')[0]==401
  assert request('/api/admin/overview',cookie='vistrah_session=qa-admin')[0]==401
  assert request('/api/admin/overview',cookie='vistrah_admin_session=qa-customer')[0]==403
  status,headers,body=request('/api/auth/login',{'email':'customer@example.test','password':'fixture'});assert status==403 and not headers.get('Set-Cookie')
  assert request('/api/auth/login',{},origin='http://untrusted.example')[0]==403
  status,headers,body=request('/api/auth/login',{'email':'admin@example.test','password':'fixture'});assert status==200 and b'access_token' not in body
  cookie=headers['Set-Cookie'];assert 'vistrah_admin_session=' in cookie and 'HttpOnly' in cookie and 'SameSite=lax' in cookie
  assert request('/api/admin/overview',cookie=cookie)[0]==200
  assert request('/api/auth/logout',{},cookie=cookie)[0]==200
  print('Admin routes, independent cookie, role gates, token stripping, origin rejection and customer-route isolation passed.')
 finally:
  process.terminate()
  try:process.wait(timeout=5)
  except subprocess.TimeoutExpired:process.kill()
  fixture.shutdown();fixture.server_close()
if __name__=='__main__':run()
