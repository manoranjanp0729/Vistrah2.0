import {afterEach,expect,it,vi} from 'vitest';
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();});
it('loads the official SDK once and accepts only its credential callback interface',async()=>{
 const sdk={initialize:vi.fn(),renderButton:vi.fn()};const script:{src?:string;onload?:()=>void}={};
 const append=vi.fn(()=>{script.onload?.();});
 vi.stubGlobal('window',{google:{accounts:{id:sdk}}});
 vi.stubGlobal('document',{createElement:()=>script,head:{appendChild:append}});
 const {loadGoogleIdentity}=await import('../../shared/google-web');
 expect(await loadGoogleIdentity()).toBe(sdk);expect(await loadGoogleIdentity()).toBe(sdk);
 expect(script.src).toBe('https://accounts.google.com/gsi/client');expect(append).toHaveBeenCalledOnce();
});
it('SDK load failures never manufacture an email identity',async()=>{
 const script:{onerror?:()=>void;remove:()=>void}={remove:vi.fn()};
 vi.stubGlobal('document',{createElement:()=>script,head:{appendChild:()=>script.onerror?.()}});
 const {loadGoogleIdentity}=await import('../../shared/google-web');
 await expect(loadGoogleIdentity()).rejects.toThrow('Use email and password');
 expect(script.remove).toHaveBeenCalledOnce();
});
