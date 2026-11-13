import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applicationLink,jobDraft,emptyJob} from '../src/lib/employer-jobs.ts';
test('employer edits send only draft fields without leaking approval metadata',()=>{
  const owned={...emptyJob,title:'Engineer',id:'job-id',status:'APPROVED',reviewer_id:7,review_note:'Private review',revision:2,deadline:''};
  const draft=jobDraft(owned);
  assert.equal(draft.deadline,null);
  assert.deepEqual(Object.keys(draft).sort(),Object.keys(emptyJob).sort());
  assert.equal('status' in draft,false);
  assert.equal('reviewer_id' in draft,false);
});
test('application handoff rejects non-HTTPS links and embedded credentials',()=>{
  assert.equal(applicationLink('https://employer.example/jobs'),'https://employer.example/jobs');
  for(const link of ['javascript:alert(1)','http://employer.example/jobs','https://user:secret@employer.example/jobs'])assert.throws(()=>applicationLink(link));
});
