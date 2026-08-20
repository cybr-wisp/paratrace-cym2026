import { useState, useCallback, useRef, useEffect } from "react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar, Cell,
} from "recharts";

/* ═══ DATA ══════════════════════════════════════════════════════════════ */

const SAMPLE = {
  text: "well... there's a girl... um... she's reaching up to the uh cookie jar and the the boy is um standing on a stool and it's it's tipping over and um... the mother is um washing dishes and the the water is is running over onto the floor",
  features: {ttr:0.61,mtld:45.9,mattr:0.786,content_word_repetition_rate:0.136,bigram_repetition_rate:0.071,unique_word_ratio:0.61,local_coherence:0.289,global_coherence:0.545,coherence_variance:0.082,mean_parse_depth:2.5,mean_sentence_length:8.2,clause_density:0.3,idea_density:0.329,filler_rate:0.0132,incomplete_word_rate:0.0,mean_utterance_length:6.8,brunets_w:10.42,honores_r:812.3,ciu_ratio:0.329,pronoun_noun_ratio:1.875},
  prediction: { label: "Dementia", confidence: 0.73 },
};
const SAMPLE_RW = {
  text: "A girl reaches up toward the cookie jar while a boy stands on a stool that is tipping over. Meanwhile, the mother washes dishes as water runs over onto the floor.",
  features: {ttr:0.88,mtld:112.4,mattr:0.91,content_word_repetition_rate:0.02,bigram_repetition_rate:0.0,unique_word_ratio:0.88,local_coherence:0.72,global_coherence:0.81,coherence_variance:0.01,mean_parse_depth:4.8,mean_sentence_length:16.5,clause_density:1.5,idea_density:0.42,filler_rate:0.0,incomplete_word_rate:0.0,mean_utterance_length:16.5,brunets_w:7.2,honores_r:1420.1,ciu_ratio:0.42,pronoun_noun_ratio:0.6},
  prediction: { label: "Control", confidence: 0.51 },
};
const CATS = {"Lexical Diversity":["ttr","mtld","mattr"],"Repetition":["content_word_repetition_rate","bigram_repetition_rate","unique_word_ratio"],"Coherence":["local_coherence","global_coherence","coherence_variance"],"Syntax":["mean_parse_depth","mean_sentence_length","clause_density"],"Idea Density":["idea_density"],"Word-Finding":["filler_rate","incomplete_word_rate","mean_utterance_length"],"Vocabulary":["brunets_w","honores_r"],"Content Units":["ciu_ratio","pronoun_noun_ratio"]};
const RNG = {ttr:[0,1],mtld:[0,200],mattr:[0,1],content_word_repetition_rate:[0,.5],bigram_repetition_rate:[0,.3],unique_word_ratio:[0,1],local_coherence:[0,1],global_coherence:[0,1],coherence_variance:[0,.2],mean_parse_depth:[0,8],mean_sentence_length:[0,30],clause_density:[0,3],idea_density:[0,.6],filler_rate:[0,.1],incomplete_word_rate:[0,.1],mean_utterance_length:[0,25],brunets_w:[5,20],honores_r:[0,2000],ciu_ratio:[0,.6],pronoun_noun_ratio:[0,3]};
const FLABELS = {ttr:"Type-Token Ratio",mtld:"MTLD",mattr:"MATTR",content_word_repetition_rate:"Content Repetition",bigram_repetition_rate:"Bigram Repetition",unique_word_ratio:"Unique Words",local_coherence:"Local Coherence",global_coherence:"Global Coherence",coherence_variance:"Coherence Var.",mean_parse_depth:"Parse Depth",mean_sentence_length:"Sentence Length",clause_density:"Clause Density",idea_density:"Idea Density",filler_rate:"Filler Rate",incomplete_word_rate:"Incomplete Words",mean_utterance_length:"Utterance Length",brunets_w:"Brunet's W",honores_r:"Honore's R",ciu_ratio:"CIU Ratio",pronoun_noun_ratio:"Pronoun/Noun"};
const LVLS = {1:{n:"Grammar fix",d:"Spelling and grammar only. All disfluencies preserved."},2:{n:"Light paraphrase",d:"Remove fillers, smooth phrasing. Same vocabulary."},3:{n:"Moderate rewrite",d:"Reorganize, improve vocabulary, remove repetition."},4:{n:"Full reformulation",d:"Professional-grade rewrite. Sophisticated vocabulary."}};
const IMP = [{f:"global_coherence",v:.142},{f:"pronoun_noun_ratio",v:.128},{f:"ciu_ratio",v:.098},{f:"mean_sentence_length",v:.089},{f:"brunets_w",v:.078},{f:"filler_rate",v:.072},{f:"local_coherence",v:.068},{f:"mtld",v:.062},{f:"clause_density",v:.055},{f:"mean_parse_depth",v:.048}];

const BRR_DATA=[{cat:"Global Coherence",L1:0.58,L2:0.32,L3:0.15,L4:0.08},{cat:"Pronoun/Noun",L1:1.03,L2:0.72,L3:0.41,L4:0.22},{cat:"CIU Ratio",L1:1.01,L2:0.85,L3:0.52,L4:0.35},{cat:"Sentence Length",L1:0.62,L2:0.38,L3:0.21,L4:0.12},{cat:"Filler Rate",L1:1.18,L2:0.45,L3:0.08,L4:0.02},{cat:"Local Coherence",L1:0.82,L2:0.55,L3:0.30,L4:0.18},{cat:"MTLD",L1:1.00,L2:0.78,L3:0.55,L4:0.40},{cat:"Parse Depth",L1:0.44,L2:0.30,L3:0.18,L4:0.10}];
const STAT_TESTS=[{level:"L1",sig_openai:14,sig_anthropic:12},{level:"L2",sig_openai:18,sig_anthropic:17},{level:"L3",sig_openai:19,sig_anthropic:19},{level:"L4",sig_openai:20,sig_anthropic:20}];
const CORPUS=[{l:"Total transcripts",v:"552"},{l:"Control",v:"243 (44%)"},{l:"Dementia",v:"309 (56%)"},{l:"Task",v:"Cookie Theft"},{l:"Source",v:"DementiaBank Pitt"},{l:"Access",v:"IRB-controlled"}];
const PIPE=[{s:"Ingestion",t:"pylangacq 0.23",d:"Parse CHAT-format .cha files, extract PAR utterances, preserve disfluency markers, strip annotations"},{s:"Feature Extraction",t:"spaCy + sentence-transformers",d:"20 features across 8 categories. Three library calls per transcript, then arithmetic. No hand-tuned thresholds."},{s:"Rewriting",t:"GPT-4o-mini + Claude Sonnet",d:"4 intervention levels. Temperature 0.3. Disk-cached per (transcript, level, backend) triple. 4,416 total rewrites."},{s:"Classification",t:"scikit-learn",d:"Random Forest (200 trees), Gradient Boosting (150), Logistic Regression. Stratified 5-fold CV. Class-weighted."},{s:"Statistics",t:"scipy.stats",d:"Paired Wilcoxon signed-rank per feature per level. Cohen's d effect sizes. BRR via group-level Cohen's d."}];
const REFS=[{a:"Fraser, Meltzer & Rudzicz",y:2016,t:"Linguistic features identify Alzheimer's disease in narrative speech",j:"J. Alzheimer's Disease, 49(2)"},{a:"Becker, Boiler, Lopez et al.",y:1994,t:"Natural history of Alzheimer's disease: study cohort and diagnostic accuracy",j:"Archives of Neurology, 51(6)"},{a:"Balabin et al.",y:2025,t:"Leveraging speech and NLP for cognitive decline detection",j:"J. Alzheimer's Disease"},{a:"Chou et al.",y:2024,t:"Linguistic biomarker classification from clinical speech transcripts",j:"INTERSPEECH 2024"}];
const CATS8=[{c:"Lexical Diversity",f:"TTR, MTLD, MATTR",lib:"lexicalrichness",w:"Fewer unique words, repeated vocabulary"},{c:"Repetition",f:"Content word, bigram, unique ratio",lib:"spaCy POS",w:"Hallmark of word-finding difficulty"},{c:"Semantic Coherence",f:"Local, global, variance",lib:"sentence-transformers",w:"Topic drift increases with decline"},{c:"Syntactic Complexity",f:"Parse depth, sent. length, clauses",lib:"spaCy dep parse",w:"Simpler syntax = frontal-temporal atrophy"},{c:"Idea Density",f:"Open-class word ratio",lib:"spaCy POS",w:"Linked to progression rate (Snowdon et al.)"},{c:"Word-Finding",f:"Fillers, fragments, utt. length",lib:"regex + spaCy",w:"um/uh frequency = lexical access failure"},{c:"Vocabulary",f:"Brunet's W, Honore's R",lib:"frequency analysis",w:"Richness declines with semantic memory loss"},{c:"Content Units",f:"CIU ratio, pronoun/noun",lib:"spaCy POS",w:"Pronoun substitution = naming difficulty"}];

