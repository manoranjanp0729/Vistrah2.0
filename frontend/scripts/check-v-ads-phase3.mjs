/** Focused no-emit checks; avoids unrelated application entry points/builds. */
import {createRequire} from 'node:module';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import process from 'node:process';
import console from 'node:console';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(resolve(root,'frontend/package.json'));
const ts=require('typescript');
const projects={
 admin:['components/v-ads-management.tsx','components/admin-navigation.tsx','lib/v-ads-preview.ts','app/admin/v-ads/page.tsx','app/api/admin/v-ads/videos/[id]/preview/route.ts'],
 frontend:['components/v-ads-management.tsx','components/v-ads-seller.tsx','components/v-ads.tsx','lib/v-ads-management.test.ts'],
 mobile:['src/components/v-ads-management.tsx','src/app/seller/v-ads.tsx','src/app/(tabs)/v-ads.tsx'],
};
let failed=false;
for(const [name,files] of Object.entries(projects)){
 const folder=resolve(root,name);const configPath=resolve(folder,'tsconfig.json');
 const config=ts.readConfigFile(configPath,ts.sys.readFile);
 const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,folder);
 const roots=files.map(file=>resolve(folder,file));if(name!=='mobile')roots.push(resolve(folder,'next-env.d.ts'));
 const program=ts.createProgram(roots,{...parsed.options,noEmit:true,incremental:false,composite:false});
 const diagnostics=ts.getPreEmitDiagnostics(program);
 if(diagnostics.length){failed=true;console.log(ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>root,getCanonicalFileName:file=>file,getNewLine:()=> '\n'}));}
 else console.log(name+': changed V Ads entry points pass');
}
if(failed)process.exitCode=1;
