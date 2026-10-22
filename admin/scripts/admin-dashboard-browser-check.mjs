// Run against an isolated admin dev server; every API response is synthetic.
// node --experimental-strip-types scripts/admin-dashboard-browser-check.mjs
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {adminTaskGroups} from '../../shared/admin-dashboard.ts';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const origin=process.env.ADMIN_REVIEW_URL??'http://127.0.0.1:3212';
assert.equal(new URL(origin).hostname,'127.0.0.1','Use an isolated loopback preview.');
const out=new URL('../../artifacts/admin-dashboard-review/',import.meta.url);
await mkdir(out,{recursive:true});
const now='2026-10-21T12:00:00Z';
const actor={id:900001,name:'Review administrator',email:'admin@example.test',role:'ADMIN',phone:'',seller_enabled:true};
const service={id:900001,category_id:900001,subcategory_id:null,title:'Sample service',slug:'sample',active:true,description:'Synthetic preview service',includes:[],image:'',popular:false};
const catalogue=[{id:900001,title:'Sample category',slug:'sample',description:'Synthetic category',active:true,services:[service],subcategories:[],image:''}];
const business={id:900001,owner_user_id:actor.id,name:'Sample owner',company:'Sample business',slug:'sample',location:'Test city',address:'Synthetic address',phone:'',email:'owner@example.test',active:true,verification_status:'VERIFIED',service_ids:[service.id],service_approvals:[{service_id:service.id,approval_status:'APPROVED',application_id:null}]};
const listing={id:'sample-listing',provider_id:business.id,seller_id:900002,business:business.company,kind:'SERVICE_PACKAGE',service_id:service.id,title:'Sample package',description:'Synthetic package description for the isolated preview.',unit_price_paise:10000,available:true,status:'SUBMITTED',revision:1,review_note:'',order_terms:null};
const requirements={sections:[{id:'sample',title:'Business information',fields:[{id:'name',label:'Business name',type:'text',required:true}]}],declarations:[],checklist:[{id:'identity',label:'Identity checked',required:true}]};
const configuration={id:900001,version:1,state:'DRAFT',configuration:requirements,change_note:'Synthetic configuration',effective_at:now,created_at:now,validation_errors:[]};
const order={id:'sample-order',revision:1,title:'Sample package',business:business.company,fulfilment_operator:'VISTRAH',status:'PENDING_CONFIRMATION',mode:'TEST',quantity:1,unit_price_paise:10000,delivery_fee_paise:0,quoted_total_paise:10000,phone:'Synthetic contact',delivery_address:null,cancellation_rule:'BEFORE_SERVICE_START',kind:'SERVICE_PACKAGE'};
const application={id:'sample-application',business:business.company,status:'SUBMITTED',created_at:now,user_id:900002,revision:1,common_configuration:requirements,common:{name:'Sample business'},documents:[],history:[],services:[{service_id:service.id,title:service.title,status:'SUBMITTED',requirement_id:configuration.id,requirements:configuration,answers:{name:'Sample business'}}]};
const advertiser={id:'sample-advertiser',owner_id:900002,name:'Sample advertiser',handle:'sample',description:'Synthetic account',status:'PENDING',review_token:'a'.repeat(64)};
const video={id:'sample-video',title:'Sample video',description:'Synthetic review video',status:'PENDING',owner_id:900002,advertiser:{...advertiser,status:'APPROVED'},views:0,likes:0,comments:0,preview_available:false};
const list=items=>({items,total:items.length,page_size:20,page:1,has_more:false});
const responses={
  '/me':actor,
  '/catalogue':catalogue,
  '/admin/catalogue':catalogue,
  '/admin/overview':{customers:1,requests:1,new_requests:1,providers:1,services:1,payments:1},
  '/admin/requests':[{id:900001,service_id:service.id,service_title:service.title,customer:'Sample customer',requirements:'Synthetic requirements',status:'NEW',created_at:now}],
  '/admin/providers':[business],
  '/admin/offers':[{id:900001,title:'Sample offer',scope:'ALL',type:'PERCENT',value:10,active:true,ends_at:now}],
  '/admin/payments':[{id:'sample-payment',amount:10000,status:'SUCCEEDED',mode:'SANDBOX',created_at:now}],
  '/admin/audit':list([{id:900001,action:'PROVIDER_EDIT',entity:'Provider',entity_id:business.id,actor_id:actor.id,created_at:now,details:{reason:'Synthetic review'}}]),
  '/admin/provider-applications':[application],
  '/admin/provider-applications/sample-application':application,
  '/admin/provider-requirements/900001':[configuration],
  '/admin/provider-requirements/versions/900001/history':[],
  '/admin/services/900001/eligible-providers':[business],
  '/admin/ownership-claims':[{id:'sample-claim',provider_id:business.id,user_id:900002,statement:'Synthetic authority evidence statement',status:'PENDING',business_type:'UNREGISTERED',evidence:[],events:[],grant_blocked:true,evidence_requirements_met:false,contact_control_verified:false,contact_control_note:'Contact verification required.'}],
  '/admin/publication-drafts':[{id:'sample-draft',provider_id:business.id,service_id:null,status:'SUBMITTED',revision:1,payload:{company:'Proposed name'},prior_payload:{company:'Previous name'}}],
  '/admin/employer-jobs':list([{id:'sample-job',title:'Sample job',employer:'Sample employer',location:'Test city',arrangement:'ONSITE',employment_type:'FULL_TIME',description:'Synthetic job description',application_url:'https://example.test/apply',salary_text:'Not supplied',deadline:null,status:'SUBMITTED',revision:1}]),
  '/admin/commerce-listings':list([listing]),
  '/admin/commerce-orders':list([order]),
  '/admin/commerce-ordering-status':{test_orders_enabled:false},
  '/admin/business-memberships':{...list([{user_id:900002,name:'Sample subscriber',email:'subscriber@example.test',current_plan:'BASIC',billing_period:'MONTHLY',status:'ACTIVE',expires_at:now,job_credits:3}]),counts:{ACTIVE:1},payment_mode:'SANDBOX'},
  '/admin/marketing-requests':{items:[{id:'sample-request',user_id:900002,kind:'VIDEO',quantity:1,status:'REQUESTED',brief:'Synthetic campaign brief',review_note:''}],total:1},
  '/admin/homepage/draft':{revision:1,published_version:null,layout:{schema_version:1,sections:[{id:'sample-section',template:'banner',title:'Sample banner',subtitle:'Synthetic preview',size:'medium',service_ids:[service.id]}]}},
  '/admin/homepage/templates':{max_sections:10,templates:{banner:{min_cards:1,max_cards:1,sizes:['medium']}}},
  '/admin/homepage/versions':{items:[],total:0},
  '/admin/v-ads/advertisers':list([advertiser]),
  '/admin/v-ads/videos':list([video]),
  '/admin/workflows':{items:[{id:'sample-workflow',customer_id:900002,request_id:900001,status:'FAILED',completed_actions:0,total_actions:1,created_at:now,retry_eligible:false}],total:1,counts:{FAILED:1},pending_customer_approvals:0,pending_admin_approvals:0,workers:[],integrations:[]},
  '/admin/job-sources':{sources:[{id:'sample-source',name:'Sample source',status:'not_configured',adapter:'Synthetic adapter',enabled:false,credential_ready:false,access_ready:false,note:'Preview only',quota:'No configured quota',requests_last_24h:0}],queued:[],recent:[]},
};
const browser=await chromium.launch({headless:true});
const results=[];
try{
  for(const width of [1440,390]){
    const page=await browser.newPage({viewport:{width,height:900}});
    const errors=[],unhandled=[],writes=[];
    let role='ADMIN',failRequests=false;
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/api/**',async route=>{
      const req=route.request(),path=new URL(req.url()).pathname.replace(/^\/api/,'');
      if(req.method()!=='GET'){writes.push(path);return route.fulfill({status:409,json:{detail:'Synthetic preview: no writes performed.'}});}
      if(path==='/me')return route.fulfill({json:{...actor,role}});
      if(failRequests&&path==='/admin/requests')return route.fulfill({status:503,json:{detail:'Synthetic API unavailable'}});
      if(!(path in responses)){unhandled.push(path);return route.fulfill({status:404,json:{detail:'Unknown synthetic fixture'}});}
      return route.fulfill({json:responses[path]});
    });
    for(const item of [{slug:'',label:'Overview'},...adminTaskGroups.flatMap(group=>group.items)]){
      const beforeErrors=errors.length;
      await page.goto(origin+'/admin'+(item.slug?'/'+item.slug:''));
      await page.locator('.admin-heading h1').waitFor();
      assert.equal(await page.locator('h1').count(),1,item.slug+': one consistent page title');
      assert.equal(await page.locator('h1').innerText(),item.label);
      // Wait for fixture-driven content, rather than capturing the loading frame.
      await page.waitForFunction(()=>!Array.from(document.querySelectorAll('.admin-tool [role="status"],.admin-tool p')).some(n=>n.textContent?.startsWith('Loading ')));
      assert.equal(errors.length,beforeErrors,item.slug+': no browser exceptions');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),item.slug+': no horizontal overflow');
      if(width===390&&item.slug==='requests')for(const select of await page.locator('.admin-toolbar > select').all())assert((await select.boundingBox()).width>=140,'Phone enquiry filters remain readable.');
      const record=page.locator('.admin-record').first();
      const count=await record.count();
      if(count){
        assert.equal(await record.getAttribute('open'),null,item.slug+': queue starts compact');
        await record.locator(':scope > summary').click();
        assert.notEqual(await record.getAttribute('open'),null,item.slug+': record expands');
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),item.slug+': expanded content fits');
      }
      if(item.slug==='requests'){
        await page.getByRole('button',{name:'Start review',exact:true}).click();
        await page.getByRole('dialog',{name:'Update request status',exact:true}).waitFor();
        await page.getByRole('button',{name:'Cancel',exact:true}).click();
        assert.equal(await page.getByRole('dialog').count(),0,'Cancelling an action closes its confirmation without a write.');
      }
      if(['requests','v-ads','homepage','memberships','provider-requirements'].includes(item.slug))await page.screenshot({path:fileURLToPath(new URL(item.slug+'-'+width+'.png',out)),fullPage:true});
      if(item.slug==='v-ads'){
        await page.getByRole('button',{name:'Video moderation',exact:true}).click();
        await page.locator('.admin-record > summary').first().click();
        assert(await page.getByRole('button',{name:'Approve video',exact:true}).isDisabled(),'No preview/check/reason cannot approve a video.');
      }
      if(item.slug==='ownership-claims'){
        const option=page.getByRole('option',{name:'Approve ownership after evidence review'});
        assert.equal(await option.evaluate(node=>node.disabled),true,'Incomplete evidence keeps ownership blocked.');
      }
      if(item.slug==='commerce-orders')assert.equal(writes.length,0,'Viewing orders cannot mutate them.');
      results.push({page:item.slug||'overview',width,recordChecked:!!count});
    }
    if(width===390){
      await page.locator('.admin-mobile-navigation > summary').click();
      await page.locator('.admin-mobile-navigation').getByRole('link',{name:'Overview',exact:true}).click();
      assert.equal(await page.locator('.admin-mobile-navigation').getAttribute('open'),null,'Navigation closes after choosing a page.');
    }
    failRequests=true;
    await page.goto(origin+'/admin/requests');
    await page.getByRole('alert').filter({hasText:'Synthetic API unavailable'}).waitFor();
    failRequests=false;role='CUSTOMER';
    for(const slug of ['requests','v-ads']){
      await page.goto(origin+'/admin/'+slug);
      await page.getByRole('heading',{name:'Administrator access required',exact:true}).waitFor();
      assert.equal(await page.locator('.admin-record').count(),0,'Customer cannot render admin records.');
    }
    assert.deepEqual(errors,[]);
    assert.deepEqual(unhandled,[]);
    assert.deepEqual(writes,[]);
    await page.close();
  }
  await writeFile(new URL('result.json',out),JSON.stringify({passed:true,results},null,2));
  console.log(JSON.stringify({passed:true,landings:results.length,widths:[1440,390],api:'mocked only'}));
}finally{await browser.close();}