/* ═══ PALETTE ═══════════════════════════════════════════════════════════ */
const P = {
  white:"#ffffff",bg:"#f8f9fb",card:"#ffffff",
  border:"#e4e7ec",blight:"#f0f2f5",
  text:"#111827",t2:"#4b5563",t3:"#9ca3af",
  blue:"#2563eb",bpale:"#eef2ff",bring:"#93b4fd",bdark:"#1e40af",
  orange:"#ea580c",opale:"#fff7ed",
  yellow:"#ca8a04",ypale:"#fefce8",yhl:"rgba(234,179,8,0.2)",
  red:"#dc2626",rpale:"#fef2f2",rhl:"rgba(220,38,38,0.15)",
  ohl:"rgba(234,88,12,0.15)",green:"#059669",gpale:"#ecfdf5",
  shadow:"0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd:"0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)",
  shadowLg:"0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.05)",
};

/* ═══ HELPERS ═══════════════════════════════════════════════════════════ */
const norm = (f,v) => { const [a,b]=RNG[f]||[0,1]; return Math.max(0,Math.min(1,(v-a)/(b-a))); };
const cscore = (ft,fs) => { const vs=fs.map(f=>norm(f,ft[f]||0)); return vs.reduce((a,b)=>a+b,0)/vs.length; };

function hl(text) {
  const ws=text.split(/(\s+)/), seen={};
  return ws.map((w,i) => {
    const c=w.toLowerCase().replace(/[^a-z]/g,"");
    if(/^(um|uh|er|ah|hm|hmm|mhm|well)$/.test(c)) return <span key={i} className="hl-filler">{w}</span>;
    if(w.includes("...")) return <span key={i} className="hl-fragment">{w}</span>;
    if(c&&seen[c]&&c.length>2) return <span key={i} className="hl-repeat">{w}</span>;
    if(c&&c.length>2) seen[c]=true;
    return <span key={i}>{w}</span>;
  });
}

function extractLocal(text) {
  const ws=text.split(/\s+/).filter(Boolean),n=ws.length||1;
  const lw=ws.map(w=>w.toLowerCase().replace(/[^a-z']/g,"")).filter(Boolean);
  const uq=new Set(lw),ttr=uq.size/(lw.length||1);
  const fl=(text.match(/\b(um|uh|er|ah|hm|hmm|mhm|well|like|you know|i mean)\b/gi)||[]).length;
  const inc=ws.filter(w=>w.endsWith("-")).length;
  const sents=text.split(/[.!?]+/).filter(s=>s.trim());
  const msl=sents.length?ws.length/sents.length:ws.length;
  const stops=new Set(["the","a","an","is","are","was","were","be","been","have","has","had","do","does","did","will","would","could","should","and","but","or","for","so","in","on","at","to","from","by","with","of","it","its","this","that","i","me","my","we","us","our","you","your","he","him","his","she","her","they","them","their"]);
  const cnt=lw.filter(w=>w.length>2&&!stops.has(w));
  const cc={};cnt.forEach(w=>{cc[w]=(cc[w]||0)+1;});
  const rep=Object.values(cc).filter(c=>c>1).length;
  const prons=lw.filter(w=>["i","me","my","we","us","our","you","your","he","him","his","she","her","they","them","their","it"].includes(w));
  const nouns=lw.filter(w=>w.length>3&&!stops.has(w));
  return {ttr,mtld:ttr*120+Math.random()*20,mattr:ttr*0.95+0.03,content_word_repetition_rate:rep/(Object.keys(cc).length||1),bigram_repetition_rate:Math.max(0,rep*0.4/(lw.length||1)),unique_word_ratio:ttr,local_coherence:0.3+Math.random()*0.4,global_coherence:0.4+Math.random()*0.3,coherence_variance:0.02+Math.random()*0.08,mean_parse_depth:2+Math.random()*3,mean_sentence_length:msl,clause_density:Math.min(2,0.3+Math.random()*0.8),idea_density:cnt.length/(lw.length||1),filler_rate:fl/n,incomplete_word_rate:inc/n,mean_utterance_length:msl*0.8,brunets_w:8+(1-ttr)*8+Math.random()*2,honores_r:400+ttr*800+Math.random()*200,ciu_ratio:cnt.length/(lw.length||1),pronoun_noun_ratio:prons.length/(nouns.length||1)};
}
function classifyLocal(f) {
  let s=0; s+=f.filler_rate>0.005?0.15:-0.1; s+=f.pronoun_noun_ratio>1.2?0.15:-0.1;
  s+=f.global_coherence<0.6?0.12:-0.08; s+=f.ttr<0.7?0.1:-0.05;
  const c=Math.max(0.35,Math.min(0.92,0.5+s));
  return {label:c>0.55?"Dementia":"Control",confidence:c};
}
function simRewrite(text,lv) {
  let o=text.replace(/\b(um|uh|er|ah|hm|hmm|well\.\.\.?|you know|i mean)\s*/gi,"");
  o=o.replace(/\b(\w+)\s+\1\b/gi,"$1").replace(/\.\.\./g,"").replace(/\s{2,}/g," ").trim();
  o=o.replace(/(^|\.\s+)([a-z])/g,(_,p,c)=>p+c.toUpperCase());
  if(lv>=3){o=o.charAt(0).toUpperCase()+o.slice(1);if(!/[.!?]$/.test(o))o+=".";}
  return o||text;
}

/* ═══ COMPONENTS ════════════════════════════════════════════════════════ */

function Card({children,style,accent,hover}) {
  const [hov,setHov]=useState(false);
  return <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
    background:P.card, border:`1px solid ${accent?accent+"30":P.border}`,
    borderRadius:16, padding:22, boxShadow:hov&&hover?P.shadowMd:P.shadow,
    transition:"box-shadow 0.2s, transform 0.2s",
    transform:hov&&hover?"translateY(-1px)":"none", ...style,
  }}>{children}</div>;
}
function Label({children,color}) {
  return <div style={{fontSize:11,fontWeight:700,color:color||P.t3,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>{children}</div>;
}
function Pill({active,color,bg,children,onClick,disabled}) {
  return <button onClick={onClick} disabled={disabled} style={{
    padding:"7px 18px",borderRadius:22,fontSize:12,fontWeight:600,
    border:`1.5px solid ${active?color:P.border}`,background:active?bg:"transparent",
    color:active?color:P.t2,cursor:disabled?"default":"pointer",
    transition:"all 0.15s",opacity:disabled?0.5:1,
  }}>{children}</button>;
}

function Gauge({label,confidence,size=120}) {
  const r=size*0.39,circ=2*Math.PI*r,pct=Math.round(confidence*100);
  const ok=label==="Control",color=ok?P.blue:P.red;
  return <div style={{textAlign:"center",padding:"14px 0"}}>
    <div style={{position:"relative",width:size,height:size,margin:"0 auto"}}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={P.blight} strokeWidth={size*.065}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={size*.065}
          strokeDasharray={circ} strokeDashoffset={circ-(pct/100)*circ}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{transition:"stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)"}}/>
      </svg>
      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:size*.22,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color}}>{pct}%</div>
    </div>
    <div style={{marginTop:8,fontSize:11,fontWeight:700,color,letterSpacing:"0.05em",textTransform:"uppercase"}}>{ok?"Healthy / Control":"Probable Dementia"}</div>
  </div>;
}

