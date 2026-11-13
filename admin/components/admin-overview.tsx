import Link from 'next/link';
import {adminSummary,adminTaskGroups,type AdminOverview as Overview} from '../../shared/admin-dashboard';

export function AdminOverview({data}:{data:Overview}) {
  return <div className="admin-dashboard">
    <section className="admin-panel admin-priority" aria-labelledby="admin-priority-title">
      <div><h2 id="admin-priority-title">{data.new_requests} new enquiries</h2><p>Review customer requirements and assign the next step.</p></div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <Link href="/admin/requests" className="button">Review enquiries</Link>
        <Link href="/admin/edit-vistrah" className="button secondary">Edit Vistrah</Link>
      </div>
    </section>
    {adminTaskGroups.map(group=>{
      const cards=<div className="admin-dashboard-tasks">{group.items.map(item=><Link href={'/admin/'+item.slug} key={item.slug}><strong>{item.label}</strong><span>{item.description}</span></Link>)}</div>;
      return group.collapsed?<details className="admin-dashboard-group" key={group.title}><summary>{group.title}</summary>{cards}</details>:<section key={group.title} aria-label={group.title}><h2>{group.title}</h2>{cards}</section>;
    })}
    <details className="admin-dashboard-group"><summary>Platform summary</summary><div className="stat-grid">{adminSummary.map(item=><div className="stat-card" key={item.key}><span>{item.label}</span><strong>{data[item.key]}</strong></div>)}</div><p>Stored record counts. These do not confirm service availability. Payments remain sandbox only.</p></details>
  </div>;
}
