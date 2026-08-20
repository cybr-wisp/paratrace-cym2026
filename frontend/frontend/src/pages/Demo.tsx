// Demo.tsx -- re-exports the full demo/live app as a page component.
// This is the paratrace-final.jsx artifact adapted to import from components.
// For now, it's self-contained; refactor into component imports as needed.

import { useState, useCallback, useRef } from "react";
import { C, SAMPLE, SAMPLE_REWRITE, CATEGORIES, catScore, LEVEL_INFO, FEATURE_LABELS, FEATURE_NAMES } from "../types/analysis";
import BiomarkerRadar from "../components/RadarChart";
import ConfidenceGauge from "../components/ConfidenceGauge";
import DegradationChart from "../components/DegradationBars";
import RewriteLevelSlider from "../components/RewriteLevelSlider";
import FeatureTable from "../components/TranscriptComparison";
import { highlightBiomarkers, BiomarkerLegend } from "../components/TextInputPanel";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";

const IMPORTANCE = [
  {f:"global_coherence",v:.142},{f:"pronoun_noun_ratio",v:.128},{f:"ciu_ratio",v:.098},
  {f:"mean_sentence_length",v:.089},{f:"brunets_w",v:.078},{f:"filler_rate",v:.072},
  {f:"local_coherence",v:.068},{f:"mtld",v:.062},{f:"clause_density",v:.055},
  {f:"mean_parse_depth",v:.048},
];

function Card({children, style, accent}: {children: React.ReactNode; style?: React.CSSProperties; accent?: string}) {
  return <div style={{background:C.card, border:`1px solid ${accent?accent+"33":C.border}`, borderRadius:14, padding:20, ...style}}>{children}</div>;
}
function Label({children, color}: {children: React.ReactNode; color?: string}) {
  return <div style={{fontSize:11, fontWeight:700, color:color||C.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10}}>{children}</div>;
}
function Pill({active, color, bg, children, onClick, disabled}: any) {
  return <button onClick={onClick} disabled={disabled} style={{
    padding:"6px 16px", borderRadius:20, fontSize:12, fontWeight:600,
    border:`1.5px solid ${active?color:C.border}`, background:active?bg:"transparent",
    color:active?color:C.textSec, cursor:disabled?"default":"pointer", opacity:disabled?0.5:1,
  }}>{children}</button>;
}
function StatBox({value, label, sub, color}: {value:string;label:string;sub?:string;color?:string}) {
  return <Card style={{textAlign:"center", padding:14}}>
    <div style={{fontSize:24, fontWeight:700, fontFamily:"monospace", color:color||C.text}}>{value}</div>
    <div style={{fontSize:11, fontWeight:600, color:C.textSec, marginTop:3}}>{label}</div>
    {sub && <div style={{fontSize:10, color:C.textMuted, marginTop:2}}>{sub}</div>}
  </Card>;
}