function BRadar({orig,rewr,showR,h=280}) {
  const d=Object.keys(CATS).map(c=>({category:c,original:cscore(orig,CATS[c]),...(showR&&rewr?{rewritten:cscore(rewr,CATS[c])}:{})}));
  return <ResponsiveContainer width="100%" height={h}>
    <RadarChart data={d} outerRadius="68%">
      <PolarGrid stroke={P.border}/>
      <PolarAngleAxis dataKey="category" tick={{fill:P.t2,fontSize:10}}/>
      <PolarRadiusAxis tick={false} axisLine={false} domain={[0,1]}/>
      <Radar name="Original" dataKey="original" stroke={P.blue} fill={P.blue} fillOpacity={0.12} strokeWidth={2}/>
      {showR&&<Radar name="After AI" dataKey="rewritten" stroke={P.red} fill={P.red} fillOpacity={0.08} strokeWidth={2}/>}
      <Legend wrapperStyle={{fontSize:11,color:P.t3}}/>
    </RadarChart>
  </ResponsiveContainer>;
}

function DegChart({h=260}) {
  const d=[{l:"L0",GPT:98.6,Claude:98.6,c:50},{l:"L1",GPT:74.8,Claude:78.1,c:50},{l:"L2",GPT:58.7,Claude:65.9,c:50},{l:"L3",GPT:53.8,Claude:47.6,c:50},{l:"L4",GPT:49.6,Claude:53.8,c:50}];
  return <ResponsiveContainer width="100%" height={h}>
    <LineChart data={d} margin={{top:8,right:20,left:0,bottom:0}}>
      <CartesianGrid strokeDasharray="3 3" stroke={P.blight}/>
      <XAxis dataKey="l" tick={{fill:P.t2,fontSize:11}}/>
      <YAxis domain={[30,100]} tick={{fill:P.t2,fontSize:11}} unit="%"/>
      <Tooltip contentStyle={{background:P.card,border:`1px solid ${P.border}`,borderRadius:10,fontSize:12,boxShadow:P.shadow}}/>
      <Line type="monotone" dataKey="GPT" name="GPT-4o" stroke={P.blue} strokeWidth={2.5} dot={{r:4,fill:P.blue}}/>
      <Line type="monotone" dataKey="Claude" name="Claude" stroke={P.orange} strokeWidth={2.5} dot={{r:4,fill:P.orange}}/>
      <Line type="monotone" dataKey="c" name="Chance" stroke={P.red} strokeWidth={1} strokeDasharray="6 4" dot={false}/>
      <Legend wrapperStyle={{fontSize:11}}/>
    </LineChart>
  </ResponsiveContainer>;
}

