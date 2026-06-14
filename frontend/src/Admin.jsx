import { useState, useEffect, useRef } from "react";
import { supabase, db } from "./supabase.js";
import Hls from "hls.js";
import FaceAuth from "./FaceAuth.jsx";

const R = "#e50914";
const BL = "#1565c0";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{background:#060610;color:#e2e2f0;font-family:'Inter',sans-serif;}
::-webkit-scrollbar{width:3px;height:3px;}
::-webkit-scrollbar-thumb{background:#e50914;border-radius:2px;}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
.inp{width:100%;background:#0c0c1e;border:1.5px solid #1e1e32;border-radius:9px;color:#e2e2f0;font-family:'Inter',sans-serif;font-size:13px;padding:10px 13px;outline:none;transition:border-color .2s;}
.inp:focus{border-color:#e50914;}
.inp::placeholder{color:#2a2a44;}
.nav{display:flex;align-items:center;gap:10px;padding:9px 14px;border-radius:10px;cursor:pointer;font-size:12.5px;font-weight:500;color:#4a4a6a;transition:all .15s;white-space:nowrap;}
.nav:hover{background:rgba(255,255,255,.04);color:#9999bb;}
.nav.on{background:rgba(229,9,20,.1);color:#e50914;font-weight:700;border-left:2px solid #e50914;}
.card{background:#0e0e20;border:1px solid #1a1a2e;border-radius:14px;}
.tbl{width:100%;border-collapse:collapse;}
.tbl th{padding:10px 14px;text-align:left;font-size:10px;color:#444466;font-weight:700;text-transform:uppercase;letter-spacing:.7px;border-bottom:1px solid #1a1a2e;}
.tbl td{padding:10px 14px;font-size:13px;border-bottom:1px solid #111120;}
.tbl tr:last-child td{border-bottom:none;}
.tbl tr:hover td{background:rgba(255,255,255,.018);}
.kpi{position:relative;overflow:hidden;padding:20px 22px;border-radius:14px;background:#0e0e20;border:1px solid #1a1a2e;}
.upload-zone{border:2px dashed #1a1a2e;border-radius:12px;padding:28px 20px;text-align:center;cursor:pointer;transition:all .2s;background:#0a0a18;}
.upload-zone:hover,.upload-zone.drag{border-color:#e50914;background:rgba(229,9,20,.04);}
.src-tab{background:rgba(255,255,255,.04);border:1px solid #1a1a2e;color:#666688;border-radius:8px;padding:7px 16px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;font-family:'Inter',sans-serif;}
.src-tab.on{background:rgba(229,9,20,.18);border-color:rgba(229,9,20,.4);color:#e50914;}
`;

const PAGES=[
  {id:"dashboard",icon:"📊",label:"Dashboard"},
  {id:"content",  icon:"🎬",label:"Movies & Series"},
  {id:"live",     icon:"🔴",label:"Live Channels"},
  {id:"users",    icon:"👥",label:"Users"},
  {id:"ads",      icon:"📢",label:"Ads Manager"},
  {id:"revenue",  icon:"💰",label:"Revenue"},
  {id:"analytics",icon:"📈",label:"Analytics"},
  {id:"settings", icon:"⚙️",label:"Settings"},
];

const TYPES  =["Movie","Web Series","Documentary","Short Film"];
const GENRES =["Action","Drama","Sci-Fi","Thriller","Comedy","Romance","Kids","Cricket","Football","Racing","News","Documentary","Nature","Horror","Sports","Music","Reality","Anime"];
const LANGS  =["Hindi","English","Kannada","Tamil","Telugu","Bengali","Malayalam","Punjabi","Marathi","Gujarati","Bhojpuri","Odia","Urdu"];
const RATINGS=["U","U/A","U/A 7+","U/A 13+","U/A 16+","A"];
const fN=n=>n>=1e7?(n/1e7).toFixed(1)+"Cr":n>=1e5?(n/1e5).toFixed(1)+"L":n>=1e3?(n/1e3).toFixed(1)+"K":String(n||0);

function Chip({label,color="#888"}){
  return <span style={{background:`${color}22`,color,fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:20,border:`1px solid ${color}33`,whiteSpace:"nowrap"}}>{label}</span>;
}
function Btn({children,onClick,color=R,outline,ghost,danger,small,disabled,sx={}}){
  return <button disabled={disabled} onClick={onClick} style={{background:ghost?"transparent":danger?"rgba(248,113,113,.1)":outline?`${color}16`:color,border:`1px solid ${danger?"rgba(248,113,113,.3)":outline||ghost?color+"44":"transparent"}`,color:outline||ghost||danger?(danger?"#f87171":color):"#fff",borderRadius:8,padding:small?"4px 11px":"8px 16px",fontSize:small?11:13,fontWeight:600,cursor:disabled?"not-allowed":"pointer",fontFamily:"'Inter',sans-serif",transition:"all .15s",whiteSpace:"nowrap",opacity:disabled?.55:1,...sx}}>{children}</button>;
}
function Field({label,required,hint,children}){
  return(
    <div>
      <label style={{fontSize:10,color:"#444466",fontWeight:700,letterSpacing:.6,textTransform:"uppercase",display:"block",marginBottom:5}}>
        {label}{required&&<span style={{color:R}}> *</span>}
      </label>
      {children}
      {hint&&<div style={{fontSize:11,color:"#2a2a44",marginTop:4,lineHeight:1.5}}>{hint}</div>}
    </div>
  );
}
function Modal({title,onClose,children,wide}){
  useEffect(()=>{const fn=e=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",fn);return()=>window.removeEventListener("keydown",fn);},[]);
  return(
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,.88)",display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(6px)"}} onClick={onClose}>
      <div style={{background:"#0e0e1e",border:"1px solid #1a1a2e",borderRadius:16,width:"100%",maxWidth:wide?620:460,maxHeight:"92vh",overflowY:"auto",animation:"slideUp .22s ease"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"15px 22px",borderBottom:"1px solid #1a1a2e",position:"sticky",top:0,background:"#0e0e1e",zIndex:1}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:19,letterSpacing:1}}>{title}</div>
          <Btn onClick={onClose} ghost small sx={{fontSize:16,padding:"2px 8px"}}>✕</Btn>
        </div>
        <div style={{padding:"20px 22px"}}>{children}</div>
      </div>
    </div>
  );
}
function KPI({icon,label,value,color=R}){
  return(
    <div className="kpi">
      <div style={{position:"absolute",top:0,left:0,width:3,height:"100%",background:color,borderRadius:"2px 0 0 2px"}}/>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
        <span style={{fontSize:10,color:"#444466",fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>{label}</span>
        <span style={{fontSize:18}}>{icon}</span>
      </div>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:"#e2e2f0"}}>{value}</div>
    </div>
  );
}
function ToastMsg({msg,type="ok"}){
  const c=type==="err"?"#f87171":type==="warn"?"#f59e0b":"#00c853";
  return <div style={{position:"fixed",bottom:24,right:24,zIndex:2000,background:"#0e0e1e",border:`1px solid ${c}44`,borderLeft:`3px solid ${c}`,borderRadius:10,padding:"12px 20px",fontSize:13,fontWeight:500,animation:"slideUp .22s ease",boxShadow:"0 8px 40px rgba(0,0,0,.7)",maxWidth:340}}>{type==="ok"?"✅":type==="err"?"❌":"⚠️"} {msg}</div>;
}

/* ── Small stream preview ── */
function SmallPreview({url,isLive=false}){
  const vRef=useRef(null);
  const hlsRef=useRef(null);
  const[status,setStatus]=useState("loading");
  const isEmbed=url?.includes("drive.google.com")||url?.includes("dropbox.com")||url?.includes("1drv.ms")||url?.includes("embed");

  useEffect(()=>{
    if(!url)return;
    const v=vRef.current; if(!v) return;
    setStatus("loading");
    try{
      if(Hls.isSupported()&&(url.includes(".m3u8")||url.includes("m3u8"))){
        if(hlsRef.current)hlsRef.current.destroy();
        const hls=new Hls({enableWorker:true,lowLatencyMode:true});
        hlsRef.current=hls; hls.loadSource(url); hls.attachMedia(v);
        hls.on(Hls.Events.MANIFEST_PARSED,()=>{v.muted=true;v.play().catch(()=>{});setStatus("playing");});
        hls.on(Hls.Events.ERROR,(_,d)=>{if(d.fatal)setStatus("error");});
      } else {
        v.src=url; v.muted=true;
        v.oncanplay=()=>setStatus("playing");
        v.onerror=()=>setStatus("error");
        v.load();
      }
    }catch(e){setStatus("error");}
    return()=>{if(hlsRef.current){hlsRef.current.destroy();hlsRef.current=null;}};
  },[url]);

  return(
    <div style={{borderRadius:10,overflow:"hidden",background:"#000",border:"1px solid #1a1a2e",marginTop:12}}>
      <div style={{paddingTop:"56.25%",position:"relative"}}>
        <video ref={vRef} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"contain"}} playsInline muted controls/>
        {status==="loading"&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.8)"}}><div style={{width:32,height:32,border:"2px solid #1a1a2e",borderTop:`2px solid ${R}`,borderRadius:"50%",animation:"spin .8s linear infinite"}}/></div>}
        {status==="error"&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.8)",flexDirection:"column",gap:8}}><span style={{fontSize:28}}>⚠️</span><div style={{fontSize:11,color:"#f87171",textAlign:"center",padding:"0 12px"}}>Cannot preview — URL may need direct access</div></div>}
        {isLive&&<div style={{position:"absolute",top:8,left:8,background:R,color:"#fff",fontSize:9,fontWeight:800,padding:"2px 8px",borderRadius:3,letterSpacing:2,animation:"pulse 1.5s infinite",zIndex:5}}>● LIVE</div>}
      </div>
      <div style={{background:"#0a0a18",padding:"6px 14px",display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:status==="playing"?"#00c853":status==="error"?"#f87171":"#f59e0b",flexShrink:0}}/>
        <div style={{fontSize:11,color:status==="playing"?"#00c853":status==="error"?"#f87171":"#f59e0b",fontWeight:600}}>
          {status==="playing"?"✓ Video loaded":status==="error"?"✗ Cannot load — paste URL in URL tab":"Loading..."}
        </div>
      </div>
    </div>
  );
}

/* ── CONTENT FORM ── */
const EMPTY={title:"",description:"",type:"Movie",genre:"Action",language:"Hindi",is_premium:false,is_featured:false,is_active:true,is_live:false,stream_url:"",embed_url:"",thumbnail:"",release_year:new Date().getFullYear(),rating:"U/A",director:"",score:0,tags:[]};

function ContentForm({initial,isLiveForm=false,onSave,onCancel,saving}){
  const[form,setForm]=useState({...EMPTY,...(isLiveForm?{type:"Live",is_live:true}:{}),...initial});
  const[srcTab,setSrcTab]=useState("url");
  const[uploading,setUploading]=useState(false);
  const[uploadPct,setUploadPct]=useState(false);
  const[tagInput,setTagInput]=useState("");
  const[previewUrl,setPreviewUrl]=useState(initial?.stream_url||initial?.embed_url||"");
  const[dragging,setDragging]=useState(false);
  const fileRef=useRef();
  const thumbRef=useRef();

  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  // FIX: canSave checks correctly
  const streamOk=(form.stream_url||"").trim().length>5;
  const embedOk =(form.embed_url||"").trim().length>5;
  const titleOk =(form.title||"").trim().length>0;
  const canSave = titleOk && (streamOk||embedOk);

  function onUrlChange(val,field){
    set(field,val);
    if(val.trim().length>10) setPreviewUrl(val.trim());
    else setPreviewUrl("");
  }

  function addTag(e){
    if(e.key==="Enter"&&tagInput.trim()){set("tags",[...(form.tags||[]),tagInput.trim().toUpperCase()]);setTagInput("");}
  }

  async function uploadVideoFile(file){
    if(!file)return;
    // Check size — Supabase free = 50MB, paid = 5GB
    if(file.size>50*1024*1024){
      alert(`❌ File is ${(file.size/1024/1024).toFixed(0)}MB\n\nSupabase free plan only allows 50MB.\n\nOptions:\n1. Upgrade Supabase to Pro plan ($25/mo) for 100GB\n2. Use Cloudflare R2 (free 10GB) — upload there, paste URL here\n3. Upload to Google Drive → get direct link → paste in Cloud tab`);
      return;
    }
    setUploading(true); setUploadPct(0);
    try{
      const ext=file.name.split(".").pop().toLowerCase();
      const path=`videos/${Date.now()}_${Math.random().toString(36).slice(2,6)}.${ext}`;
      const{error}=await supabase.storage.from("streamx-media").upload(path,file,{
        cacheControl:"3600",upsert:false,
        onUploadProgress:e=>setUploadPct(Math.round((e.loaded/e.total)*100)),
      });
      if(error)throw error;
      const{data:ud}=supabase.storage.from("streamx-media").getPublicUrl(path);
      set("stream_url",ud.publicUrl);
      setPreviewUrl(ud.publicUrl);
      setSrcTab("url");
    }catch(e){
      alert("Upload failed: "+e.message);
    }
    setUploading(false); setUploadPct(0);
  }

  async function uploadThumb(file){
    if(!file)return;
    if(file.size>5*1024*1024){alert("Max 5MB for thumbnail");return;}
    try{
      const ext=file.name.split(".").pop().toLowerCase();
      const path=`thumbs/${Date.now()}.${ext}`;
      const{error}=await supabase.storage.from("streamx-media").upload(path,file,{cacheControl:"3600",upsert:false});
      if(error)throw error;
      const{data:ud}=supabase.storage.from("streamx-media").getPublicUrl(path);
      set("thumbnail",ud.publicUrl);
    }catch(e){alert("Thumb upload failed: "+e.message);}
  }

  function save(){
    if(!titleOk){alert("Please enter a title");return;}
    if(!streamOk&&!embedOk){alert("Please add a video URL");return;}
    onSave({...form});
  }

  return(
    <div style={{display:"flex",flexDirection:"column",gap:15}}>

      {/* Title + Type */}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
        <Field label="Title" required>
          <input className="inp" value={form.title} onChange={e=>set("title",e.target.value)} placeholder={isLiveForm?"Channel name e.g. IPL LIVE HD":"Movie/Series title"} autoFocus/>
        </Field>
        {!isLiveForm
          ?<Field label="Type"><select className="inp" value={form.type} onChange={e=>set("type",e.target.value)}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
          :<Field label="Category"><select className="inp" value={form.genre} onChange={e=>set("genre",e.target.value)}>{["Cricket","Football","News","Racing","Kids","Music","General","Entertainment"].map(g=><option key={g}>{g}</option>)}</select></Field>
        }
      </div>

      {/* Description */}
      <Field label="Description">
        <textarea className="inp" rows={2} value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Short description..." style={{resize:"vertical"}}/>
      </Field>

      {/* VIDEO SOURCE — 3 tabs only: URL, Upload, Cloud */}
      <div style={{background:"linear-gradient(135deg,rgba(229,9,20,.06),rgba(229,9,20,.02))",border:"1px solid rgba(229,9,20,.2)",borderRadius:13,padding:18}}>
        <div style={{fontSize:13,color:R,fontWeight:700,marginBottom:14}}>
          {isLiveForm?"🔴 Live Stream Source":"🎬 Video Source"}
          <span style={{fontSize:10,color:"#444466",fontWeight:400,marginLeft:8}}>required</span>
        </div>

        {/* 3 tabs — NO YouTube */}
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          <button className={`src-tab${srcTab==="url"?" on":""}`} onClick={()=>setSrcTab("url")}>🔗 URL / HLS</button>
          <button className={`src-tab${srcTab==="upload"?" on":""}`} onClick={()=>setSrcTab("upload")}>📁 Upload File</button>
          <button className={`src-tab${srcTab==="cloud"?" on":""}`} onClick={()=>setSrcTab("cloud")}>☁️ Cloud / Drive</button>
        </div>

        {/* URL Tab */}
        {srcTab==="url"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <Field label={isLiveForm?"HLS Live URL (.m3u8)":"Direct Video URL"} hint="Supports: HLS .m3u8, MP4, DASH .mpd — paste direct streaming link">
              <input className="inp" value={form.stream_url} onChange={e=>onUrlChange(e.target.value,"stream_url")} placeholder={isLiveForm?"https://example.com/live/stream.m3u8":"https://example.com/movie.mp4  or  stream.m3u8"}/>
            </Field>
            {form.stream_url&&form.stream_url.length>10&&(
              <div style={{fontSize:11,color:"#00c853",padding:"6px 10px",background:"rgba(0,200,83,.06)",borderRadius:6,wordBreak:"break-all"}}>
                ✓ URL set: {form.stream_url.slice(0,80)}{form.stream_url.length>80?"...":""}
              </div>
            )}
          </div>
        )}

        {/* Upload Tab */}
        {srcTab==="upload"&&(
          <div>
            <div className={`upload-zone${dragging?" drag":""}`}
              onDragOver={e=>{e.preventDefault();setDragging(true);}}
              onDragLeave={()=>setDragging(false)}
              onDrop={e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f)uploadVideoFile(f);}}
              onClick={()=>fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept="video/*,.mp4,.mkv,.avi,.mov,.m3u8" style={{display:"none"}} onChange={e=>e.target.files?.[0]&&uploadVideoFile(e.target.files[0])}/>
              {uploading?(
                <div>
                  <div style={{fontSize:34,marginBottom:10}}>⬆️</div>
                  <div style={{fontSize:14,color:"#fff",fontWeight:600,marginBottom:10}}>Uploading... {uploadPct}%</div>
                  <div style={{width:"100%",height:6,background:"#1a1a2e",borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",background:R,borderRadius:3,width:`${uploadPct}%`,transition:"width .3s"}}/>
                  </div>
                </div>
              ):(
                <div>
                  <div style={{fontSize:40,marginBottom:10,opacity:.5}}>📁</div>
                  <div style={{fontSize:14,color:"#aaa",fontWeight:600,marginBottom:5}}>{dragging?"Drop file here!":"Click or drag & drop video file"}</div>
                  <div style={{fontSize:11,color:"#444466"}}>MP4, MKV, AVI, MOV · Max 50MB (free) / 5GB (paid)</div>
                </div>
              )}
            </div>
            {/* Size limit info */}
            <div style={{marginTop:10,background:"rgba(245,158,11,.06)",border:"1px solid rgba(245,158,11,.2)",borderRadius:9,padding:12}}>
              <div style={{fontSize:12,color:"#f59e0b",fontWeight:700,marginBottom:6}}>⚠️ Upload Size Limits</div>
              <div style={{fontSize:11,color:"#666688",lineHeight:1.7}}>
                • Supabase Free: <span style={{color:"#f59e0b"}}>50MB max</span> — small clips only<br/>
                • Supabase Pro ($25/mo): <span style={{color:"#00c853"}}>5GB per file</span><br/>
                • <span style={{color:"#7bb3ff"}}>Best option:</span> Upload to Cloudflare R2 (free 10GB) or Google Drive → paste URL in Cloud tab
              </div>
            </div>
            {form.stream_url&&!uploading&&(
              <div style={{marginTop:8,fontSize:11,color:"#00c853",padding:"6px 10px",background:"rgba(0,200,83,.06)",borderRadius:6,wordBreak:"break-all"}}>
                ✓ Uploaded: {form.stream_url.slice(0,80)}...
              </div>
            )}
          </div>
        )}

        {/* Cloud Tab */}
        {srcTab==="cloud"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Field label="Paste Cloud Video Link" hint="Google Drive, Dropbox, OneDrive, Cloudflare R2, Bunny CDN, Terabox etc.">
              <input className="inp" value={form.stream_url} onChange={e=>onUrlChange(e.target.value,"stream_url")} placeholder="Paste your cloud/CDN video URL here"/>
            </Field>
            <div style={{background:"rgba(255,255,255,.02)",borderRadius:10,padding:14,border:"1px solid #1a1a2e"}}>
              <div style={{fontSize:12,color:"#7bb3ff",fontWeight:700,marginBottom:8}}>How to get video link:</div>
              <div style={{fontSize:11,color:"#555577",lineHeight:1.9}}>
                <span style={{color:"#4ade80",fontWeight:600}}>Cloudflare R2</span> (Best — Free 10GB):<br/>
                &nbsp;&nbsp;→ cloudflare.com → R2 → Create bucket → Upload → Copy public URL<br/>
                <span style={{color:"#60a5fa",fontWeight:600}}>Google Drive</span>:<br/>
                &nbsp;&nbsp;→ Upload video → Right click → Share → Anyone with link → Copy link<br/>
                &nbsp;&nbsp;→ Change: drive.google.com/file/d/<b>ID</b>/view → drive.google.com/uc?id=<b>ID</b><br/>
                <span style={{color:"#a78bfa",fontWeight:600}}>Dropbox</span>:<br/>
                &nbsp;&nbsp;→ Share → Copy link → Change dl=0 to dl=1 at the end<br/>
                <span style={{color:"#fb923c",fontWeight:600}}>Bunny CDN / BunnyCDN</span> (Fast India):<br/>
                &nbsp;&nbsp;→ bunny.net → Storage → Upload → Copy URL (fastest for India)
              </div>
            </div>
            {form.stream_url&&form.stream_url.length>10&&(
              <div style={{fontSize:11,color:"#00c853",padding:"6px 10px",background:"rgba(0,200,83,.06)",borderRadius:6}}>
                ✓ URL set
              </div>
            )}
          </div>
        )}

        {/* Preview when URL is pasted */}
        {previewUrl&&previewUrl.length>10&&srcTab!=="cloud"&&(
          <div style={{marginTop:12}}>
            <div style={{fontSize:10,color:"#444466",fontWeight:700,textTransform:"uppercase",letterSpacing:.6,marginBottom:6}}>Preview</div>
            <SmallPreview url={previewUrl} isLive={isLiveForm||form.is_live}/>
          </div>
        )}
      </div>

      {/* Thumbnail */}
      <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"end"}}>
        <Field label="Thumbnail URL">
          <input className="inp" value={form.thumbnail} onChange={e=>set("thumbnail",e.target.value)} placeholder="https://example.com/thumbnail.jpg"/>
        </Field>
        <div>
          <Btn onClick={()=>thumbRef.current?.click()} outline small color={BL}>Upload</Btn>
          <input ref={thumbRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>e.target.files?.[0]&&uploadThumb(e.target.files[0])}/>
        </div>
      </div>
      {form.thumbnail&&<img src={form.thumbnail} alt="" style={{width:160,height:90,objectFit:"cover",borderRadius:9,border:"1px solid #1a1a2e"}} onError={e=>e.target.style.display="none"}/>}

      {/* Genre + Lang + Rating */}
      {!isLiveForm&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          <Field label="Genre"><select className="inp" value={form.genre} onChange={e=>set("genre",e.target.value)}>{GENRES.map(g=><option key={g}>{g}</option>)}</select></Field>
          <Field label="Language"><select className="inp" value={form.language} onChange={e=>set("language",e.target.value)}>{LANGS.map(l=><option key={l}>{l}</option>)}</select></Field>
          <Field label="Rating"><select className="inp" value={form.rating} onChange={e=>set("rating",e.target.value)}>{RATINGS.map(r=><option key={r}>{r}</option>)}</select></Field>
        </div>
      )}
      {isLiveForm&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Field label="Language"><select className="inp" value={form.language} onChange={e=>set("language",e.target.value)}>{LANGS.map(l=><option key={l}>{l}</option>)}</select></Field>
          <Field label="Rating"><select className="inp" value={form.rating} onChange={e=>set("rating",e.target.value)}>{RATINGS.map(r=><option key={r}>{r}</option>)}</select></Field>
        </div>
      )}

      {/* Score + Year + Director */}
      {!isLiveForm&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          <Field label="IMDb Score"><input className="inp" type="number" min="0" max="10" step="0.1" value={form.score||0} onChange={e=>set("score",+e.target.value)}/></Field>
          <Field label="Year"><input className="inp" type="number" value={form.release_year||2026} onChange={e=>set("release_year",+e.target.value)}/></Field>
          <Field label="Director"><input className="inp" value={form.director||""} onChange={e=>set("director",e.target.value)} placeholder="Optional"/></Field>
        </div>
      )}

      {/* Tags */}
      <Field label="Tags (press Enter)" hint="e.g. 4K, HDR, NEW, DOLBY, EXCLUSIVE">
        <input className="inp" value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={addTag} placeholder="Type tag and press Enter..."/>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
          {(form.tags||[]).map(t=>(
            <span key={t} onClick={()=>set("tags",(form.tags||[]).filter(x=>x!==t))} style={{background:"rgba(229,9,20,.12)",color:R,fontSize:11,padding:"2px 8px",borderRadius:4,cursor:"pointer",border:"1px solid rgba(229,9,20,.2)"}}>{t} ×</span>
          ))}
        </div>
      </Field>

      {/* Toggles */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,padding:"12px 0",borderTop:"1px solid #1a1a2e"}}>
        {[["is_active","✅ Active — show to users"],["is_featured","⭐ Featured on Home"],["is_premium","👑 Premium Only"],["is_live","🔴 Live Stream"]].map(([k,l])=>(
          <label key={k} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer",color:"#aaa",padding:"3px 0"}}>
            <input type="checkbox" checked={!!form[k]} onChange={e=>set(k,e.target.checked)} style={{accentColor:R,width:15,height:15}}/>{l}
          </label>
        ))}
      </div>

      {/* Status indicator */}
      <div style={{background:"rgba(255,255,255,.02)",borderRadius:8,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,fontSize:12}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:titleOk&&(streamOk||embedOk)?"#00c853":"#f59e0b",flexShrink:0}}/>
        <div style={{color:titleOk&&(streamOk||embedOk)?"#00c853":"#f59e0b",fontWeight:600}}>
          {!titleOk?"Enter a title to continue":!(streamOk||embedOk)?"Add video URL or upload a file":"Ready to save ✓"}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{display:"flex",gap:10}}>
        <Btn onClick={onCancel} ghost sx={{flex:1}}>Cancel</Btn>
        <button
          onClick={save}
          disabled={saving||!canSave}
          style={{flex:2,background:saving||!canSave?"#1a1a2e":R,color:"#fff",border:"none",borderRadius:9,padding:"12px",fontSize:14,fontWeight:700,cursor:saving||!canSave?"not-allowed":"pointer",fontFamily:"'Inter',sans-serif",transition:"all .2s"}}
        >
          {saving?"Saving...":initial?.id?"Update Content":"Save Content"}
        </button>
      </div>
    </div>
  );
}

/* ── Content List ── */
function ContentList({content,isLiveList=false,onRefresh,showToast}){
  const[modal,  setModal]  =useState(null);
  const[search, setSearch] =useState("");
  const[saving, setSaving] =useState(false);
  const[confirm,setConfirm]=useState(null);
  const[filter, setFilter] =useState("all");

  const items=(content||[]).filter(c=>{
    const ms=!search||c.title?.toLowerCase().includes(search.toLowerCase());
    const mf=filter==="all"?true:filter==="active"?c.is_active:filter==="featured"?c.is_featured:filter==="premium"?c.is_premium:!c.is_active;
    return ms&&mf;
  });

  async function handleSave(form){
    setSaving(true);
    try{
      if(modal?.id){await db.updateContent(modal.id,form);showToast("Content updated!");}
      else{await db.addContent(form);showToast("Added! Live on home page now.");}
      setModal(null);onRefresh();
    }catch(e){showToast("Error: "+e.message,"err");}
    setSaving(false);
  }

  async function realDelete(c){
    try{
      const{error}=await supabase.from("content").delete().eq("id",c.id);
      if(error)throw error;
      showToast("Deleted: "+c.title);setConfirm(null);onRefresh();
    }catch(e){showToast("Delete failed: "+e.message,"err");}
  }

  return(
    <div style={{animation:"fadeIn .3s ease"}}>
      {confirm&&(
        <Modal title="Confirm Delete" onClose={()=>setConfirm(null)}>
          <div style={{textAlign:"center",padding:"8px 0"}}>
            <div style={{fontSize:48,marginBottom:12}}>🗑️</div>
            <div style={{fontWeight:700,fontSize:16,marginBottom:8}}>Delete "{confirm.title}"?</div>
            <div style={{fontSize:13,color:"#666688",marginBottom:24,lineHeight:1.5}}>Permanently removes from database. Cannot undo.</div>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <Btn onClick={()=>setConfirm(null)} ghost>Cancel</Btn>
              <Btn onClick={()=>realDelete(confirm)} danger>Yes, Delete</Btn>
            </div>
          </div>
        </Modal>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:1}}>{isLiveList?"Live Channels":"Movies & Series"}</div>
          <div style={{fontSize:12,color:"#444466",marginTop:2}}>{items.length} items</div>
        </div>
        <Btn onClick={()=>setModal({})}>+ Add {isLiveList?"Channel":"Content"}</Btn>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        {[["all","All"],["active","Active"],["featured","⭐ Featured"],["premium","👑 Premium"],["hidden","Hidden"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setFilter(id)} style={{background:filter===id?"rgba(229,9,20,.15)":"rgba(255,255,255,.04)",border:`1px solid ${filter===id?"rgba(229,9,20,.3)":"#1a1a2e"}`,color:filter===id?R:"#555577",borderRadius:20,padding:"5px 14px",fontSize:12,cursor:"pointer",fontWeight:filter===id?700:400,fontFamily:"'Inter',sans-serif"}}>{lbl}</button>
        ))}
        <input className="inp" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{maxWidth:200,marginLeft:"auto"}}/>
      </div>
      <div className="card" style={{overflow:"hidden"}}>
        {items.length===0?(
          <div style={{textAlign:"center",padding:"56px 0",color:"#333355"}}>
            <div style={{fontSize:48,marginBottom:14,opacity:.4}}>{isLiveList?"🔴":"🎬"}</div>
            <div style={{fontSize:15,marginBottom:18}}>No {isLiveList?"channels":"content"} yet</div>
            <Btn onClick={()=>setModal({})}>+ Add First {isLiveList?"Channel":"Content"}</Btn>
          </div>
        ):(
          <div style={{overflowX:"auto"}}>
            <table className="tbl">
              <thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Views</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map(c=>(
                  <tr key={c.id}>
                    <td>
                      <div style={{display:"flex",alignItems:"center",gap:12}}>
                        {c.thumbnail?<img src={c.thumbnail} alt="" style={{width:58,height:36,objectFit:"cover",borderRadius:6,flexShrink:0}} onError={e=>e.target.style.display="none"}/>:<div style={{width:58,height:36,borderRadius:6,background:"#0c0c1e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{isLiveList?"🔴":"🎬"}</div>}
                        <div style={{minWidth:0}}>
                          <div style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:180}}>{c.title}</div>
                          <div style={{fontSize:10,color:"#333355",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:180}}>{c.stream_url||c.embed_url||<span style={{color:"#f87171"}}>⚠️ No URL</span>}</div>
                        </div>
                      </div>
                    </td>
                    <td><Chip label={c.type||"Movie"} color={BL}/></td>
                    <td><div style={{display:"flex",gap:4,flexWrap:"wrap"}}><Chip label={c.is_active?"ON":"OFF"} color={c.is_active?"#00c853":"#555577"}/>{c.is_featured&&<Chip label="⭐" color="#f59e0b"/>}{c.is_premium&&<Chip label="👑" color={R}/>}{c.is_live&&<Chip label="🔴" color={R}/>}</div></td>
                    <td style={{color:BL,fontSize:12,fontWeight:600}}>{fN(c.views||0)}</td>
                    <td>
                      <div style={{display:"flex",gap:4}}>
                        <Btn onClick={()=>setModal(c)} outline small>Edit</Btn>
                        <Btn onClick={async()=>{await db.updateContent(c.id,{is_featured:!c.is_featured});showToast(c.is_featured?"Removed":"⭐ Featured!");onRefresh();}} outline small color="#f59e0b">{c.is_featured?"★":"☆"}</Btn>
                        <Btn onClick={async()=>{await db.updateContent(c.id,{is_active:!c.is_active});showToast(c.is_active?"Hidden":"Visible ✓");onRefresh();}} outline small color={c.is_active?R:"#00c853"}>{c.is_active?"Hide":"Show"}</Btn>
                        <Btn onClick={()=>setConfirm(c)} danger small>Del</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal!==null&&(
        <Modal title={modal?.id?(isLiveList?"Edit Channel":"Edit Content"):(isLiveList?"Add Live Channel":"Add Content")} onClose={()=>setModal(null)} wide>
          <ContentForm initial={modal} isLiveForm={isLiveList} onSave={handleSave} onCancel={()=>setModal(null)} saving={saving}/>
        </Modal>
      )}
    </div>
  );
}

/* ── Users ── */
function UsersPage({users,onRefresh,showToast}){
  const[search,setSearch]=useState("");
  const[filter,setFilter]=useState("all");
  const[drawer,setDrawer]=useState(null);
  const filtered=(users||[]).filter(u=>{
    const ms=!search||u.name?.toLowerCase().includes(search.toLowerCase())||u.phone?.includes(search)||u.email?.toLowerCase().includes(search.toLowerCase());
    const mf=filter==="all"?true:filter==="premium"?(u.plan?.includes("premium")||u.plan==="premium"):filter==="admin"?u.role==="admin":!u.is_active;
    return ms&&mf;
  });
  return(
    <div style={{animation:"fadeIn .3s ease"}}>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:1,marginBottom:14}}>User Management</div>
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        {[["all","All"],["premium","👑 Premium"],["admin","⚡ Admins"],["suspended","🚫 Suspended"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setFilter(id)} style={{background:filter===id?"rgba(229,9,20,.15)":"rgba(255,255,255,.04)",border:`1px solid ${filter===id?"rgba(229,9,20,.3)":"#1a1a2e"}`,color:filter===id?R:"#555577",borderRadius:20,padding:"5px 14px",fontSize:12,cursor:"pointer",fontWeight:filter===id?700:400,fontFamily:"'Inter',sans-serif"}}>{lbl}</button>
        ))}
        <input className="inp" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, phone, email..." style={{maxWidth:260,marginLeft:"auto"}}/>
      </div>
      <div className="card" style={{overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table className="tbl">
            <thead><tr><th>User</th><th>Contact</th><th>Plan</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(u=>(
                <tr key={u.id}>
                  <td>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:34,height:34,borderRadius:"50%",background:`hsl(${u.name?.charCodeAt(0)*9||0},40%,22%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,flexShrink:0,border:"1px solid #1a1a2e"}}>
                        {u.name?.[0]?.toUpperCase()||"?"}
                      </div>
                      <span style={{fontWeight:600,fontSize:13}}>{u.name||"Unknown"}</span>
                    </div>
                  </td>
                  <td style={{color:"#555577",fontSize:12}}>{u.phone||u.email||"—"}</td>
                  <td><Chip label={(u.plan||"free").toUpperCase()} color={u.plan?.includes("premium")||u.plan==="premium"?R:u.plan?.includes("basic")?"#8b5cf6":"#444466"}/></td>
                  <td><Chip label={u.is_active?"ACTIVE":"SUSPENDED"} color={u.is_active?"#00c853":"#f87171"}/></td>
                  <td style={{color:"#444466",fontSize:11}}>{new Date(u.created_at).toLocaleDateString("en-IN")}</td>
                  <td>
                    <div style={{display:"flex",gap:4}}>
                      <Btn onClick={()=>setDrawer(u)} outline small>View</Btn>
                      {u.is_active?<Btn onClick={async()=>{await db.suspendUser(u.id);showToast("Suspended","warn");onRefresh();}} danger small>Suspend</Btn>:<Btn onClick={async()=>{await db.activateUser(u.id);showToast("Activated");onRefresh();}} outline small color="#00c853">Activate</Btn>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {drawer&&(
        <>
          <div style={{position:"fixed",inset:0,zIndex:900,background:"rgba(0,0,0,.6)",backdropFilter:"blur(4px)"}} onClick={()=>setDrawer(null)}/>
          <div style={{position:"fixed",top:0,right:0,bottom:0,width:"clamp(280px,35vw,360px)",zIndex:901,background:"#0c0c1e",borderLeft:"1px solid #1a1a2e",overflowY:"auto",padding:22,animation:"slideUp .2s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:22}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20}}>User Detail</div>
              <Btn onClick={()=>setDrawer(null)} ghost small sx={{fontSize:16}}>✕</Btn>
            </div>
            <div style={{textAlign:"center",marginBottom:22}}>
              <div style={{width:70,height:70,borderRadius:"50%",background:`hsl(${drawer.name?.charCodeAt(0)*9||0},40%,22%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:700,margin:"0 auto 12px",border:`2px solid ${R}`}}>
                {drawer.name?.[0]?.toUpperCase()||"?"}
              </div>
              <div style={{fontWeight:700,fontSize:17}}>{drawer.name||"Unknown"}</div>
              <div style={{fontSize:12,color:"#555577",marginTop:4}}>{drawer.phone||drawer.email||"No contact"}</div>
            </div>
            {[["Plan",(drawer.plan||"free").toUpperCase()],["Role",(drawer.role||"user").toUpperCase()],["Status",drawer.is_active?"✅ Active":"🚫 Suspended"],["Joined",new Date(drawer.created_at).toLocaleDateString("en-IN")]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #1a1a2e22",fontSize:13}}>
                <span style={{color:"#444466"}}>{k}</span><span style={{fontWeight:600}}>{v}</span>
              </div>
            ))}
            <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:20}}>
              {drawer.is_active?<Btn onClick={async()=>{await db.suspendUser(drawer.id);showToast("Suspended","warn");setDrawer(null);onRefresh();}} danger sx={{width:"100%"}}>🚫 Suspend</Btn>:<Btn onClick={async()=>{await db.activateUser(drawer.id);showToast("Activated");setDrawer(null);onRefresh();}} outline color="#00c853" sx={{width:"100%"}}>✅ Activate</Btn>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Ads ── */
function AdsPage({ads,onRefresh,showToast}){
  const[modal,setModal]=useState(null);
  const[form,setForm]=useState({brand:"",tagline:"",cta_text:"Learn More",type:"pre_roll",duration:15,skip_after:5,is_active:true,priority:1});
  const[saving,setSaving]=useState(false);
  async function save(){
    if(!form.brand){showToast("Brand required","err");return;}
    setSaving(true);
    try{if(modal?.id){await db.updateAd(modal.id,form);showToast("Updated!");}else{await db.addAd(form);showToast("Ad created!");}setModal(null);onRefresh();}
    catch(e){showToast("Error: "+e.message,"err");}
    setSaving(false);
  }
  return(
    <div style={{animation:"fadeIn .3s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:18}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:1}}>Ad Manager</div>
        <Btn onClick={()=>{setForm({brand:"",tagline:"",cta_text:"Learn More",type:"pre_roll",duration:15,skip_after:5,is_active:true,priority:1});setModal({});}}>+ New Ad</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12,marginBottom:20}}>
        <KPI icon="📢" label="Total"    value={(ads||[]).length}                               color="#f59e0b"/>
        <KPI icon="✅" label="Active"   value={(ads||[]).filter(a=>a.is_active).length}        color="#00c853"/>
        <KPI icon="🎯" label="Pre-roll" value={(ads||[]).filter(a=>a.type==="pre_roll").length} color={R}/>
        <KPI icon="🎬" label="Mid-roll" value={(ads||[]).filter(a=>a.type==="mid_roll").length} color={BL}/>
      </div>
      <div className="card" style={{overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table className="tbl">
            <thead><tr><th>Brand</th><th>Type</th><th>Duration</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {(ads||[]).map(a=>(
                <tr key={a.id}>
                  <td><div style={{fontWeight:600}}>{a.brand}</div><div style={{fontSize:10,color:"#444466"}}>{a.tagline}</div></td>
                  <td><Chip label={a.type?.replace("_"," ").toUpperCase()} color={BL}/></td>
                  <td style={{fontSize:12}}>{a.duration||0}s · skip {a.skip_after||5}s</td>
                  <td><Chip label={a.is_active?"ACTIVE":"PAUSED"} color={a.is_active?"#00c853":"#f59e0b"}/></td>
                  <td>
                    <div style={{display:"flex",gap:4}}>
                      <Btn onClick={()=>{setForm({...a});setModal(a);}} outline small>Edit</Btn>
                      <Btn onClick={async()=>{await db.updateAd(a.id,{is_active:!a.is_active});showToast(a.is_active?"Paused":"Active");onRefresh();}} outline small color={a.is_active?R:"#00c853"}>{a.is_active?"Pause":"Resume"}</Btn>
                      <Btn onClick={async()=>{try{await supabase.from("ads").delete().eq("id",a.id);showToast("Deleted");onRefresh();}catch(e){showToast("Failed","err");}}} danger small>Del</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal!==null&&(
        <Modal title={modal?.id?"Edit Ad":"New Ad"} onClose={()=>setModal(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {[["Brand *","brand"],["Tagline","tagline"],["CTA Text","cta_text"]].map(([l,k])=>(
              <Field key={k} label={l}><input className="inp" value={form[k]||""} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/></Field>
            ))}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <Field label="Type"><select className="inp" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}><option value="pre_roll">Pre-roll</option><option value="mid_roll">Mid-roll</option><option value="banner">Banner</option></select></Field>
              <Field label="Duration(s)"><input className="inp" type="number" value={form.duration||15} onChange={e=>setForm(f=>({...f,duration:+e.target.value}))}/></Field>
              <Field label="Skip After(s)"><input className="inp" type="number" value={form.skip_after||5} onChange={e=>setForm(f=>({...f,skip_after:+e.target.value}))}/></Field>
            </div>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer",color:"#aaa"}}><input type="checkbox" checked={!!form.is_active} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))} style={{accentColor:R}}/>Active</label>
            <div style={{display:"flex",gap:10}}>
              <Btn onClick={()=>setModal(null)} ghost sx={{flex:1}}>Cancel</Btn>
              <button onClick={save} disabled={saving} style={{flex:2,background:saving?"#1a1a2e":R,color:"#fff",border:"none",borderRadius:9,padding:"11px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>{saving?"Saving...":modal?.id?"Update":"Create"}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── Revenue ── */
function RevenuePage({stats,users}){
  const premium=(users||[]).filter(u=>u.plan?.includes("premium")||u.plan==="premium");
  const basic  =(users||[]).filter(u=>u.plan?.includes("basic"));
  const mobile =(users||[]).filter(u=>u.plan?.includes("mobile"));
  const free   =(users||[]).filter(u=>!u.plan||u.plan==="free");
  const monthly=premium.length*499+basic.length*299+mobile.length*149;
  const total  =(users||[]).length||1;
  return(
    <div style={{animation:"fadeIn .3s ease"}}>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:1,marginBottom:20}}>Revenue & Subscriptions</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:24}}>
        <KPI icon="💰" label="Total Revenue"  value={"₹"+fN(stats.totalRevenue||0)} color="#00c853"/>
        <KPI icon="📅" label="Est. Monthly"   value={"₹"+fN(monthly)}               color={BL}/>
        <KPI icon="👑" label="Premium"        value={premium.length}                 color={R}/>
        <KPI icon="🆓" label="Free Users"     value={free.length}                    color="#444466"/>
      </div>
      <div className="card" style={{padding:22}}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>Subscription Breakdown</div>
        {[
          {label:"Premium ₹499/mo",count:premium.length,color:R,rev:premium.length*499},
          {label:"Basic ₹299/mo",  count:basic.length,  color:"#8b5cf6",rev:basic.length*299},
          {label:"Mobile ₹149/mo", count:mobile.length, color:"#3b82f6",rev:mobile.length*149},
          {label:"Free",           count:free.length,   color:"#444466",rev:0},
        ].map(p=>(
          <div key={p.label} style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <span style={{fontSize:13,fontWeight:600}}>{p.label}</span>
              <span style={{fontSize:12,color:"#444466"}}>{p.count} users · ₹{fN(p.rev)}/mo</span>
            </div>
            <div style={{height:8,background:"#1a1a2e",borderRadius:4,overflow:"hidden"}}>
              <div style={{height:"100%",width:Math.round((p.count/total)*100)+"%",background:p.color,borderRadius:4,minWidth:p.count>0?8:0}}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Analytics ── */
function AnalyticsPage({stats,content}){
  const top=[...(content||[])].sort((a,b)=>(b.views||0)-(a.views||0));
  const totalV=top.reduce((s,c)=>s+(c.views||0),0);
  return(
    <div style={{animation:"fadeIn .3s ease"}}>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:1,marginBottom:20}}>Analytics</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:24}}>
        <KPI icon="👁️" label="Total Views"  value={fN(stats.totalViews||0)}                              color="#a855f7"/>
        <KPI icon="🎬" label="Movies"        value={(content||[]).filter(c=>c.type==="Movie").length}     color={BL}/>
        <KPI icon="📺" label="Web Series"    value={(content||[]).filter(c=>c.type==="Web Series").length} color="#f59e0b"/>
        <KPI icon="🔴" label="Live"          value={(content||[]).filter(c=>c.is_live||c.type==="Live").length} color={R}/>
      </div>
      <div className="card" style={{padding:22}}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:18}}>Top Content Performance</div>
        {top.slice(0,10).map((c,i)=>{
          const pct=totalV>0?((c.views||0)/totalV)*100:0;
          const col=i===0?R:i===1?"#f59e0b":i===2?BL:"#444466";
          return(
            <div key={c.id} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,color:col,width:20}}>{i+1}</span>
                  <span style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"clamp(120px,30vw,240px)"}}>{c.title}</span>
                </div>
                <span style={{fontSize:12,color:col,fontWeight:700,flexShrink:0,marginLeft:8}}>{fN(c.views||0)}</span>
              </div>
              <div style={{height:6,background:"#1a1a2e",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:pct+"%",background:col,borderRadius:3,minWidth:c.views>0?6:0}}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Admin ── */
export default function Admin({onNavigate,user}){
  const[verified, setVerified]=useState(false);
  const[showFace, setShowFace]=useState(true);
  const[page,     setPage]    =useState("dashboard");
  const[collapsed,setCollapsed]=useState(false);
  const[stats,    setStats]   =useState({});
  const[content,  setContent] =useState([]);
  const[users,    setUsers]   =useState([]);
  const[ads,      setAds]     =useState([]);
  const[loading,  setLoading] =useState(true);
  const[toast,    setToast]   =useState(null);

  const showToast=(msg,type="ok")=>{setToast({msg,type});setTimeout(()=>setToast(null),3500);};

  useEffect(()=>{if(verified)loadData();},[verified]);

  useEffect(()=>{
    if(!verified)return;
    const ch=supabase.channel("admin-rt").on("postgres_changes",{event:"*",schema:"public",table:"content"},()=>loadData()).subscribe();
    return()=>supabase.removeChannel(ch);
  },[verified]);

  async function loadData(){
    setLoading(true);
    try{
      const[s,c,u,a]=await Promise.all([
        db.getAdminStats().catch(()=>({})),
        supabase.from("content").select("*").order("created_at",{ascending:false}).then(r=>r.data||[]),
        db.getAllUsers().catch(()=>[]),
        db.getAllAds().catch(()=>[]),
      ]);
      setStats(s);setContent(c);setUsers(u);setAds(a);
    }catch(e){}
    setLoading(false);
  }

  if(showFace&&!verified) return <FaceAuth user={user} onSuccess={()=>{setVerified(true);setShowFace(false);}} onSkip={()=>{setVerified(true);setShowFace(false);}}/>;

  if(loading) return(
    <div style={{minHeight:"100vh",background:"#060610",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,fontFamily:"Inter,sans-serif"}}>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:2}}><span style={{color:R}}>STREAM</span>X</div>
      <div style={{width:40,height:40,border:"3px solid #1a1a2e",borderTop:`3px solid ${R}`,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
      <style>{CSS}</style>
    </div>
  );

  const liveContent =content.filter(c=>c.is_live||c.type==="Live");
  const movieContent=content.filter(c=>!c.is_live&&c.type!=="Live");

  return(
    <div style={{display:"flex",height:"100vh",background:"#060610",overflow:"hidden",fontFamily:"'Inter',sans-serif"}}>
      <style>{CSS}</style>
      {toast&&<ToastMsg msg={toast.msg} type={toast.type}/>}

      {/* Sidebar */}
      <div style={{width:collapsed?52:200,flexShrink:0,background:"#0a0a18",borderRight:"1px solid #1a1a2e",display:"flex",flexDirection:"column",transition:"width .22s",overflow:"hidden"}}>
        <div style={{padding:collapsed?"12px 10px":"12px 16px",borderBottom:"1px solid #1a1a2e",display:"flex",alignItems:"center",gap:10,cursor:"pointer",flexShrink:0}} onClick={()=>setCollapsed(o=>!o)}>
          <div style={{width:28,height:28,borderRadius:8,background:"rgba(229,9,20,.15)",border:"1px solid rgba(229,9,20,.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>⚡</div>
          {!collapsed&&<div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:1,whiteSpace:"nowrap"}}><span style={{color:R}}>STREAM</span>X</div>}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"8px 6px"}}>
          {PAGES.map(p=>(
            <div key={p.id} className={`nav${page===p.id?" on":""}`} onClick={()=>setPage(p.id)} style={{justifyContent:collapsed?"center":"flex-start"}} title={collapsed?p.label:undefined}>
              <span style={{fontSize:15,flexShrink:0}}>{p.icon}</span>
              {!collapsed&&<span>{p.label}</span>}
              {!collapsed&&p.id==="live"&&liveContent.length>0&&<span style={{marginLeft:"auto",background:R,color:"#fff",fontSize:9,fontWeight:800,padding:"1px 6px",borderRadius:10,animation:"pulse 1.5s infinite"}}>{liveContent.length}</span>}
            </div>
          ))}
        </div>
        <div style={{padding:"6px",borderTop:"1px solid #1a1a2e",flexShrink:0}}>
          <div className="nav" onClick={loadData} style={{color:BL,justifyContent:collapsed?"center":"flex-start"}}><span style={{fontSize:15}}>↻</span>{!collapsed&&<span style={{fontSize:12}}>Refresh</span>}</div>
          <div className="nav" onClick={()=>onNavigate("home")} style={{color:"#f87171",justifyContent:collapsed?"center":"flex-start"}}><span style={{fontSize:15}}>🏠</span>{!collapsed&&<span style={{fontSize:12}}>Back to Home</span>}</div>
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,overflow:"hidden"}}>
        <div style={{height:50,background:"#0a0a18",borderBottom:"1px solid #1a1a2e",display:"flex",alignItems:"center",padding:"0 20px",gap:12,flexShrink:0}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:1,color:"#333355"}}>{PAGES.find(p=>p.id===page)?.icon} {PAGES.find(p=>p.id===page)?.label}</div>
          <div style={{flex:1}}/>
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#444466"}}><div style={{width:6,height:6,borderRadius:"50%",background:"#00c853",animation:"pulse 2s infinite"}}/>Secured</div>
          <span style={{fontSize:11,color:"#444466"}}>👑 {user?.name||"Admin"}</span>
          <Btn onClick={loadData} ghost small>↻</Btn>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"clamp(14px,3vw,22px)"}}>

          {/* Dashboard */}
          {page==="dashboard"&&(
            <div style={{animation:"fadeIn .3s ease"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:1,marginBottom:20}}>Dashboard</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:14,marginBottom:24}}>
                <KPI icon="👥" label="Total Users"  value={fN(stats.totalUsers)}       color={BL}/>
                <KPI icon="👑" label="Paid Subs"    value={fN(stats.activeSubs)}       color={R}/>
                <KPI icon="💰" label="Revenue"      value={"₹"+fN(stats.totalRevenue)} color="#00c853"/>
                <KPI icon="👁️" label="Total Views" value={fN(stats.totalViews)}       color="#a855f7"/>
                <KPI icon="🎬" label="Content"      value={stats.totalContent||0}      color="#06b6d4"/>
                <KPI icon="📢" label="Active Ads"   value={stats.activeAds||0}         color="#f59e0b"/>
                <KPI icon="🔴" label="Live Now"     value={liveContent.filter(c=>c.is_active).length} color={R}/>
                <KPI icon="🆓" label="Free Users"   value={fN((users||[]).filter(u=>!u.plan||u.plan==="free").length)} color="#444466"/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                <div className="card" style={{padding:20}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:16}}>🔥 Top Content</div>
                  {[...content].sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,5).map((c,i)=>(
                    <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<4?"1px solid #1a1a2e":"none"}}>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:i===0?R:"#333355",width:22,flexShrink:0}}>{i+1}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title}</div>
                        <div style={{fontSize:10,color:"#444466"}}>{c.type} · {c.genre}</div>
                      </div>
                      <div style={{fontSize:11,color:BL,fontWeight:600,flexShrink:0}}>{fN(c.views||0)}</div>
                    </div>
                  ))}
                </div>
                <div className="card" style={{padding:20}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:16}}>👥 Recent Users</div>
                  {[...users].slice(0,5).map((u,i)=>(
                    <div key={u.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<4?"1px solid #1a1a2e":"none"}}>
                      <div style={{width:32,height:32,borderRadius:"50%",background:`hsl(${u.name?.charCodeAt(0)*9||0},40%,22%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,flexShrink:0,border:"1px solid #1a1a2e"}}>
                        {u.name?.[0]?.toUpperCase()||"?"}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600}}>{u.name||"Unknown"}</div>
                        <div style={{fontSize:10,color:"#444466"}}>{u.phone||u.email||"—"}</div>
                      </div>
                      <Chip label={(u.plan||"free").toUpperCase()} color={u.plan?.includes("premium")||u.plan==="premium"?R:"#444466"}/>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {page==="content"   &&<ContentList content={movieContent} isLiveList={false} onRefresh={loadData} showToast={showToast}/>}
          {page==="live"      &&<ContentList content={liveContent}  isLiveList={true}  onRefresh={loadData} showToast={showToast}/>}
          {page==="users"     &&<UsersPage users={users} onRefresh={loadData} showToast={showToast}/>}
          {page==="ads"       &&<AdsPage ads={ads} onRefresh={loadData} showToast={showToast}/>}
          {page==="revenue"   &&<RevenuePage stats={stats} users={users}/>}
          {page==="analytics" &&<AnalyticsPage stats={stats} content={content} users={users}/>}

          {page==="settings"&&(
            <div style={{animation:"fadeIn .3s ease",maxWidth:580}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:1,marginBottom:20}}>Settings</div>
              <div className="card" style={{padding:22,marginBottom:14}}>
                {[["Name",user?.name||"Admin"],["Phone",user?.phone||"—"],["Role","Administrator ⚡"],["Database","Supabase PostgreSQL"],["Auth","Mobile OTP + Face ID"],["Version","StreamX v4.0"]].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #1a1a2e22",fontSize:13}}>
                    <span style={{color:"#444466"}}>{k}</span>
                    <span style={{fontWeight:500,color:"#7bb3ff",fontSize:12}}>{v}</span>
                  </div>
                ))}
              </div>
              <button onClick={()=>{setVerified(false);onNavigate("home");}} style={{width:"100%",background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.25)",color:"#f87171",borderRadius:11,padding:"13px",fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:600,cursor:"pointer"}}>
                Sign Out of Admin
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}