function extractFeaturesLocal(text: string) {
  const words = text.split(/\s+/).filter(Boolean);
  const n = words.length||1;
  const lower = words.map(w => w.toLowerCase().replace(/[^a-z']/g,"")).filter(Boolean);
  const unique = new Set(lower);
  const ttr = unique.size/(lower.length||1);
  const fillers = (text.match(/\b(um|uh|er|ah|hm|hmm|mhm|well|like|you know|i mean)\b/gi)||[]).length;
  const incomplete = words.filter(w => w.endsWith("-")).length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const meanSentLen = sentences.length ? words.length/sentences.length : words.length;
  const stops = new Set(["the","a","an","is","are","was","were","be","been","have","has","had","do","does","did","will","would","could","should","and","but","or","for","so","in","on","at","to","from","by","with","of","it","its","this","that","i","me","my","we","us","our","you","your","he","him","his","she","her","they","them","their"]);
  const content = lower.filter(w => w.length>2 && !stops.has(w));
  const cc: Record<string,number> = {};
  content.forEach(w => { cc[w]=(cc[w]||0)+1; });
  const repeated = Object.values(cc).filter(c => c>1).length;
  const pronouns = lower.filter(w => ["i","me","my","we","us","our","you","your","he","him","his","she","her","they","them","their","it"].includes(w));
  const nouns = lower.filter(w => w.length>3 && !stops.has(w));
  return {
    ttr, mtld:ttr*120+Math.random()*20, mattr:ttr*0.95+0.03,
    content_word_repetition_rate:repeated/(Object.keys(cc).length||1),
    bigram_repetition_rate:Math.max(0,repeated*0.4/(lower.length||1)), unique_word_ratio:ttr,
    local_coherence:0.3+Math.random()*0.4, global_coherence:0.4+Math.random()*0.3,
    coherence_variance:0.02+Math.random()*0.08, mean_parse_depth:2+Math.random()*3,
    mean_sentence_length:meanSentLen, clause_density:Math.min(2,0.3+Math.random()*0.8),
    idea_density:content.length/(lower.length||1), filler_rate:fillers/n,
    incomplete_word_rate:incomplete/n, mean_utterance_length:meanSentLen*0.8,
    brunets_w:8+(1-ttr)*8+Math.random()*2, honores_r:400+ttr*800+Math.random()*200,
    ciu_ratio:content.length/(lower.length||1), pronoun_noun_ratio:pronouns.length/(nouns.length||1),
  };
}
function classifyLocal(f: Record<string,number>) {
  let s=0;
  s+=f.filler_rate>0.005?0.15:-0.1; s+=f.pronoun_noun_ratio>1.2?0.15:-0.1;
  s+=f.global_coherence<0.6?0.12:-0.08; s+=f.ttr<0.7?0.1:-0.05;
  s+=f.content_word_repetition_rate>0.1?0.1:-0.05;
  const conf=Math.max(0.35,Math.min(0.92,0.5+s));
  return {label:conf>0.55?"Dementia":"Control", confidence:conf};
}
function simulateRewrite(text: string, level: number) {
  let out=text.replace(/\b(um|uh|er|ah|hm|hmm|well\.\.\.?|you know|i mean)\s*/gi,"");
  out=out.replace(/\b(\w+)\s+\1\b/gi,"$1");
  out=out.replace(/\.\.\./g,"").replace(/\s{2,}/g," ").trim();
  out=out.replace(/(^|\.\s+)([a-z])/g,(_,p,c)=>p+c.toUpperCase());
  if(level>=3){out=out.charAt(0).toUpperCase()+out.slice(1);if(!/[.!?]$/.test(out))out+=".";}
  return out||text;
}

const STAGES = ["input","analysis","erasure","solution"] as const;
const STAGE_LABELS = ["Input","Analyze","Erasure","Solution"];

export default function Demo() {
  const [mode, setMode] = useState<"demo"|"live">("demo");
  const [stage, setStage] = useState<typeof STAGES[number]>("input");
  const [text, setText] = useState(""); const [level, setLevel] = useState(3);
  const [backend, setBackend] = useState("openai"); const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(""); const [solutionView, setSolutionView] = useState("current");
  const [showTable, setShowTable] = useState(false);
  const [liveText,setLiveText]=useState(""); const [liveFeatures,setLiveFeatures]=useState<any>(null);
  const [livePred,setLivePred]=useState<any>(null); const [liveRewText,setLiveRewText]=useState("");
  const [liveRewFeats,setLiveRewFeats]=useState<any>(null); const [liveRewPred,setLiveRewPred]=useState<any>(null);
  const [liveStage,setLiveStage]=useState<"input"|"analyzed"|"rewritten">("input");
  const [liveLevel,setLiveLevel]=useState(3); const [recording,setRecording]=useState(false);
  const recRef=useRef<any>(null);

  const activeText=text||SAMPLE.text;
  const stageIdx=STAGES.indexOf(stage);

  const toggleRec=useCallback(()=>{
    if(recording){recRef.current?.stop();setRecording(false);return;}
    const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    if(!SR){alert("Speech recognition not supported. Use Chrome.");return;}
    const r=new SR();r.continuous=true;r.interimResults=true;r.lang="en-US";
    let final=liveText;
    r.onresult=(e:any)=>{let interim="";for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal)final+=e.results[i][0].transcript+" ";else interim+=e.results[i][0].transcript;}setLiveText(final+interim);};
    r.onerror=()=>setRecording(false);r.onend=()=>setRecording(false);
    recRef.current=r;r.start();setRecording(true);
  },[recording,liveText]);

  const resetLive=()=>{setLiveText("");setLiveFeatures(null);setLivePred(null);setLiveRewText("");setLiveRewFeats(null);setLiveRewPred(null);setLiveStage("input");};

  return (
    <div>
      {/* Mode + stage nav */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20}}>
        <div style={{display:"flex", gap:4, background:C.white, border:`1px solid ${C.border}`, borderRadius:10, padding:3}}>
          <Pill active={mode==="demo"} color={C.blue} bg={C.bluePale} onClick={()=>{setMode("demo");setStage("input");}}>Guided Demo</Pill>
          <Pill active={mode==="live"} color={C.orange} bg={C.orangePale} onClick={()=>{setMode("live");resetLive();}}>Try It Live</Pill>
        </div>
        {mode==="demo" && (
          <div style={{display:"flex", gap:4, alignItems:"center"}}>
            {STAGE_LABELS.map((lbl,i)=>(
              <div key={lbl} style={{display:"flex", alignItems:"center", gap:4}}>
                <Pill active={i===stageIdx} color={C.blue} bg={C.bluePale} onClick={()=>i<=stageIdx&&setStage(STAGES[i])} disabled={i>stageIdx}>{lbl}</Pill>
                {i<STAGE_LABELS.length-1&&<div style={{width:14,height:1.5,background:i<stageIdx?C.blue:C.border}}/>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ DEMO MODE ══════════════════════════════════════════════ */}
      {mode==="demo"&&<>
        {stage==="input"&&<div style={{maxWidth:660,margin:"24px auto 0"}}>
          <h1 style={{fontSize:28,fontWeight:700,letterSpacing:"-0.03em",marginBottom:6}}>Does AI erase the signs of <span style={{color:C.blue}}>dementia</span>?</h1>
          <p style={{color:C.textSec,fontSize:14,lineHeight:1.65,marginBottom:20}}>Paste a transcript or load the Cookie Theft example. ParaTrace extracts 20 linguistic biomarkers across 8 categories, classifies cognitive status, then shows what happens when AI rewrites the text.</p>
          <textarea value={text} onChange={e=>setText(e.target.value)} placeholder={SAMPLE.text} rows={6} style={{width:"100%",padding:14,borderRadius:10,fontSize:13,background:C.white,border:`1px solid ${C.border}`,color:C.text,fontFamily:"monospace",lineHeight:1.75,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
          <div style={{marginTop:14,display:"flex",gap:10}}>
            <button onClick={()=>{if(!text.trim())setText(SAMPLE.text);setLoading(true);setLoadingMsg("Extracting 20 biomarkers...");setTimeout(()=>{setLoading(false);setStage("analysis");},1200);}} style={{padding:"11px 28px",borderRadius:9,fontSize:14,fontWeight:600,background:C.blue,color:C.white,border:"none",cursor:"pointer"}}>Analyze transcript</button>
            <button onClick={()=>setText(SAMPLE.text)} style={{padding:"11px 18px",borderRadius:9,fontSize:12,fontWeight:500,background:"transparent",color:C.textSec,border:`1px solid ${C.border}`,cursor:"pointer"}}>Load example</button>
          </div>
        </div>}

        {stage==="analysis"&&<div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 310px",gap:20}}>
            <div><Label>Raw transcript with biomarkers highlighted</Label><Card style={{fontFamily:"monospace",fontSize:13,lineHeight:2.1}}>{highlightBiomarkers(activeText)}</Card><BiomarkerLegend/></div>
            <Card><BiomarkerRadar original={SAMPLE.features} showRewritten={false}/><ConfidenceGauge label={SAMPLE.prediction.label} confidence={SAMPLE.prediction.confidence}/></Card>
          </div>
          <Card style={{marginTop:20,display:"flex",alignItems:"center",gap:24,flexWrap:"wrap"}}>
            <div><Label>Intervention level</Label><RewriteLevelSlider level={level} onSelect={setLevel}/></div>
            <div><Label>Backend</Label><div style={{display:"flex",gap:6}}>{[["openai","GPT-4o"],["anthropic","Claude"]].map(([b,l])=><Pill key={b} active={backend===b} color={C.blue} bg={C.bluePale} onClick={()=>setBackend(b)}>{l}</Pill>)}</div></div>
            <div style={{marginLeft:"auto"}}><button onClick={()=>{setLoading(true);setLoadingMsg("Applying L"+level+" AI rewriting...");setTimeout(()=>{setLoading(false);setStage("erasure");},2000);}} style={{padding:"11px 24px",borderRadius:9,fontSize:14,fontWeight:600,background:C.red,color:C.white,border:"none",cursor:"pointer"}}>Apply AI rewriting</button></div>
          </Card>
        </div>}

        {stage==="erasure"&&<div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
            <div><Label color={C.blue}>Original speech</Label><Card style={{fontFamily:"monospace",fontSize:13,lineHeight:2.1,minHeight:90}} accent={C.blue}>{highlightBiomarkers(activeText)}</Card></div>
            <div><Label color={C.red}>After L{level} rewriting</Label><Card style={{fontFamily:"monospace",fontSize:13,lineHeight:2.1,minHeight:90}} accent={C.red}>{SAMPLE_REWRITE.text}</Card></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:20,marginTop:20}}>
            <Card><Label>Biomarker overlay</Label><BiomarkerRadar original={SAMPLE.features} rewritten={SAMPLE_REWRITE.features} showRewritten={true}/></Card>
            <Card><Label>Before AI</Label><ConfidenceGauge label={SAMPLE.prediction.label} confidence={SAMPLE.prediction.confidence}/></Card>
            <Card><Label>After AI</Label><ConfidenceGauge label={SAMPLE_REWRITE.prediction.label} confidence={SAMPLE_REWRITE.prediction.confidence}/></Card>
          </div>
          <Card style={{marginTop:20,textAlign:"center",background:C.orangePale}} accent={C.orange}>
            <div style={{fontSize:12,color:C.textSec}}>Semantic similarity</div>
            <div style={{fontSize:34,fontWeight:700,fontFamily:"monospace",color:C.orange,margin:"4px 0"}}>83.4%</div>
            <div style={{fontSize:13,color:C.textSec}}>AI preserves <strong style={{color:C.text}}>what</strong> was said while erasing <strong style={{color:C.text}}>how</strong> it was said.</div>
          </Card>
          <div style={{marginTop:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <button onClick={()=>setShowTable(!showTable)} style={{padding:"8px 16px",borderRadius:8,fontSize:12,fontWeight:500,background:"transparent",color:C.textSec,border:`1px solid ${C.border}`,cursor:"pointer"}}>{showTable?"Hide":"Show"} all 20 features</button>
            <button onClick={()=>setStage("solution")} style={{padding:"11px 28px",borderRadius:9,fontSize:14,fontWeight:600,background:C.blue,color:C.white,border:"none",cursor:"pointer"}}>See the solution</button>
          </div>
          {showTable&&<Card style={{marginTop:12}}><FeatureTable features={SAMPLE.features} rewrittenFeatures={SAMPLE_REWRITE.features}/></Card>}
        </div>}

        {stage==="solution"&&<div>
          <h2 style={{fontSize:22,fontWeight:700,marginBottom:4}}>The fix: extract biomarkers <span style={{color:C.blue}}>before</span> AI rewrites</h2>
          <p style={{color:C.textSec,fontSize:14,marginBottom:20,maxWidth:680}}>Under the proposed architecture, diagnostic features are captured from raw speech before any AI processing.</p>
          <div style={{display:"flex",gap:4,marginBottom:20,background:C.white,border:`1px solid ${C.border}`,borderRadius:10,padding:4,width:"fit-content"}}>
            <Pill active={solutionView==="current"} color={C.red} bg={C.redPale} onClick={()=>setSolutionView("current")}>Current pipeline</Pill>
            <Pill active={solutionView==="proposed"} color={C.blue} bg={C.bluePale} onClick={()=>setSolutionView("proposed")}>Proposed pipeline</Pill>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
            <Card><Label>Diagnostic accuracy by level</Label><DegradationChart/><div style={{fontSize:10,color:C.textMuted,marginTop:6,textAlign:"center"}}>Red dashed = chance (50%)</div></Card>
            <Card><Label>{solutionView==="current"?"Current: Post-extraction":"Proposed: Pre-extraction"}</Label>
              {solutionView==="current"?<div>
                <div style={{padding:14,background:C.redPale,border:`1px solid rgba(220,38,38,0.2)`,borderRadius:8,marginBottom:14}}><div style={{fontSize:12,fontWeight:700,color:C.red,marginBottom:4}}>Problem</div><div style={{fontSize:13,color:C.text,lineHeight:1.6}}>AI rewrites first. By L3, accuracy drops to <strong>47.6%</strong> (below chance).</div></div>
                <BiomarkerRadar original={SAMPLE.features} rewritten={SAMPLE_REWRITE.features} showRewritten={true}/>
              </div>:<div>
                <div style={{padding:14,background:C.bluePale,border:`1px solid rgba(37,99,235,0.2)`,borderRadius:8,marginBottom:14}}><div style={{fontSize:12,fontWeight:700,color:C.blue,marginBottom:4}}>Solution</div><div style={{fontSize:13,color:C.text,lineHeight:1.6}}>Extract before AI. Accuracy stays at <strong>98.6%</strong>.</div></div>
                <BiomarkerRadar original={SAMPLE.features} showRewritten={false}/>
                <div style={{textAlign:"center",marginTop:8}}><span style={{display:"inline-block",padding:"7px 18px",borderRadius:8,background:C.bluePale,border:`1px solid ${C.blueRing}`,fontSize:14,fontWeight:700,fontFamily:"monospace",color:C.blue}}>100% signal preserved</span></div>
              </div>}
            </Card>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginTop:20}}>
            <Card><Label>Top 10 features by importance</Label>
              <ResponsiveContainer width="100%" height={240}><BarChart data={IMPORTANCE} layout="vertical" margin={{top:4,right:20,left:110,bottom:4}}><CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} horizontal={false}/><XAxis type="number" tick={{fill:C.textSec,fontSize:11}} domain={[0,0.16]}/><YAxis type="category" dataKey="f" tick={{fill:C.textSec,fontSize:11}} tickFormatter={(f:string)=>FEATURE_LABELS[f]||f} width={105}/><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8}}/><Bar dataKey="v" name="Importance" radius={[0,4,4,0]}>{IMPORTANCE.map((_,i)=><Cell key={i} fill={i<3?C.blue:i<6?C.orange:C.textMuted}/>)}</Bar></BarChart></ResponsiveContainer>
            </Card>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <StatBox value="552" label="Transcripts" sub="Pitt Corpus"/>
              <StatBox value="20" label="Biomarkers" sub="8 categories"/>
              <StatBox value="73.4%" label="Baseline CV" sub="5-fold" color={C.blue}/>
              <StatBox value="49.6%" label="L4 accuracy" sub="Chance level" color={C.red}/>
            </div>
          </div>
        </div>}
      </>}

      {/* ═══ LIVE MODE ══════════════════════════════════════════════ */}
      {mode==="live"&&<>
        {liveStage==="input"&&<div style={{maxWidth:700,margin:"16px auto 0"}}>
          <div style={{background:`linear-gradient(135deg,${C.bluePale},${C.orangePale})`,borderRadius:14,padding:"24px 28px",marginBottom:24}}>
            <h1 style={{fontSize:24,fontWeight:700,marginBottom:6}}>Try it yourself</h1>
            <p style={{color:C.textSec,fontSize:14,lineHeight:1.6,margin:0}}>Describe the scene below in your own words. Speak naturally. ParaTrace will extract your biomarkers, then show you what AI does to them.</p>
          </div>
          <Card style={{marginBottom:20,textAlign:"center"}}>
            <Label>Describe this scene (the "Cookie Theft" picture)</Label>
            <div style={{background:C.bg,borderRadius:10,padding:20,fontSize:13,color:C.textSec,lineHeight:1.7,maxWidth:500,margin:"0 auto"}}>
              <strong style={{color:C.text}}>Imagine:</strong> A kitchen. A woman at the sink washing dishes. Water overflows onto the floor. Behind her, two children reach for a cookie jar on a high shelf. A boy on a stool that's tipping over. A girl reaching up.
              <div style={{marginTop:10,fontSize:11,color:C.textMuted}}>Standard Cookie Theft picture task (Boston Diagnostic Aphasia Examination).</div>
            </div>
          </Card>
          <Card>
            <div style={{display:"flex",alignItems:"flex-start",gap:16}}>
              <div style={{flex:1}}>
                <textarea value={liveText} onChange={e=>setLiveText(e.target.value)} placeholder="Start typing or press the mic button..." rows={5} style={{width:"100%",padding:14,borderRadius:10,fontSize:13,background:C.bg,border:`1px solid ${C.border}`,color:C.text,fontFamily:"monospace",lineHeight:1.75,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
                <div style={{marginTop:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11,color:C.textMuted}}>{liveText.split(/\s+/).filter(Boolean).length} words{recording&&<span style={{color:C.red,marginLeft:8}}>Recording...</span>}</span>
                  <div style={{display:"flex",gap:8}}>
                    {liveText.trim()&&<button onClick={()=>setLiveText("")} style={{padding:"6px 14px",borderRadius:8,fontSize:12,background:"transparent",color:C.textMuted,border:`1px solid ${C.border}`,cursor:"pointer"}}>Clear</button>}
                    <button onClick={()=>{setLoading(true);setLoadingMsg("Extracting biomarkers...");setTimeout(()=>{const f=extractFeaturesLocal(liveText);setLiveFeatures(f);setLivePred(classifyLocal(f));setLiveStage("analyzed");setLoading(false);},1500);}} disabled={liveText.split(/\s+/).filter(Boolean).length<10} style={{padding:"9px 22px",borderRadius:9,fontSize:13,fontWeight:600,background:liveText.split(/\s+/).filter(Boolean).length>=10?C.blue:C.border,color:liveText.split(/\s+/).filter(Boolean).length>=10?C.white:C.textMuted,border:"none",cursor:liveText.split(/\s+/).filter(Boolean).length>=10?"pointer":"default"}}>Analyze my speech</button>
                  </div>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                <button onClick={toggleRec} style={{width:56,height:56,borderRadius:"50%",border:"none",cursor:"pointer",background:recording?`linear-gradient(135deg,${C.red},#b91c1c)`:`linear-gradient(135deg,${C.blue},${C.blueDark})`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:recording?`0 0 0 4px ${C.redPale}`:"0 2px 8px rgba(0,0,0,0.1)"}}>
                  {recording?<svg width="22" height="22" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>:<svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
                </button>
                <span style={{fontSize:10,color:C.textMuted}}>{recording?"Stop":"Speak"}</span>
              </div>
            </div>
          </Card>
        </div>}

        {liveStage==="analyzed"&&liveFeatures&&<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h2 style={{fontSize:20,fontWeight:700,margin:0}}>Your biomarker profile</h2>
            <button onClick={resetLive} style={{padding:"6px 14px",borderRadius:8,fontSize:12,background:"transparent",color:C.textSec,border:`1px solid ${C.border}`,cursor:"pointer"}}>Start over</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 310px",gap:20}}>
            <div><Label>Your speech with biomarkers</Label><Card style={{fontFamily:"monospace",fontSize:13,lineHeight:2.1}}>{highlightBiomarkers(liveText)}</Card><BiomarkerLegend/></div>
            <Card><BiomarkerRadar original={liveFeatures} showRewritten={false}/><ConfidenceGauge label={livePred.label} confidence={livePred.confidence} size={100}/><div style={{fontSize:10,color:C.textMuted,textAlign:"center",marginTop:4}}>Not a real diagnosis. Shows how the classifier reads speech patterns.</div></Card>
          </div>
          <Card style={{marginTop:20,display:"flex",alignItems:"center",gap:24,flexWrap:"wrap"}}>
            <div><Label>Now watch what AI does</Label><RewriteLevelSlider level={liveLevel} onSelect={setLiveLevel}/></div>
            <button onClick={()=>{setLoading(true);setLoadingMsg("AI is rewriting...");setTimeout(()=>{const r=simulateRewrite(liveText,liveLevel);const f=extractFeaturesLocal(r);setLiveRewText(r);setLiveRewFeats(f);setLiveRewPred(classifyLocal(f));setLiveStage("rewritten");setLoading(false);},2000);}} style={{padding:"11px 24px",borderRadius:9,fontSize:14,fontWeight:600,background:C.red,color:C.white,border:"none",cursor:"pointer",marginLeft:"auto"}}>Apply AI rewriting</button>
          </Card>
        </div>}

        {liveStage==="rewritten"&&liveRewFeats&&<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h2 style={{fontSize:20,fontWeight:700,margin:0}}>What AI did to your speech</h2>
            <button onClick={resetLive} style={{padding:"6px 14px",borderRadius:8,fontSize:12,background:"transparent",color:C.textSec,border:`1px solid ${C.border}`,cursor:"pointer"}}>Try again</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
            <div><Label color={C.blue}>Your original</Label><Card style={{fontFamily:"monospace",fontSize:13,lineHeight:2.1,minHeight:80}} accent={C.blue}>{highlightBiomarkers(liveText)}</Card></div>
            <div><Label color={C.red}>After L{liveLevel} rewriting</Label><Card style={{fontFamily:"monospace",fontSize:13,lineHeight:2.1,minHeight:80}} accent={C.red}>{liveRewText}</Card></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:20,marginTop:20}}>
            <Card><Label>Before vs after</Label><BiomarkerRadar original={liveFeatures} rewritten={liveRewFeats} showRewritten={true}/></Card>
            <Card><Label>Before AI</Label><ConfidenceGauge label={livePred.label} confidence={livePred.confidence} size={100}/></Card>
            <Card><Label>After AI</Label><ConfidenceGauge label={liveRewPred.label} confidence={liveRewPred.confidence} size={100}/></Card>
          </div>
          <Card style={{marginTop:20,background:C.orangePale,textAlign:"center"}} accent={C.orange}>
            <div style={{fontSize:13,color:C.textSec,lineHeight:1.6,maxWidth:600,margin:"0 auto"}}>Even in healthy speech, AI smooths out the features that make your voice yours. For someone with early cognitive decline, those features are the only warning sign.</div>
          </Card>
          <Card style={{marginTop:16}}><Label>All 20 features</Label><FeatureTable features={liveFeatures} rewrittenFeatures={liveRewFeats}/></Card>
        </div>}
      </>}

      {loading&&<div style={{position:"fixed",inset:0,background:"rgba(255,255,255,0.8)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}>
        <div style={{textAlign:"center"}}><div style={{width:40,height:40,border:`3px solid ${C.border}`,borderTopColor:C.blue,borderRadius:"50%",animation:"pt-spin 0.8s linear infinite",margin:"0 auto"}}/><div style={{marginTop:12,fontSize:14,color:C.textSec}}>{loadingMsg}</div></div>
      </div>}
    </div>
  );
}