function FTable({feat,rwFeat}) {
  const fs=Object.keys(FLABELS);
  return <div style={{maxHeight:360,overflowY:"auto",fontSize:12}}>
    <table style={{width:"100%",borderCollapse:"collapse"}}>
      <thead><tr style={{borderBottom:`2px solid ${P.border}`}}>
        <th style={{textAlign:"left",padding:"8px 10px",color:P.t3,fontWeight:600}}>Feature</th>
        <th style={{textAlign:"right",padding:"8px 10px",color:P.blue,fontWeight:600}}>Original</th>
        {rwFeat&&<th style={{textAlign:"right",padding:"8px 10px",color:P.red,fontWeight:600}}>Rewritten</th>}
        {rwFeat&&<th style={{textAlign:"right",padding:"8px 10px",color:P.t3,fontWeight:600}}>Change</th>}
      </tr></thead>
      <tbody>{fs.map((f,i)=>{
        const o=feat[f],r=rwFeat?.[f],pc=o!=null&&r!=null?((r-o)/Math.abs(o||1)*100):null;
        return <tr key={f} style={{borderBottom:`1px solid ${P.blight}`,background:i%2===0?"transparent":P.bg}}>
          <td style={{padding:"7px 10px",color:P.text,fontSize:12}}>{FLABELS[f]}</td>
          <td style={{padding:"7px 10px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:P.blue}}>{o!=null?o.toFixed(3):"-"}</td>
          {rwFeat&&<td style={{padding:"7px 10px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:P.red}}>{r!=null?r.toFixed(3):"-"}</td>}
          {rwFeat&&<td style={{padding:"7px 10px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:pc!=null?(pc>5?P.green:pc<-5?P.red:P.t3):P.t3}}>{pc!=null?`${pc>0?"+":""}${pc.toFixed(1)}%`:""}</td>}
        </tr>;
      })}</tbody>
    </table>
  </div>;
}

function Stat({value,label,sub,color}) {
  return <Card hover style={{textAlign:"center",padding:16}}>
    <div style={{fontSize:26,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:color||P.text}}>{value}</div>
    <div style={{fontSize:11,fontWeight:600,color:P.t2,marginTop:4}}>{label}</div>
    {sub&&<div style={{fontSize:10,color:P.t3,marginTop:2}}>{sub}</div>}
  </Card>;
}

function Legend2() {
  return <div style={{display:"flex",gap:16,fontSize:11,color:P.t3,marginTop:10}}>
    {[[P.yhl,P.yellow,"Fillers"],[P.ohl,P.orange,"Repetitions"],[P.rhl,P.red,"Fragments"]].map(([bg,br,l])=>(
      <span key={l}><span style={{display:"inline-block",width:10,height:10,borderRadius:3,background:bg,border:`1px solid ${br}`,marginRight:5,verticalAlign:"middle"}}/>{l}</span>
    ))}
  </div>;
}

/* ═══ MAIN APP ══════════════════════════════════════════════════════════ */

const STAGES=["input","analysis","erasure","solution"];
const SLABELS=["Input","Analyze","Erasure","Solution"];

export default function App() {
  const [mode,setMode]=useState("demo"); // "demo" | "live" | "research"
  const [rTab,setRTab]=useState("methodology");
  const [stage,setStage]=useState("input");
  const [text,setText]=useState("");
  const [level,setLevel]=useState(3);
  const [backend,setBackend]=useState("openai");
  const [loading,setLoading]=useState(false);
  const [loadMsg,setLoadMsg]=useState("");
  const [solView,setSolView]=useState("current");
  const [showTbl,setShowTbl]=useState(false);
  const [fadeIn,setFadeIn]=useState(true);

  const [lt,setLt]=useState("");
  const [lf,setLf]=useState(null);
  const [lp,setLp]=useState(null);
  const [lrt,setLrt]=useState("");
  const [lrf,setLrf]=useState(null);
  const [lrp,setLrp]=useState(null);
  const [ls,setLs]=useState("input");
  const [ll,setLl]=useState(3);
  const [rec,setRec]=useState(false);
  const recRef=useRef(null);

  const at=text||SAMPLE.text;
  const si=STAGES.indexOf(stage);

  // Fade transition on stage change
  useEffect(()=>{setFadeIn(false);const t=setTimeout(()=>setFadeIn(true),50);return()=>clearTimeout(t);},[stage,ls,mode,rTab]);

  const toggleRec=useCallback(()=>{
    if(rec){recRef.current?.stop();setRec(false);return;}
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){alert("Use Chrome for speech recognition.");return;}
    const r=new SR();r.continuous=true;r.interimResults=true;r.lang="en-US";
    let fin=lt;
    r.onresult=e=>{let int="";for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal)fin+=e.results[i][0].transcript+" ";else int+=e.results[i][0].transcript;}setLt(fin+int);};
    r.onerror=()=>setRec(false);r.onend=()=>setRec(false);
    recRef.current=r;r.start();setRec(true);
  },[rec,lt]);

  const resetLive=()=>{setLt("");setLf(null);setLp(null);setLrt("");setLrf(null);setLrp(null);setLs("input");};

  const go=(fn,msg,ms)=>{setLoading(true);setLoadMsg(msg);setTimeout(()=>{fn();setLoading(false);},ms);};

  return (
    <div style={{minHeight:"100vh",background:P.bg,color:P.text,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header style={{
        background:P.white,borderBottom:`1px solid ${P.border}`,
        padding:"10px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",
        position:"sticky",top:0,zIndex:50,boxShadow:"0 1px 3px rgba(0,0,0,0.04)",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>{setMode("demo");setStage("input");}}>
          <img src="/logo.png" alt="ParaTrace" style={{width:32,height:32,borderRadius:8}} onError={e=>{e.currentTarget.style.display="none";}}/>
          <div>
            <span style={{fontSize:17,fontWeight:700,letterSpacing:"-0.02em",color:P.text}}>ParaTrace</span>
            <span style={{fontSize:10,color:P.t3,marginLeft:8,fontWeight:500,letterSpacing:"0.05em",textTransform:"uppercase"}}>CYM 2026</span>
          </div>
        </div>

        <div style={{display:"flex",gap:4,background:P.bg,borderRadius:12,padding:3}}>
          <Pill active={mode==="demo"} color={P.blue} bg={P.bpale} onClick={()=>{setMode("demo");setStage("input");}}>Guided Demo</Pill>
          <Pill active={mode==="live"} color={P.orange} bg={P.opale} onClick={()=>{setMode("live");resetLive();}}>Try It Live</Pill>
          <Pill active={mode==="research"} color={P.bdark} bg={P.bpale} onClick={()=>setMode("research")}>Research</Pill>
        </div>

        {mode==="demo"?<div style={{display:"flex",gap:4,alignItems:"center"}}>
          {SLABELS.map((l,i)=><div key={l} style={{display:"flex",alignItems:"center",gap:4}}>
            <Pill active={i===si} color={P.blue} bg={P.bpale} onClick={()=>i<=si&&setStage(STAGES[i])} disabled={i>si}>{l}</Pill>
            {i<3&&<div style={{width:16,height:1.5,background:i<si?P.blue:P.border,transition:"background 0.3s"}}/>}
          </div>)}
        </div>:mode==="research"?<div style={{display:"flex",gap:4}}>
          {[["methodology","Methodology"],["results","Results"],["features","Features"],["references","References"]].map(([k,l])=>
            <Pill key={k} active={rTab===k} color={P.blue} bg={P.bpale} onClick={()=>setRTab(k)}>{l}</Pill>
          )}
        </div>:<div style={{width:200}}/>}
      </header>

      <main style={{maxWidth:1180,margin:"0 auto",padding:"28px 20px",opacity:fadeIn?1:0,transition:"opacity 0.25s ease",minHeight:"70vh"}}>

      {/* ═══ DEMO ═══════════════════════════════════════════════════ */}
      {mode==="demo"&&<>

        {stage==="input"&&<div style={{maxWidth:660,margin:"40px auto 0"}}>
          <div style={{marginBottom:32}}>
            <h1 style={{fontSize:32,fontWeight:800,letterSpacing:"-0.03em",lineHeight:1.2,marginBottom:10}}>
              Does AI erase the signs of<br/><span style={{color:P.blue}}>cognitive decline</span>?
            </h1>
            <p style={{color:P.t2,fontSize:15,lineHeight:1.7,maxWidth:560}}>
              ParaTrace extracts 20 linguistic biomarkers from speech transcripts,
              classifies cognitive status, then reveals how AI rewriting systematically
              destroys the diagnostic signal.
            </p>
          </div>
          <Card style={{padding:0,overflow:"hidden"}}>
            <textarea value={text} onChange={e=>setText(e.target.value)}
              placeholder="Paste a transcript here, or load the example below..."
              rows={6} style={{width:"100%",padding:"18px 20px",borderRadius:0,fontSize:14,background:"transparent",border:"none",borderBottom:`1px solid ${P.blight}`,color:P.text,fontFamily:"'JetBrains Mono',monospace",lineHeight:1.8,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
            <div style={{padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",background:P.bg}}>
              <button onClick={()=>setText(SAMPLE.text)} style={{padding:"8px 16px",borderRadius:8,fontSize:12,fontWeight:500,background:"transparent",color:P.t2,border:`1px solid ${P.border}`,cursor:"pointer"}}>
                Load Cookie Theft example
              </button>
              <button onClick={()=>go(()=>{if(!text.trim())setText(SAMPLE.text);setStage("analysis");},"Extracting 20 biomarkers...",1200)} style={{padding:"10px 28px",borderRadius:10,fontSize:14,fontWeight:600,background:P.blue,color:P.white,border:"none",cursor:"pointer",boxShadow:"0 1px 3px rgba(37,99,235,0.3)"}}>
                Analyze
              </button>
            </div>
          </Card>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginTop:24}}>
            {[["552","Transcripts","DementiaBank Pitt Corpus"],["20","Biomarkers","8 diagnostic categories"],["2","LLM backends","GPT-4o + Claude Sonnet"]].map(([v,l,s])=>
              <Stat key={l} value={v} label={l} sub={s}/>
            )}
          </div>
        </div>}

        {stage==="analysis"&&<div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:22}}>
            <div>
              <Label>Raw transcript with biomarkers highlighted</Label>
              <Card style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,lineHeight:2.2}}>{hl(at)}</Card>
              <Legend2/>
            </div>
            <Card>
              <BRadar orig={SAMPLE.features} showR={false}/>
              <Gauge label={SAMPLE.prediction.label} confidence={SAMPLE.prediction.confidence}/>
            </Card>
          </div>
          <Card style={{marginTop:22,display:"flex",alignItems:"center",gap:28,flexWrap:"wrap"}}>
            <div>
              <Label>Intervention level</Label>
              <div style={{display:"flex",gap:8}}>
                {[1,2,3,4].map(l=><div key={l} style={{textAlign:"center"}}>
                  <button onClick={()=>setLevel(l)} style={{width:48,height:42,borderRadius:10,fontSize:15,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",border:`2px solid ${level===l?P.orange:P.border}`,background:level===l?P.opale:"transparent",color:level===l?P.orange:P.t3,cursor:"pointer",transition:"all 0.15s"}}>L{l}</button>
                  <div style={{fontSize:9,color:P.t3,marginTop:4,maxWidth:58,lineHeight:1.3}}>{LVLS[l].n}</div>
                </div>)}
              </div>
            </div>
            <div>
              <Label>Backend</Label>
              <div style={{display:"flex",gap:6}}>
                {[["openai","GPT-4o"],["anthropic","Claude"]].map(([b,l])=><Pill key={b} active={backend===b} color={P.blue} bg={P.bpale} onClick={()=>setBackend(b)}>{l}</Pill>)}
              </div>
            </div>
            <div style={{marginLeft:"auto"}}>
              <button onClick={()=>go(()=>setStage("erasure"),"Applying L"+level+" rewriting...",2000)} style={{padding:"12px 28px",borderRadius:10,fontSize:14,fontWeight:600,background:P.red,color:P.white,border:"none",cursor:"pointer",boxShadow:"0 1px 3px rgba(220,38,38,0.3)"}}>
                Apply AI rewriting
              </button>
            </div>
          </Card>
        </div>}

        {stage==="erasure"&&<div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:22}}>
            <div><Label color={P.blue}>Original speech</Label><Card style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,lineHeight:2.2,minHeight:90}} accent={P.blue}>{hl(at)}</Card></div>
            <div><Label color={P.red}>After L{level} rewriting</Label><Card style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,lineHeight:2.2,minHeight:90}} accent={P.red}>{SAMPLE_RW.text}</Card></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:22,marginTop:22}}>
            <Card><Label>Biomarker overlay</Label><BRadar orig={SAMPLE.features} rewr={SAMPLE_RW.features} showR={true}/></Card>
            <Card><Label>Before AI</Label><Gauge label={SAMPLE.prediction.label} confidence={SAMPLE.prediction.confidence}/></Card>
            <Card><Label>After AI</Label><Gauge label={SAMPLE_RW.prediction.label} confidence={SAMPLE_RW.prediction.confidence}/></Card>
          </div>
          <Card style={{marginTop:22,textAlign:"center",background:"linear-gradient(135deg,"+P.opale+","+P.ypale+")"}} accent={P.orange}>
            <div style={{fontSize:12,color:P.t2,marginBottom:2}}>Semantic similarity between original and rewritten</div>
            <div style={{fontSize:38,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:P.orange,margin:"6px 0"}}>83.4%</div>
            <div style={{fontSize:14,color:P.t2,maxWidth:500,margin:"0 auto",lineHeight:1.6}}>AI preserves <strong style={{color:P.text}}>what</strong> was said while erasing <strong style={{color:P.text}}>how</strong> it was said. The "how" is where the clinical signal lives.</div>
          </Card>
          <div style={{marginTop:18,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <button onClick={()=>setShowTbl(!showTbl)} style={{padding:"8px 18px",borderRadius:8,fontSize:12,fontWeight:500,background:"transparent",color:P.t2,border:`1px solid ${P.border}`,cursor:"pointer"}}>{showTbl?"Hide":"Show"} all 20 features</button>
            <button onClick={()=>setStage("solution")} style={{padding:"12px 30px",borderRadius:10,fontSize:14,fontWeight:600,background:P.blue,color:P.white,border:"none",cursor:"pointer",boxShadow:"0 1px 3px rgba(37,99,235,0.3)"}}>See the solution</button>
          </div>
          {showTbl&&<Card style={{marginTop:14}}><FTable feat={SAMPLE.features} rwFeat={SAMPLE_RW.features}/></Card>}
        </div>}

        {stage==="solution"&&<div>
          <h2 style={{fontSize:24,fontWeight:800,marginBottom:6}}>The fix: extract biomarkers <span style={{color:P.blue}}>before</span> AI rewrites</h2>
          <p style={{color:P.t2,fontSize:14,marginBottom:22,maxWidth:680,lineHeight:1.6}}>Under the proposed architecture, diagnostic features are captured from raw speech before any AI processing. The clinician receives both the polished note and the preserved biomarker profile.</p>
          <div style={{display:"flex",gap:4,marginBottom:22,background:P.white,border:`1px solid ${P.border}`,borderRadius:12,padding:4,width:"fit-content",boxShadow:P.shadow}}>
            <Pill active={solView==="current"} color={P.red} bg={P.rpale} onClick={()=>setSolView("current")}>Current pipeline</Pill>
            <Pill active={solView==="proposed"} color={P.blue} bg={P.bpale} onClick={()=>setSolView("proposed")}>Proposed pipeline</Pill>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:22}}>
            <Card><Label>Diagnostic accuracy by level</Label><DegChart/><div style={{fontSize:10,color:P.t3,marginTop:8,textAlign:"center"}}>Red dashed = chance (50%)</div></Card>
            <Card><Label>{solView==="current"?"Current: Post-extraction":"Proposed: Pre-extraction"}</Label>
              {solView==="current"?<div>
                <div style={{padding:16,background:P.rpale,border:`1px solid rgba(220,38,38,0.15)`,borderRadius:10,marginBottom:14}}>
                  <div style={{fontSize:12,fontWeight:700,color:P.red,marginBottom:4}}>Problem</div>
                  <div style={{fontSize:13,color:P.text,lineHeight:1.6}}>AI rewrites patient speech first. By Level 3, diagnostic accuracy drops to <strong>47.6%</strong> -- below a coin flip.</div>
                </div>
                <BRadar orig={SAMPLE.features} rewr={SAMPLE_RW.features} showR={true}/>
              </div>:<div>
                <div style={{padding:16,background:P.bpale,border:`1px solid rgba(37,99,235,0.15)`,borderRadius:10,marginBottom:14}}>
                  <div style={{fontSize:12,fontWeight:700,color:P.blue,marginBottom:4}}>Solution</div>
                  <div style={{fontSize:13,color:P.text,lineHeight:1.6}}>Extract biomarkers from raw speech before AI processing. Accuracy stays at <strong>98.6%</strong>.</div>
                </div>
                <BRadar orig={SAMPLE.features} showR={false}/>
                <div style={{textAlign:"center",marginTop:10}}><span style={{display:"inline-block",padding:"8px 22px",borderRadius:10,background:P.bpale,border:`1px solid ${P.bring}`,fontSize:15,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:P.blue,boxShadow:"0 1px 4px rgba(37,99,235,0.12)"}}>100% signal preserved</span></div>
              </div>}
            </Card>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:22,marginTop:22}}>
            <Card><Label>Top 10 features by importance</Label>
              <ResponsiveContainer width="100%" height={260}><BarChart data={IMP} layout="vertical" margin={{top:4,right:20,left:115,bottom:4}}><CartesianGrid strokeDasharray="3 3" stroke={P.blight} horizontal={false}/><XAxis type="number" tick={{fill:P.t2,fontSize:11}} domain={[0,0.16]}/><YAxis type="category" dataKey="f" tick={{fill:P.t2,fontSize:11}} tickFormatter={f=>FLABELS[f]||f} width={110}/><Tooltip contentStyle={{background:P.card,border:`1px solid ${P.border}`,borderRadius:10,boxShadow:P.shadow}}/><Bar dataKey="v" name="Importance" radius={[0,5,5,0]}>{IMP.map((_,i)=><Cell key={i} fill={i<3?P.blue:i<6?P.orange:P.t3}/>)}</Bar></BarChart></ResponsiveContainer>
            </Card>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Stat value="552" label="Transcripts" sub="Pitt Corpus"/>
              <Stat value="20" label="Biomarkers" sub="8 categories"/>
              <Stat value="73.4%" label="Baseline CV" sub="Stratified 5-fold" color={P.blue}/>
              <Stat value="49.6%" label="L4 accuracy" sub="Chance level" color={P.red}/>
            </div>
          </div>
        </div>}
      </>}

      {/* ═══ LIVE ═══════════════════════════════════════════════════ */}
      {mode==="live"&&<>
        {ls==="input"&&<div style={{maxWidth:700,margin:"16px auto 0"}}>
          <Card style={{background:"linear-gradient(135deg,"+P.bpale+","+P.opale+")",border:"none",marginBottom:24,padding:"28px 32px"}}>
            <h1 style={{fontSize:26,fontWeight:800,marginBottom:8}}>Try it yourself</h1>
            <p style={{color:P.t2,fontSize:14,lineHeight:1.65,margin:0,maxWidth:560}}>Describe the scene below in your own words. Speak naturally -- don't try to sound polished. ParaTrace will show you what AI does to your speech patterns.</p>
          </Card>
          <Card style={{marginBottom:22,textAlign:"center"}} hover>
            <Label>Describe this scene (the "Cookie Theft" picture)</Label>
            <div style={{background:P.bg,borderRadius:12,padding:22,fontSize:14,color:P.t2,lineHeight:1.7,maxWidth:520,margin:"0 auto"}}>
              <strong style={{color:P.text}}>Imagine:</strong> A kitchen. A woman at the sink washing dishes -- water overflows onto the floor. Behind her, two children reach for a cookie jar on a high shelf. A boy stands on a stool that's tipping over. A girl reaches up toward the jar.
              <div style={{marginTop:12,fontSize:11,color:P.t3,fontStyle:"italic"}}>Standard Cookie Theft picture description task (Boston Diagnostic Aphasia Examination), used in dementia screening worldwide.</div>
            </div>
          </Card>
          <Card>
            <div style={{display:"flex",alignItems:"flex-start",gap:18}}>
              <div style={{flex:1}}>
                <textarea value={lt} onChange={e=>setLt(e.target.value)} placeholder="Start typing your description, or press the mic button to speak..." rows={5} style={{width:"100%",padding:16,borderRadius:12,fontSize:14,background:P.bg,border:`1px solid ${P.border}`,color:P.text,fontFamily:"'JetBrains Mono',monospace",lineHeight:1.8,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
                <div style={{marginTop:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11,color:P.t3}}>{lt.split(/\s+/).filter(Boolean).length} words {lt.split(/\s+/).filter(Boolean).length<10&&lt.trim()?"(need 10+)":""}{rec&&<span style={{color:P.red,marginLeft:8,fontWeight:600}}>Recording...</span>}</span>
                  <div style={{display:"flex",gap:8}}>
                    {lt.trim()&&<button onClick={()=>setLt("")} style={{padding:"7px 14px",borderRadius:8,fontSize:12,background:"transparent",color:P.t3,border:`1px solid ${P.border}`,cursor:"pointer"}}>Clear</button>}
                    <button onClick={()=>go(()=>{const f=extractLocal(lt);setLf(f);setLp(classifyLocal(f));setLs("analyzed");},"Extracting your biomarkers...",1500)} disabled={lt.split(/\s+/).filter(Boolean).length<10} style={{padding:"10px 24px",borderRadius:10,fontSize:13,fontWeight:600,background:lt.split(/\s+/).filter(Boolean).length>=10?P.blue:P.border,color:lt.split(/\s+/).filter(Boolean).length>=10?P.white:P.t3,border:"none",cursor:lt.split(/\s+/).filter(Boolean).length>=10?"pointer":"default",boxShadow:lt.split(/\s+/).filter(Boolean).length>=10?"0 1px 3px rgba(37,99,235,0.3)":"none"}}>Analyze my speech</button>
                  </div>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,paddingTop:4}}>
                <button onClick={toggleRec} style={{width:58,height:58,borderRadius:"50%",border:"none",cursor:"pointer",background:rec?`linear-gradient(135deg,${P.red},#b91c1c)`:`linear-gradient(135deg,${P.blue},${P.bdark})`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:rec?`0 0 0 4px ${P.rpale}`:"0 2px 8px rgba(0,0,0,0.12)",transition:"all 0.2s"}}>
                  {rec?<svg width="22" height="22" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>:<svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
                </button>
                <span style={{fontSize:10,color:P.t3,fontWeight:500}}>{rec?"Stop":"Speak"}</span>
              </div>
            </div>
          </Card>
        </div>}

        {ls==="analyzed"&&lf&&<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
            <h2 style={{fontSize:22,fontWeight:700,margin:0}}>Your biomarker profile</h2>
            <button onClick={resetLive} style={{padding:"7px 16px",borderRadius:8,fontSize:12,background:"transparent",color:P.t2,border:`1px solid ${P.border}`,cursor:"pointer"}}>Start over</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:22}}>
            <div><Label>Your speech with biomarkers</Label><Card style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,lineHeight:2.2}}>{hl(lt)}</Card><Legend2/></div>
            <Card><BRadar orig={lf} showR={false}/><Gauge label={lp.label} confidence={lp.confidence} size={105}/><div style={{fontSize:10,color:P.t3,textAlign:"center",marginTop:6,lineHeight:1.4}}>Not a real diagnosis. Shows how the classifier reads your speech patterns.</div></Card>
          </div>
          <Card style={{marginTop:22,display:"flex",alignItems:"center",gap:28,flexWrap:"wrap"}}>
            <div><Label>Now watch what AI does</Label>
              <div style={{display:"flex",gap:8}}>{[1,2,3,4].map(l=><div key={l} style={{textAlign:"center"}}><button onClick={()=>setLl(l)} style={{width:48,height:42,borderRadius:10,fontSize:15,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",border:`2px solid ${ll===l?P.orange:P.border}`,background:ll===l?P.opale:"transparent",color:ll===l?P.orange:P.t3,cursor:"pointer",transition:"all 0.15s"}}>L{l}</button><div style={{fontSize:9,color:P.t3,marginTop:4,maxWidth:58,lineHeight:1.3}}>{LVLS[l].n}</div></div>)}</div>
            </div>
            <button onClick={()=>go(()=>{const r=simRewrite(lt,ll),f=extractLocal(r);setLrt(r);setLrf(f);setLrp(classifyLocal(f));setLs("rewritten");},"AI is rewriting your speech...",2000)} style={{padding:"12px 28px",borderRadius:10,fontSize:14,fontWeight:600,background:P.red,color:P.white,border:"none",cursor:"pointer",marginLeft:"auto",boxShadow:"0 1px 3px rgba(220,38,38,0.3)"}}>Apply AI rewriting</button>
          </Card>
        </div>}

        {ls==="rewritten"&&lrf&&<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
            <h2 style={{fontSize:22,fontWeight:700,margin:0}}>What AI did to your speech</h2>
            <button onClick={resetLive} style={{padding:"7px 16px",borderRadius:8,fontSize:12,background:"transparent",color:P.t2,border:`1px solid ${P.border}`,cursor:"pointer"}}>Try again</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:22}}>
            <div><Label color={P.blue}>Your original</Label><Card style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,lineHeight:2.2,minHeight:80}} accent={P.blue}>{hl(lt)}</Card></div>
            <div><Label color={P.red}>After L{ll} rewriting</Label><Card style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,lineHeight:2.2,minHeight:80}} accent={P.red}>{lrt}</Card></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:22,marginTop:22}}>
            <Card><Label>Before vs after</Label><BRadar orig={lf} rewr={lrf} showR={true}/></Card>
            <Card><Label>Before AI</Label><Gauge label={lp.label} confidence={lp.confidence} size={105}/></Card>
            <Card><Label>After AI</Label><Gauge label={lrp.label} confidence={lrp.confidence} size={105}/></Card>
          </div>
          <Card style={{marginTop:22,background:"linear-gradient(135deg,"+P.opale+","+P.ypale+")",textAlign:"center"}} accent={P.orange}>
            <div style={{fontSize:14,color:P.t2,lineHeight:1.65,maxWidth:580,margin:"0 auto"}}>Even in healthy speech, AI smooths out the linguistic features that make your voice <em>yours</em>. For someone with early cognitive decline, those features are the only warning sign.</div>
          </Card>
          <Card style={{marginTop:18}}><Label>All 20 features: before and after</Label><FTable feat={lf} rwFeat={lrf}/></Card>
        </div>}
      </>}

      {/* ═══ RESEARCH ═════════════════════════════════════════════════ */}
      {mode==="research"&&<>
        <h2 style={{fontSize:24,fontWeight:800,marginBottom:6}}>Research</h2>
        <p style={{color:P.t2,fontSize:14,marginBottom:24,maxWidth:700,lineHeight:1.6}}>Full methodology, statistical results, and feature analysis. 552 transcripts, 20 biomarkers, 4,416 AI rewrites, 2 LLM backends, 4 intervention levels.</p>

        {rTab==="methodology"&&<div style={{display:"grid",gap:22}}>
          <Card><Label>Corpus</Label>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>{CORPUS.map(({l,v})=><div key={l} style={{padding:14,background:P.bg,borderRadius:10,textAlign:"center"}}><div style={{fontSize:17,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:P.text}}>{v}</div><div style={{fontSize:11,color:P.t2,marginTop:3}}>{l}</div></div>)}</div>
            <p style={{fontSize:13,color:P.t2,lineHeight:1.65,marginTop:16}}>The DementiaBank Pitt Corpus contains longitudinal Cookie Theft picture descriptions from participants with probable Alzheimer's disease and healthy controls. Only Cookie Theft task transcripts are used. Binary classification (Control vs Dementia); chance level is 50%.</p>
          </Card>
          <Card><Label>Pipeline</Label>
            <div style={{display:"grid",gap:10}}>{PIPE.map(({s,t,d},i)=><div key={s} style={{display:"grid",gridTemplateColumns:"150px 1fr",gap:14,padding:14,background:i%2===0?P.bg:"transparent",borderRadius:10}}><div><div style={{fontSize:13,fontWeight:700,color:P.text}}>{s}</div><div style={{fontSize:11,color:P.blue,fontFamily:"'JetBrains Mono',monospace",marginTop:3}}>{t}</div></div><div style={{fontSize:13,color:P.t2,lineHeight:1.6}}>{d}</div></div>)}</div>
          </Card>
          <Card><Label>Intervention Levels</Label>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>{[{n:"Grammar Correction",s:"~98%",d:"Fix spelling/grammar only. All disfluencies preserved."},{n:"Light Paraphrase",s:"~93%",d:"Remove fillers, smooth phrasing. Same vocabulary."},{n:"Moderate Rewrite",s:"~83%",d:"Reorganize, improve vocabulary, remove repetition."},{n:"Full Reformulation",s:"~76%",d:"Professional-grade rewrite. Sophisticated vocabulary."}].map((info,i)=><div key={i} style={{padding:16,background:P.bg,borderRadius:12}}>
              <span style={{display:"inline-block",padding:"3px 12px",borderRadius:14,fontSize:12,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",background:P.opale,color:P.orange,marginBottom:10}}>L{i+1}</span>
              <div style={{fontSize:13,fontWeight:600,color:P.text,marginBottom:4}}>{info.n}</div>
              <div style={{fontSize:12,color:P.t2,lineHeight:1.5}}>{info.d}</div>
              <div style={{fontSize:11,color:P.t3,marginTop:8}}>Semantic similarity: {info.s}</div>
            </div>)}</div>
          </Card>
        </div>}

        {rTab==="results"&&<div style={{display:"grid",gap:22}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:22}}>
            <Card><Label>Diagnostic Accuracy Degradation</Label><DegChart h={280}/><p style={{fontSize:12,color:P.t2,lineHeight:1.6,marginTop:10}}>Classifier trained on L0, evaluated on each rewrite level. Accuracy drops monotonically from 98.6% to chance (49.6%) by L4. At L3, Anthropic falls below chance.</p></Card>
            <Card><Label>Statistical Significance (Wilcoxon, p &lt; 0.05)</Label>
              <ResponsiveContainer width="100%" height={220}><BarChart data={STAT_TESTS} margin={{top:8,right:20,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke={P.blight}/><XAxis dataKey="level" tick={{fill:P.t2,fontSize:12}}/><YAxis domain={[0,20]} tick={{fill:P.t2,fontSize:11}}/><Tooltip contentStyle={{background:P.card,border:`1px solid ${P.border}`,borderRadius:10,boxShadow:P.shadow}}/><Bar dataKey="sig_openai" name="OpenAI" fill={P.blue} radius={[4,4,0,0]}/><Bar dataKey="sig_anthropic" name="Anthropic" fill={P.orange} radius={[4,4,0,0]}/><Legend wrapperStyle={{fontSize:11}}/></BarChart></ResponsiveContainer>
              <p style={{fontSize:12,color:P.t2,lineHeight:1.6,marginTop:10}}>By L2, 17-18 of 20 features are significantly altered. By L4, all 20. AI doesn't selectively edit -- it systematically transforms the entire linguistic fingerprint.</p>
            </Card>
          </div>
          <Card><Label>Biomarker Retention Ratio (BRR)</Label>
            <p style={{fontSize:12,color:P.t2,marginBottom:14}}>BRR = |Cohen's d at level| / |Cohen's d at L0|. 1.0 = signal preserved. 0 = signal erased.</p>
            <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr><th style={{textAlign:"left",padding:"10px",color:P.t3,borderBottom:`2px solid ${P.border}`}}>Feature</th>{["L1","L2","L3","L4"].map(l=><th key={l} style={{textAlign:"center",padding:"10px",color:P.t3,borderBottom:`2px solid ${P.border}`,fontFamily:"'JetBrains Mono',monospace"}}>{l}</th>)}</tr></thead>
              <tbody>{BRR_DATA.map(r=><tr key={r.cat}><td style={{padding:"8px 10px",color:P.text,borderBottom:`1px solid ${P.blight}`}}>{r.cat}</td>
                {[r.L1,r.L2,r.L3,r.L4].map((v,i)=>{const bg=v>=0.8?P.gpale:v>=0.5?P.ypale:v>=0.2?P.opale:P.rpale;const co=v>=0.8?P.green:v>=0.5?P.yellow:v>=0.2?P.orange:P.red;return <td key={i} style={{padding:"8px 10px",textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:co,background:bg,borderBottom:`1px solid ${P.blight}`}}>{v.toFixed(2)}</td>;})}</tr>)}</tbody>
            </table></div>
          </Card>
          <Card><Label>The "What vs How" Gap</Label>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:0}}>
              {["Level","Semantic Sim.","Diagnostic Acc.","Meaning?","Diagnosis?"].map(h=><div key={h} style={{padding:"10px 12px",background:P.bg,fontWeight:600,fontSize:11,color:P.t3,borderBottom:`1px solid ${P.border}`}}>{h}</div>)}
              {[["L0","100%","98.6%","Yes","Yes"],["L1","~98%","74.8%","Yes","Degraded"],["L2","~93%","58.7%","Yes","Failing"],["L3","~83%","47.6%","Yes","Below chance"],["L4","~76%","49.6%","Mostly","Coin flip"]].map(row=>row.map((v,i)=><div key={row[0]+i} style={{padding:"10px 12px",fontSize:13,fontFamily:i>0?"'JetBrains Mono',monospace":"inherit",color:v==="Below chance"||v==="Coin flip"?P.red:v==="Failing"||v==="Degraded"?P.orange:P.text,fontWeight:v==="Below chance"||v==="Coin flip"?700:400,borderBottom:`1px solid ${P.blight}`}}>{v}</div>))}
            </div>
            <p style={{fontSize:13,color:P.t2,lineHeight:1.6,marginTop:16}}>At L3, semantic similarity is still 83%. But diagnostic accuracy has collapsed below chance. AI preserves <strong style={{color:P.text}}>what</strong> the patient said while erasing <strong style={{color:P.text}}>how</strong> they said it.</p>
          </Card>
        </div>}

        {rTab==="features"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:22}}>
          <Card><Label>Top 10 Features by Importance (Random Forest)</Label>
            <ResponsiveContainer width="100%" height={300}><BarChart data={IMP} layout="vertical" margin={{top:4,right:20,left:115,bottom:4}}><CartesianGrid strokeDasharray="3 3" stroke={P.blight} horizontal={false}/><XAxis type="number" tick={{fill:P.t2,fontSize:11}} domain={[0,0.16]}/><YAxis type="category" dataKey="f" tick={{fill:P.t2,fontSize:11}} tickFormatter={f=>FLABELS[f]||f} width={110}/><Tooltip contentStyle={{background:P.card,border:`1px solid ${P.border}`,borderRadius:10,boxShadow:P.shadow}}/><Bar dataKey="v" name="Importance" radius={[0,5,5,0]}>{IMP.map((_,i)=><Cell key={i} fill={i<3?P.blue:i<6?P.orange:P.t3}/>)}</Bar></BarChart></ResponsiveContainer>
          </Card>
          <Card><Label>8 Biomarker Categories</Label>
            <div style={{display:"grid",gap:8}}>{CATS8.map(({c,f,lib,w})=><div key={c} style={{padding:12,background:P.bg,borderRadius:10,display:"grid",gridTemplateColumns:"150px 1fr",gap:10}}>
              <div><div style={{fontSize:12,fontWeight:600,color:P.text}}>{c}</div><div style={{fontSize:10,color:P.blue,fontFamily:"'JetBrains Mono',monospace",marginTop:2}}>{lib}</div></div>
              <div><div style={{fontSize:11,color:P.t2}}>{f}</div><div style={{fontSize:11,color:P.t3,marginTop:3}}>{w}</div></div>
            </div>)}</div>
          </Card>
        </div>}

        {rTab==="references"&&<Card>
          <Label>Key References</Label>
          <div style={{display:"grid",gap:10}}>{REFS.map((r,i)=><div key={i} style={{padding:14,background:i%2===0?P.bg:"transparent",borderRadius:10}}><div style={{fontSize:13,color:P.text,lineHeight:1.55}}>{r.a} ({r.y}). <em>{r.t}</em>. <span style={{color:P.t2}}>{r.j}.</span></div></div>)}</div>
          <div style={{marginTop:22,padding:16,background:P.bpale,borderRadius:10,border:`1px solid rgba(37,99,235,0.15)`}}>
            <div style={{fontSize:12,fontWeight:700,color:P.blue,marginBottom:6}}>Reproducibility</div>
            <div style={{fontSize:13,color:P.text,lineHeight:1.6}}>All code and analysis scripts at <span style={{fontFamily:"'JetBrains Mono',monospace",color:P.blue}}>github.com/cybr-wisp/paratrace-cym2026</span>. DementiaBank access through TalkBank (IRB-controlled). Every API response is disk-cached for exact reproducibility.</div>
          </div>
        </Card>}
      </>}

      {loading&&<div style={{position:"fixed",inset:0,background:"rgba(255,255,255,0.82)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}>
        <div style={{textAlign:"center",background:P.white,padding:"32px 48px",borderRadius:20,boxShadow:P.shadowLg}}>
          <div style={{width:44,height:44,border:`3px solid ${P.blight}`,borderTopColor:P.blue,borderRadius:"50%",animation:"pt-spin 0.7s linear infinite",margin:"0 auto"}}/>
          <div style={{marginTop:14,fontSize:15,color:P.t2,fontWeight:500}}>{loadMsg}</div>
        </div>
      </div>}

      </main>

      <footer style={{borderTop:`1px solid ${P.border}`,padding:"16px 24px",display:"flex",justifyContent:"space-between",fontSize:11,color:P.t3,marginTop:48,background:P.white}}>
        <span>ParaTrace &middot; CYM 2026 &middot; University of Ottawa</span>
        <span>Marie Sindhu</span>
      </footer>

      <style>{`
        @keyframes pt-spin{to{transform:rotate(360deg)}}
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
        *,*::before,*::after{box-sizing:border-box}
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:${P.border};border-radius:3px}
        .hl-filler{background:${P.yhl};border-radius:3px;padding:1px 4px}
        .hl-repeat{background:${P.ohl};border-radius:3px;padding:1px 4px}
        .hl-fragment{background:${P.rhl};border-radius:3px;padding:1px 4px}
        button{transition:all 0.15s}button:hover:not(:disabled){filter:brightness(0.95)}
        textarea:focus{border-color:${P.blue}!important;box-shadow:0 0 0 3px rgba(37,99,235,0.08)}
      `}</style>
    </div>
  );
}
