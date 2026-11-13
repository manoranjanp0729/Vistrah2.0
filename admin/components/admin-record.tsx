'use client';
import type {ReactNode} from 'react';

// Details keep long forms and operational history out of queue summaries.
export function AdminRecord({title,meta,children}:{title:ReactNode;meta?:ReactNode;children:ReactNode}){
  return <details className="admin-record" onToggle={event=>{if(!event.currentTarget.open)event.currentTarget.querySelectorAll('video').forEach(video=>video.pause());}}><summary><span className="admin-record-heading"><strong>{title}</strong>{meta&&<span className="admin-record-meta">{meta}</span>}</span><span className="admin-record-hint" aria-hidden="true">Details</span></summary><div className="admin-record-body">{children}</div></details>;
}
