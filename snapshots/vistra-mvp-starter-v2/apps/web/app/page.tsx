"use client";
import {useEffect,useState} from "react";

const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:8000/api/v1";
type Cat={id:string;name:string;slug:string;icon:string;description:string};

export default function Home(){
 const [cats,setCats]=useState<Cat[]>([]);
 const [menu,setMenu]=useState(false);
 useEffect(()=>{fetch(`${API}/categories`).then(r=>r.json()).then(setCats).catch(()=>setCats([
  {id:"1",name:"Jobs & Careers",slug:"jobs-careers",icon:"💼",description:"Jobs and career support"},
  {id:"2",name:"Real Estate",slug:"real-estate",icon:"🏠",description:"Property assistance"},
  {id:"3",name:"Civil & Construction",slug:"civil-construction",icon:"🏗️",description:"Construction and civil works"},
  {id:"4",name:"Digital Marketing",slug:"digital-marketing",icon:"📣",description:"Digital growth"},
  {id:"5",name:"Tax & Compliance",slug:"tax-compliance",icon:"🧾",description:"Tax and compliance"},
  {id:"6",name:"IT & Technology",slug:"it-technology",icon:"💻",description:"Technology services"},
  {id:"7",name:"Business Services",slug:"business-services",icon:"🏢",description:"Business support"},
  {id:"8",name:"Local & Professional Services",slug:"local-professional-services",icon:"🛠️",description:"Professional services"}
 ]))},[]);
 return <main className="container">
  <header className="top"><button className="menu" onClick={()=>setMenu(!menu)}>☰</button><div className="logo">VISTRA</div><span>🔔</span></header>
  {menu&&<nav className="menuPanel">
    <button>👤 Profile</button><button>📋 My Applications</button><button>🎁 Refer & Earn</button><button>ℹ️ About Us</button><button>📞 Call Vistra</button><button>⚙️ Settings</button>
  </nav>}
  <section className="hero"><h1>What do you need help with?</h1><p className="muted">Tell Vistra what you need. We help you get it done.</p><input className="search" placeholder="Search services..." /></section>
  <h2>Services</h2><section className="grid">{cats.map(c=><article className="card" key={c.slug}><div className="icon">{c.icon}</div><h3>{c.name}</h3><p className="muted">{c.description}</p><span className="pill">Get started →</span></article>)}</section>
  <section className="hero"><h2>How Vistra works</h2><p>1. Choose a service → 2. Submit requirements → 3. Confirm & pay → 4. Vistra starts working → 5. Track your application.</p></section>
 </main>
}
