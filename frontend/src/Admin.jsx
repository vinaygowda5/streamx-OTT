import { useState, useEffect, useRef } from "react";
import { supabase, db } from "./supabase.js";
import Hls from "hls.js";
import FaceAuth from "./FaceAuth.jsx";

const R = "#e50914";
const GS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{background:#07070c;color:#e2e2ee;font-family:'Inter',sans-serif;}
::-webkit-scrollbar{width:3px;height:3px;}
::-webkit-scrollbar-thumb{background:#e50914;border-radius:2px;}
@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
@keyframes spin{to{transform:rotate(360deg);}}
@keyframes slideUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
.tbl{width:100%;border-collapse:collapse;}
.tbl th{padding:9px 12px;text-align:left;font-size:10px;color:#555;font-weight:700;text-transform:uppercase;letter-spacing:.6px;border-bottom:1px solid #1a1a26;}
.tbl td{padding:9px 12px;font-size:13px;border-bottom:1px solid #13131f;}
.tbl tr:hover td{background:rgba(255,255,255,.02);}
.inp{width:100%;background:#0a0a14;border:1px solid #1a1a2c;border-radius:8px;color:#e2e2ee;font-family:'Inter',sans-serif;font-size:13px;padding:9px 12px;outline:none;transition:border-color .2s;}
.inp:focus{border-color:#e50914;}
.inp::placeholder{color:#2a2a3a;}
.nav{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:9px;cursor:pointer;font-size:12.5px;font-weight:500;color:#4a4a6a;transition:all .15s;white-space:nowrap;}
.nav:hover{background:rgba(255,255,255,.04);color:#8888bb;}
.nav.on{background:rgba(229,9,20,.1);color:#e50914;font-weight:700;}
.card{background:#0e0e18;border:1px solid #191926;border-radius:12px;}
.upload-zone{border:2px dashed #1a1a2c;border-radius:10px;padding:28px 16px;text-align:center;cursor:pointer;transition:all .2s;background:#0a0a14;}
.upload-zone:hover{border-color:#e50914;background:rgba(229,9,20,.04);}
`;

const PAGES=[
  {id:"overview",icon:"📊",label:"Overview"},
  {id:"content", icon:"🎬",label:"Movies & Series"},
  {id:"live",    icon:"🔴",label:"Live Channels"},
  {id:"users",   icon:"👥",label:"Users"},
  {id:"ads",     icon:"📢",label:"Ads"},
  {id:"settings",icon:"⚙️",label:"Settings"},
];

const TYPES  =["Movie","Series","Documentary","Short Film"];
const GENRES =["Action","Drama","Sci-Fi","Thriller","Comedy","Romance","Kids","Cricket","Football","Racing","News","Documentary","Nature","Horror","Sports","Music"];
const LANGS  =["Hindi","English","Kannada","Tamil","Telugu","Bengali","Malayalam","Punjabi","Marathi","Gujarati","Odia"];
const RATINGS=["U","U/A","U/A 7+","U/A 13+","U/A 16+","A"];

function Chip({label,color="#888"}){
  return <span style={{background:`${color}22`,color,fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:20,border:`1px solid ${color}33`}}>{label}</span>;
}

function Btn({children,onClick,color=R,outline,danger,small,disabled,style:sx={}}){
  return <button disabled={disabled} onClick={onClick} style={{background:danger?"rgba(248,113,113,.1)":outline?`${color}18`:color,border:`1px solid ${danger?"rgba(248,113,113,.3)":outline?color+"55":"transparent"}`,color:outline||danger?(danger?"#f87171":color):"#fff",borderRadius:7,padding:small?"4px 10px":"7px 14px",fontSize:small?11:12.5,fontWeight:600,cursor:disabled?"not-allowed":"pointer",fontFamily:"'Inter',sans-serif",transition:"all .15s",whiteSpace:"nowrap",opacity:disabled?.6:1,...sx}}>{children}</button>;
}

function Modal({title,onClose,children,wide}){
  useEffect(()=>{const fn=e=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",fn);return()=>window.removeEventListener("keydown",fn);},[]);
  return(
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,.88)",display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(4px)"}} onClick={onClose}>
      <div style={{background:"#111122",border:"1px solid #1a1a26",borderRadius:14,width:"100%",maxWidth:wide?640:480,maxHeight:"90vh",overflowY:"auto",animation:"slideUp .2s ease"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:"1px solid #1a1a26",position:"sticky",top:0,background:"#111122",zIndex:1}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:1}}>{title}</div>
          <Btn onClick={onClose} outline small>✕</Btn>
        </div>
        <div style={{padding:"18px 20px"}}>{children}</div>
      </div>
    </div>
  );
}

function Field({label,required,children,hint}){
  return(
    <div>
      <label style={{fontSize:10,color:"#555",fontWeight:700,letterSpacing:.5,textTransform:"uppercase",display:"block",marginBottom:5}}>
        {label}{required&&<span style={{color:R}}> *</span>}
      </label>
      {children}
      {hint&&<div style={{fontSize:11,color:"#333",marginTop:4}}>{hint}</div>}
    </div>
  );
}

function KPI({icon,label,value,color=R}){
  return(
    <div className="card" style={{padding:"16px 18px",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:0,left:0,width:3,height:"100%",background:color}}/>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
        <span style={{fontSize:10,color:"#555",fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>{label}</span>
        <span style={{fontSize:18}}>{icon}</span>
      </div>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:"#fff"}}>{value}</div>
    </div>
  );
}

function ToastMsg({msg,type="ok"}){
  return(
    <div style={{position:"fixed",bottom:20,right:20,zIndex:2000,background:"#111122",border:`1px solid ${type==="err"?"rgba(248,113,113,.3)":"rgba(0,200,83,.3)"}`,borderLeft:`3px solid ${type==="err"?"#f87171":"#00c853"}`,borderRadius:9,padding:"11px 18px",fontSize:13,fontWeight:500,animation:"slideUp .2s ease",boxShadow:"0 8px 32px rgba(0,0,0,.6)",maxWidth:300}}>
      {type==="err"?"❌ ":"✅ "}{msg}
    </div>
  );
}

/* ── SMALL PREVIEW — paste URL → see stream instantly ── */
function SmallPreview({url,isLive=false}){
  const videoRef=useRef(null);
  const hlsRef=useRef(null);
  const[status,setStatus]=useState("loading");
  const isYT=url?.includes("youtube.com")||url?.includes("youtu.be");

  function toEmbed(u){
    try{
      if(u.includes("youtube.com/watch?v=")){const id=new URL(u).searchParams.get("v");return`https://www.youtube.com/embed/${id}?autoplay=1&mute=1&rel=0`;}
      if(u.includes("youtu.be/")){const id=u.split("youtu.be/")[1]?.split("?")[0];return`https://www.youtube.com/embed/${id}?autoplay=1&mute=1&rel=0`;}
    }catch(e){}
    return u;
  }

  useEffect(()=>{
    if(!url) return;
    if(isYT){setStatus("playing");return;}
    const v=videoRef.current; if(!v) return;
    setStatus("loading");
    try{
      if(Hls.isSupported()){
        if(hlsRef.current) hlsRef.current.destroy();
        const hls=new Hls({enableWorker:true,lowLatencyMode:true});
        hlsRef.current=hls; hls.loadSource(url); hls.attachMedia(v);
        hls.on(Hls.Events.MANIFEST_PARSED,()=>{v.muted=true;v.play().catch(()=>{});setStatus("playing");});
        hls.on(Hls.Events.ERROR,(_,d)=>{if(d.fatal) setStatus("error");});
      } else if(v.canPlayType("application/vnd.apple.mpegurl")){
        v.src=url; v.muted=true; v.play().catch(()=>{}); setStatus("playing");
      } else {
        v.src=url; v.muted=true; v.play().catch(()=>{}); setStatus("playing");
      }
    }catch(e){setStatus("error");}
    return()=>{if(hlsRef.current){hlsRef.current.destroy();hlsRef.current=null;}};
  },[url]);

  return(
    <div style={{borderRadius:10,overflow:"hidden",background:"#000",border:"1px solid #1a1a26"}}>
      <div style={{paddingTop:"56.25%",position:"relative",background:"#000"}}>
        {isYT?(
          <iframe src={toEmbed(url)} style={{position:"absolute",inset:0,width:"100%",height:"100%",border:"none"}} allow="autoplay;encrypted-media" allowFullScreen/>
        ):(
          <>
            <video ref={videoRef} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"contain"}} playsInline muted autoPlay/>
            {status==="loading"&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"#000"}}><div style={{width:28,height:28,border:"2px solid #222",borderTop:`2px solid ${R}`,borderRadius:"50%",animation:"spin .8s linear infinite"}}/></div>}
            {status==="error"&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"#0a0a0f",flexDirection:"column",gap:8}}><div style={{fontSize:24}}>⚠️</div><div style={{fontSize:11,color:"#f87171",textAlign:"center",padding:"0 12px"}}>Stream error. Check URL.</div></div>}
          </>
        )}
        {isLive&&<div style={{position:"absolute",top:8,left:8,background:R,color:"#fff",fontSize:9,fontWeight:800,padding:"2px 8px",borderRadius:3,letterSpacing:2,zIndex:10,animation:"pulse 1.5s infinite"}}>● LIVE</div>}
        {status==="playing"&&!isYT&&<div style={{position:"absolute",bottom:8,right:8,background:"rgba(0,0,0,.7)",color:"#aaa",fontSize:10,padding:"2px 7px",borderRadius:4,zIndex:10}}>🔇 Preview</div>}
      </div>
      <div style={{background:"#0a0a14",padding:"5px 12px",display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:7,height:7,borderRadius:"50%",background:status==="playing"?"#00c853":status==="error"?"#f87171":"#f59e0b",flexShrink:0}}/>
        <div style={{fontSize:11,color:status==="playing"?"#00c853":status==="error"?"#f87171":"#f59e0b",fontWeight:600}}>
          {status==="playing"?"✓ Stream working":status==="error"?"✗ Stream error":"Connecting..."}
        </div>
      </div>
    </div>
  );
}

/* ── CONTENT FORM ── */
const EMPTY={title:"",description:"",type:"Movie",genre:"Action",language:"Hindi",is_premium:false,is_featured:false,is_active:true,is_live:false,stream_url:"",embed_url:"",thumbnail:"",release_year:new Date().getFullYear(),rating:"U/A",director:"",score:0,tags:[]};

function ContentForm({initial,isLiveForm=false,onSave,onCancel,saving}){
  const[form,     setForm]    =useState({...EMPTY,...(isLiveForm?{type:"Live",is_live:true}:{}),...initial});
  const[srcTab,   setSrcTab]  =useState("url");
  const[uploading,setUploading]=useState(false);
  const[uploadPct,setUploadPct]=useState(0);
  const[tagInput, setTagInput]=useState("");
  const[previewUrl,setPreviewUrl]=useState(initial?.stream_url||initial?.embed_url||"");
  const fileRef=useRef(); const thumbRef=useRef();

  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const canSave=form.title&&(form.stream_url||form.embed_url);

  function handleUrlChange(val,field){
    set(field,val);
    if(val.length>10) setPreviewUrl(val);
    else setPreviewUrl("");
  }

  function addTag(e){
    if(e.key==="Enter"&&tagInput.trim()){set("tags",[...(form.tags||[]),tagInput.trim().toUpperCase()]);setTagInput("");}
  }

  async function uploadFile(file,isThumb=false){
    if(!file) return;
    const maxSize=isThumb?5*1024*1024:500*1024*1024;
    if(file.size>maxSize){alert(`Max ${isThumb?"5MB":"500MB"}`);return;}
    setUploading(true);setUploadPct(0);
    try{
      const ext=file.name.split(".").pop();
      const path=`${isThumb?"thumbnails":"videos"}/${Date.now()}.${ext}`;
      const{data,error}=await supabase.storage.from("streamx-media").upload(path,file,{
        cacheControl:"3600",upsert:false,
        onUploadProgress:(e)=>setUploadPct(Math.round((e.loaded/e.total)*100)),
      });
      if(error) throw error;
      const{data:ud}=supabase.storage.from("streamx-media").getPublicUrl(path);
      const pub=ud.publicUrl;
      if(isThumb){set("thumbnail",pub);}
      else{set("stream_url",pub);setPreviewUrl(pub);setSrcTab("url");}
    }catch(e){alert("Upload failed: "+e.message+"\n\nCreate Supabase Storage bucket 'streamx-media' (public)");}
    setUploading(false);setUploadPct(0);
  }

  function processYT(url){
    try{
      if(url.includes("youtube.com/watch?v=")){const id=new URL(url).searchParams.get("v");return`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;}
      if(url.includes("youtu.be/")){const id=url.split("youtu.be/")[1]?.split("?")[0];return`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;}
    }catch(e){}
    return url;
  }

  function handleSave(){
    const data={...form};
    if(data.embed_url) data.embed_url=processYT(data.embed_url);
    onSave(data);
  }

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
        <Field label="Title" required>
          <input className="inp" value={form.title} onChange={e=>set("title",e.target.value)} placeholder={isLiveForm?"Channel name":"Movie or series title"} autoFocus/>
        </Field>
        {!isLiveForm&&(
          <Field label="Type">
            <select className="inp" value={form.type} onChange={e=>set("type",e.target.value)}>
              {TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </Field>
        )}
        {isLiveForm&&(
          <Field label="Genre">
            <select className="inp" value={form.genre} onChange={e=>set("genre",e.target.value)}>
              {["Cricket","Football","News","Racing","Kabaddi","Kids","Music","General"].map(g=><option key={g}>{g}</option>)}
            </select>
          </Field>
        )}
      </div>

      <Field label="Description">
        <textarea className="inp" rows={2} value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Short description..." style={{resize:"vertical"}}/>
      </Field>

      {/* VIDEO SOURCE */}
      <div style={{background:"rgba(229,9,20,.05)",border:"1px solid rgba(229,9,20,.15)",borderRadius:12,padding:16}}>
        <div style={{fontSize:12,color:R,fontWeight:700,marginBottom:12}}>
          {isLiveForm?"🔴 Live Stream URL":"🎬 Video Source"}
        </div>

        {/* Source tabs */}
        <div style={{display:"flex",gap:4,marginBottom:12,flexWrap:"wrap"}}>
          {[{id:"url",label:"🔗 URL"},{id:"youtube",label:"▶ YouTube"},{id:"upload",label:"📁 Upload"},{id:"drive",label:"☁️ Cloud"}].map(t=>(
            <button key={t.id} onClick={()=>setSrcTab(t.id)} style={{background:srcTab===t.id?"rgba(229,9,20,.2)":"rgba(255,255,255,.05)",border:`1px solid ${srcTab===t.id?"rgba(229,9,20,.4)":"#1a1a26"}`,color:srcTab===t.id?R:"#888",borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
              {t.label}
            </button>
          ))}
        </div>

        {srcTab==="url"&&(
          <Field label={isLiveForm?"HLS Live URL (.m3u8)":"HLS / MP4 / DASH URL"} hint="Supports: .m3u8, .mp4, .mpd">
            <input className="inp" value={form.stream_url} onChange={e=>handleUrlChange(e.target.value,"stream_url")} placeholder={isLiveForm?"https://example.com/live/stream.m3u8":"https://example.com/video.m3u8  or  video.mp4"}/>
          </Field>
        )}

        {srcTab==="youtube"&&(
          <Field label="YouTube URL" hint="Paste YouTube video or live stream — auto converted">
            <input className="inp" value={form.embed_url} onChange={e=>handleUrlChange(e.target.value,"embed_url")} placeholder="https://youtube.com/watch?v=XXXXXXXXXX"/>
          </Field>
        )}

        {srcTab==="upload"&&(
          <div>
            <div className="upload-zone" onClick={()=>fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept="video/*,.m3u8,.mp4,.mkv,.avi,.mov" style={{display:"none"}} onChange={e=>e.target.files?.[0]&&uploadFile(e.target.files[0])}/>
              {uploading?(
                <div>
                  <div style={{fontSize:28,marginBottom:8}}>⬆️</div>
                  <div style={{fontSize:14,color:"#fff",fontWeight:600,marginBottom:8}}>Uploading... {uploadPct}%</div>
                  <div style={{width:"100%",height:6,background:"#1a1a26",borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",background:R,borderRadius:3,width:`${uploadPct}%`,transition:"width .3s"}}/>
                  </div>
                </div>
              ):(
                <div>
                  <div style={{fontSize:36,marginBottom:8,opacity:.4}}>📁</div>
                  <div style={{fontSize:13,color:"#aaa",fontWeight:600,marginBottom:4}}>Click to upload video from device</div>
                  <div style={{fontSize:11,color:"#444"}}>MP4, MKV, AVI, MOV · Max 500MB</div>
                </div>
              )}
            </div>
            <div style={{marginTop:8,background:"rgba(255,165,0,.06)",border:"1px solid rgba(255,165,0,.15)",borderRadius:8,padding:"8px 12px",fontSize:11,color:"#f59e0b"}}>
              ⚠️ First create Supabase Storage bucket "streamx-media" (public)
            </div>
          </div>
        )}

        {srcTab==="drive"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <Field label="Paste any cloud video link" hint="Google Drive, Dropbox, OneDrive, Cloudflare R2, etc.">
              <input className="inp" value={form.stream_url} onChange={e=>handleUrlChange(e.target.value,"stream_url")} placeholder="Paste cloud video URL here"/>
            </Field>
            <div style={{background:"rgba(255,255,255,.03)",borderRadius:8,padding:10,fontSize:11,color:"#555",lineHeight:1.7}}>
              <span style={{color:"#1d9bf0"}}>Google Drive:</span> Share → change "view" to "uc?export=download"<br/>
              <span style={{color:"#00c853"}}>Dropbox:</span> change "dl=0" to "dl=1"<br/>
              <span style={{color:"#f59e0b"}}>Cloudflare R2:</span> Copy public URL directly
            </div>
          </div>
        )}

        {/* LIVE PREVIEW — shows when URL is pasted */}
        {previewUrl && previewUrl.length > 10 && (
          <div style={{marginTop:12}}>
            <div style={{fontSize:11,color:"#555",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Preview</div>
            <SmallPreview url={previewUrl} isLive={isLiveForm||form.is_live}/>
          </div>
        )}
      </div>

      {/* Thumbnail */}
      <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"start"}}>
        <Field label="Thumbnail URL">
          <input className="inp" value={form.thumbnail} onChange={e=>set("thumbnail",e.target.value)} placeholder="https://example.com/thumbnail.jpg"/>
        </Field>
        <div style={{paddingTop:20}}>
          <Btn onClick={()=>thumbRef.current?.click()} outline small color="#1d9bf0">Upload</Btn>
          <input ref={thumbRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>e.target.files?.[0]&&uploadFile(e.target.files[0],true)}/>
        </div>
      </div>
      {form.thumbnail&&<img src={form.thumbnail} alt="" style={{width:150,height:85,objectFit:"cover",borderRadius:8,border:"1px solid #1a1a26"}} onError={e=>e.target.style.display="none"}/>}

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

      {!isLiveForm&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          <Field label="IMDb Score"><input className="inp" type="number" min="0" max="10" step="0.1" value={form.score||0} onChange={e=>set("score",+e.target.value)}/></Field>
          <Field label="Year"><input className="inp" type="number" value={form.release_year||2026} onChange={e=>set("release_year",+e.target.value)}/></Field>
          <Field label="Director"><input className="inp" value={form.director||""} onChange={e=>set("director",e.target.value)} placeholder="Optional"/></Field>
        </div>
      )}

      {/* Tags */}
      <Field label="Tags (Enter to add)" hint="e.g. 4K, HDR, NEW, DOLBY">
        <input className="inp" value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={addTag} placeholder="Type and press Enter..."/>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
          {(form.tags||[]).map(t=>(
            <span key={t} onClick={()=>set("tags",(form.tags||[]).filter(x=>x!==t))} style={{background:"rgba(229,9,20,.12)",color:R,fontSize:11,padding:"2px 8px",borderRadius:4,cursor:"pointer",border:"1px solid rgba(229,9,20,.2)"}}>{t} ×</span>
          ))}
        </div>
      </Field>

      {/* Toggles */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,padding:"10px 0",borderTop:"1px solid #191926"}}>
        {[["is_active","✅ Active"],["is_featured","⭐ Featured"],["is_premium","👑 Premium Only"],["is_live","🔴 Live Stream"]].map(([k,l])=>(
          <label key={k} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer",color:"#aaa"}}>
            <input type="checkbox" checked={!!form[k]} onChange={e=>set(k,e.target.checked)} style={{accentColor:R,width:15,height:15}}/>{l}
          </label>
        ))}
      </div>

      <div style={{display:"flex",gap:10}}>
        <Btn onClick={onCancel} outline style={{flex:1}}>Cancel</Btn>
        <button onClick={handleSave} disabled={saving||!canSave} style={{flex:2,background:saving||!canSave?"#1a1a26":R,color:"#fff",border:"none",borderRadius:8,padding:"10px",fontSize:13,fontWeight:700,cursor:saving||!canSave?"not-allowed":"pointer",fontFamily:"'Inter',sans-serif",transition:"all .2s"}}>
          {saving?"Saving...":initial?.id?"Update":"Save"}
        </button>
      </div>
      {!canSave&&<div style={{fontSize:11,color:"#f87171",textAlign:"center"}}>⚠️ Title and video URL required</div>}
    </div>
  );
}

/* ── CONTENT LIST ── */
function ContentList({content,isLiveList=false,onRefresh,showToast}){
  const[modal,  setModal]  =useState(null);
  const[search, setSearch] =useState("");
  const[saving, setSaving] =useState(false);
  const[confirm,setConfirm]=useState(null);

  const items=(content||[]).filter(c=>!search||c.title?.toLowerCase().includes(search.toLowerCase()));

  async function handleSave(form){
    setSaving(true);
    try{
      if(modal?.id){await db.updateContent(modal.id,form);showToast("Updated!");}
      else{await db.addContent(form);showToast("Added! Now live on home page.");}
      setModal(null);onRefresh();
    }catch(e){showToast("Error: "+e.message,"err");}
    setSaving(false);
  }

  async function realDelete(c){
    try{
      const{error}=await supabase.from("content").delete().eq("id",c.id);
      if(error) throw error;
      showToast("Deleted: "+c.title);setConfirm(null);onRefresh();
    }catch(e){showToast("Delete failed","err");}
  }

  return(
    <div style={{animation:"fadeIn .3s ease"}}>
      {confirm&&(
        <Modal title="Confirm Delete" onClose={()=>setConfirm(null)}>
          <div style={{textAlign:"center",padding:"8px 0"}}>
            <div style={{fontSize:44,marginBottom:12}}>🗑️</div>
            <div style={{fontWeight:700,fontSize:16,marginBottom:8}}>Delete "{confirm.title}"?</div>
            <div style={{fontSize:13,color:"#666",marginBottom:24}}>Permanently removes from database.</div>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <Btn onClick={()=>setConfirm(null)} outline>Cancel</Btn>
              <Btn onClick={()=>realDelete(confirm)} danger>Yes, Delete</Btn>
            </div>
          </div>
        </Modal>
      )}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:1}}>{isLiveList?"Live Channels":"Movies & Series"}</div>
          <div style={{fontSize:12,color:"#555",marginTop:1}}>{items.length} items</div>
        </div>
        <Btn onClick={()=>setModal({})}>+ Add {isLiveList?"Channel":"Content"}</Btn>
      </div>

      <input className="inp" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{maxWidth:280,marginBottom:12}}/>

      <div className="card" style={{overflow:"hidden"}}>
        {items.length===0?(
          <div style={{textAlign:"center",padding:"48px 0",color:"#444"}}>
            <div style={{fontSize:40,marginBottom:12}}>{isLiveList?"🔴":"🎬"}</div>
            <div style={{fontSize:14,marginBottom:16}}>No {isLiveList?"live channels":"content"} yet</div>
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
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        {c.thumbnail?<img src={c.thumbnail} alt="" style={{width:52,height:34,objectFit:"cover",borderRadius:5,flexShrink:0}} onError={e=>e.target.style.display="none"}/>:<div style={{width:52,height:34,borderRadius:5,background:"#0a0a14",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{isLiveList?"🔴":"🎬"}</div>}
                        <div style={{minWidth:0}}>
                          <div style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160}}>{c.title}</div>
                          <div style={{fontSize:10,color:"#333",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160}}>{c.stream_url||c.embed_url||<span style={{color:"#f87171"}}>⚠️ No URL</span>}</div>
                        </div>
                      </div>
                    </td>
                    <td><Chip label={c.type||"Movie"} color="#1d9bf0"/></td>
                    <td>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                        <Chip label={c.is_active?"ON":"OFF"} color={c.is_active?"#00c853":"#555"}/>
                        {c.is_featured&&<Chip label="⭐" color="#f59e0b"/>}
                        {c.is_premium&&<Chip label="👑" color={R}/>}
                        {c.is_live&&<Chip label="🔴" color={R}/>}
                      </div>
                    </td>
                    <td style={{color:"#1d9bf0",fontSize:12,fontWeight:600}}>{(c.views||0).toLocaleString()}</td>
                    <td>
                      <div style={{display:"flex",gap:4}}>
                        <Btn onClick={()=>setModal(c)} outline small>Edit</Btn>
                        <Btn onClick={async()=>{await db.updateContent(c.id,{is_featured:!c.is_featured});showToast(c.is_featured?"Removed":"Featured ⭐");onRefresh();}} outline small color="#f59e0b">{c.is_featured?"★":"☆"}</Btn>
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

/* ── USERS ── */
function UsersPage({users,onRefresh,showToast}){
  const[search,setSearch]=useState("");
  const filtered=(users||[]).filter(u=>u.name?.toLowerCase().includes(search.toLowerCase())||u.phone?.includes(search)||u.email?.toLowerCase().includes(search.toLowerCase()));
  return(
    <div style={{animation:"fadeIn .3s ease"}}>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:1,marginBottom:14}}>User Management</div>
      <input className="inp" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users..." style={{maxWidth:300,marginBottom:14}}/>
      <div className="card" style={{overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table className="tbl">
            <thead><tr><th>User</th><th>Phone</th><th>Plan</th><th>Status</th><th>Joined</th><th>Action</th></tr></thead>
            <tbody>
              {filtered.map(u=>(
                <tr key={u.id}>
                  <td><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:30,height:30,borderRadius:"50%",background:"rgba(229,9,20,.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700}}>{u.name?.[0]?.toUpperCase()||"?"}</div><span style={{fontWeight:600}}>{u.name||"Unknown"}</span></div></td>
                  <td style={{color:"#666",fontSize:12}}>{u.phone||u.email||"—"}</td>
                  <td><Chip label={(u.plan||"free").toUpperCase()} color={u.plan?.includes("premium")?R:u.plan?.includes("basic")?"#3b82f6":"#555"}/></td>
                  <td><Chip label={u.is_active?"ACTIVE":"SUSPENDED"} color={u.is_active?"#00c853":"#f87171"}/></td>
                  <td style={{color:"#555",fontSize:11}}>{new Date(u.created_at).toLocaleDateString("en-IN")}</td>
                  <td>{u.is_active?<Btn onClick={async()=>{await db.suspendUser(u.id);showToast("Suspended");onRefresh();}} danger small>Suspend</Btn>:<Btn onClick={async()=>{await db.activateUser(u.id);showToast("Activated");onRefresh();}} outline small color="#00c853">Activate</Btn>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── ADS ── */
function AdsPage({ads,onRefresh,showToast}){
  const[modal,setModal]=useState(null);
  const[form,setForm]=useState({brand:"",tagline:"",cta_text:"Learn More",type:"pre_roll",duration:15,skip_after:5,is_active:true,priority:1});
  const[saving,setSaving]=useState(false);

  async function save(){
    if(!form.brand){showToast("Brand required","err");return;}
    setSaving(true);
    try{
      if(modal?.id){await db.updateAd(modal.id,form);showToast("Updated!");}
      else{await db.addAd(form);showToast("Ad created!");}
      setModal(null);onRefresh();
    }catch(e){showToast("Error: "+e.message,"err");}
    setSaving(false);
  }

  return(
    <div style={{animation:"fadeIn .3s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:1}}>Ad Manager</div>
        <Btn onClick={()=>{setForm({brand:"",tagline:"",cta_text:"Learn More",type:"pre_roll",duration:15,skip_after:5,is_active:true,priority:1});setModal({});}}>+ New Ad</Btn>
      </div>
      <div className="card" style={{overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table className="tbl">
            <thead><tr><th>Brand</th><th>Type</th><th>Duration</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {(ads||[]).map(a=>(
                <tr key={a.id}>
                  <td><div style={{fontWeight:600}}>{a.brand}</div><div style={{fontSize:10,color:"#555"}}>{a.tagline}</div></td>
                  <td><Chip label={a.type?.replace("_"," ").toUpperCase()} color="#1d9bf0"/></td>
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
            {[["Brand","brand"],["Tagline","tagline"],["CTA Text","cta_text"]].map(([l,k])=>(
              <Field key={k} label={l}><input className="inp" value={form[k]||""} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/></Field>
            ))}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <Field label="Type"><select className="inp" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}><option value="pre_roll">Pre-roll</option><option value="mid_roll">Mid-roll</option><option value="banner">Banner</option></select></Field>
              <Field label="Duration (s)"><input className="inp" type="number" value={form.duration||15} onChange={e=>setForm(f=>({...f,duration:+e.target.value}))}/></Field>
              <Field label="Skip After (s)"><input className="inp" type="number" value={form.skip_after||5} onChange={e=>setForm(f=>({...f,skip_after:+e.target.value}))}/></Field>
            </div>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer",color:"#aaa"}}><input type="checkbox" checked={!!form.is_active} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))} style={{accentColor:R}}/>Active</label>
            <div style={{display:"flex",gap:10}}>
              <Btn onClick={()=>setModal(null)} outline style={{flex:1}}>Cancel</Btn>
              <button onClick={save} disabled={saving} style={{flex:2,background:saving?"#1a1a26":R,color:"#fff",border:"none",borderRadius:8,padding:"10px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>{saving?"Saving...":modal?.id?"Update":"Create"}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── MAIN ADMIN ── */
export default function Admin({onNavigate,user}){
  const[verified,  setVerified]  =useState(false);
  const[showFace,  setShowFace]  =useState(true);
  const[page,      setPage]      =useState("overview");
  const[collapsed, setCollapsed] =useState(false);
  const[stats,     setStats]     =useState({});
  const[content,   setContent]   =useState([]);
  const[users,     setUsers]     =useState([]);
  const[ads,       setAds]       =useState([]);
  const[loading,   setLoading]   =useState(true);
  const[toast,     setToast]     =useState(null);

  const showToast=(msg,type="ok")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};

  useEffect(()=>{if(verified) loadData();},[verified]);

  useEffect(()=>{
    if(!verified) return;
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
    <div style={{minHeight:"100vh",background:"#07070c",display:"flex",alignItems:"center",justifyContent:"center",gap:14,fontFamily:"Inter,sans-serif"}}>
      <div style={{width:36,height:36,border:"3px solid #191926",borderTop:`3px solid ${R}`,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
      <div style={{color:"#444",fontSize:13}}>Loading...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );

  const fN=n=>n>=1e6?(n/1e6).toFixed(1)+"M":n>=1e3?(n/1e3).toFixed(1)+"K":String(n||0);
  const liveContent=content.filter(c=>c.is_live||c.type==="Live");
  const movieContent=content.filter(c=>!c.is_live&&c.type!=="Live");

  return(
    <div style={{display:"flex",height:"100vh",background:"#07070c",overflow:"hidden",fontFamily:"'Inter',sans-serif"}}>
      <style>{GS}</style>
      {toast&&<ToastMsg msg={toast.msg} type={toast.type}/>}

      {/* Sidebar */}
      <div style={{width:collapsed?50:192,flexShrink:0,background:"#0a0a14",borderRight:"1px solid #191926",display:"flex",flexDirection:"column",transition:"width .22s",overflow:"hidden"}}>
        <div style={{padding:collapsed?"10px":"10px 12px",borderBottom:"1px solid #191926",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setCollapsed(o=>!o)}>
          <div style={{width:26,height:26,borderRadius:7,background:"rgba(229,9,20,.15)",border:"1px solid rgba(229,9,20,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>⚡</div>
          {!collapsed&&<div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:1,whiteSpace:"nowrap"}}><span style={{color:R}}>STREAM</span>X <span style={{fontSize:8,color:"#444"}}>ADMIN</span></div>}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"6px 4px"}}>
          {PAGES.map(p=>(
            <div key={p.id} className={`nav${page===p.id?" on":""}`} onClick={()=>setPage(p.id)} style={{justifyContent:collapsed?"center":"flex-start"}} title={collapsed?p.label:undefined}>
              <span style={{fontSize:14,flexShrink:0}}>{p.icon}</span>
              {!collapsed&&<span>{p.label}</span>}
              {!collapsed&&p.id==="live"&&liveContent.length>0&&<span style={{marginLeft:"auto",background:R,color:"#fff",fontSize:9,fontWeight:800,padding:"1px 5px",borderRadius:10,animation:"pulse 1.5s infinite"}}>{liveContent.length}</span>}
            </div>
          ))}
        </div>
        <div style={{padding:"6px 4px",borderTop:"1px solid #191926"}}>
          <div className="nav" onClick={loadData} style={{color:"#1d9bf0",justifyContent:collapsed?"center":"flex-start"}}><span style={{fontSize:14}}>↻</span>{!collapsed&&<span style={{fontSize:12}}>Refresh</span>}</div>
          <div className="nav" onClick={()=>onNavigate("home")} style={{color:"#f87171",justifyContent:collapsed?"center":"flex-start"}}><span style={{fontSize:14}}>🏠</span>{!collapsed&&<span style={{fontSize:12}}>Back to Home</span>}</div>
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,overflow:"hidden"}}>
        <div style={{height:48,background:"#0a0a14",borderBottom:"1px solid #191926",display:"flex",alignItems:"center",padding:"0 20px",gap:12,flexShrink:0}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:1,color:"#555"}}>{PAGES.find(p=>p.id===page)?.icon} {PAGES.find(p=>p.id===page)?.label}</div>
          <div style={{flex:1}}/>
          <span style={{fontSize:11,color:"#444"}}>👑 {user?.name||"Admin"}</span>
          <Btn onClick={loadData} outline small>↻</Btn>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"clamp(14px,3vw,20px)"}}>
          {page==="overview"&&(
            <div style={{animation:"fadeIn .3s ease"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:20}}>
                <KPI icon="👥" label="Users"     value={fN(stats.totalUsers)}       color="#1d9bf0"/>
                <KPI icon="👑" label="Paid Subs" value={fN(stats.activeSubs)}       color={R}/>
                <KPI icon="💰" label="Revenue"   value={"₹"+fN(stats.totalRevenue)} color="#00c853"/>
                <KPI icon="🎬" label="Content"   value={stats.totalContent||0}      color="#a855f7"/>
                <KPI icon="👁️" label="Views"     value={fN(stats.totalViews)}       color="#06b6d4"/>
                <KPI icon="🔴" label="Live Now"  value={liveContent.filter(c=>c.is_active).length} color={R}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                <div className="card" style={{padding:20}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>🔥 Top Content</div>
                  {[...content].sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,5).map((c,i)=>(
                    <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<4?"1px solid #13131f":"none"}}>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:i===0?R:"#444",width:20}}>{i+1}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title}</div>
                        <div style={{fontSize:10,color:"#555"}}>{c.type}·{c.genre}</div>
                      </div>
                      <div style={{fontSize:11,color:"#1d9bf0",fontWeight:600}}>{fN(c.views||0)}</div>
                    </div>
                  ))}
                </div>
                <div className="card" style={{padding:20}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>👥 Recent Users</div>
                  {users.slice(0,5).map((u,i)=>(
                    <div key={u.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<4?"1px solid #13131f":"none"}}>
                      <div style={{width:30,height:30,borderRadius:"50%",background:"rgba(229,9,20,.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,flexShrink:0}}>{u.name?.[0]?.toUpperCase()||"?"}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600}}>{u.name||"Unknown"}</div>
                        <div style={{fontSize:10,color:"#555"}}>{u.phone||u.email||"—"}</div>
                      </div>
                      <Chip label={(u.plan||"free").toUpperCase()} color={u.plan?.includes("premium")?R:"#555"}/>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {page==="content"  &&<ContentList content={movieContent} isLiveList={false} onRefresh={loadData} showToast={showToast}/>}
          {page==="live"     &&<ContentList content={liveContent}  isLiveList={true}  onRefresh={loadData} showToast={showToast}/>}
          {page==="users"    &&<UsersPage users={users} onRefresh={loadData} showToast={showToast}/>}
          {page==="ads"      &&<AdsPage ads={ads} onRefresh={loadData} showToast={showToast}/>}
          {page==="settings" &&(
            <div style={{animation:"fadeIn .3s ease",maxWidth:560}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:1,marginBottom:16}}>Settings</div>
              <div className="card" style={{padding:20,marginBottom:14}}>
                {[["Admin Phone","+918660570052"],["Database","Supabase PostgreSQL"],["Auth","Mobile OTP"],["Version","StreamX v3.0"]].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #13131f22",fontSize:12}}>
                    <span style={{color:"#555"}}>{k}</span><span style={{fontFamily:"monospace",color:"#7dd3fc",fontSize:11}}>{v}</span>
                  </div>
                ))}
              </div>
              <button onClick={()=>{setVerified(false);onNavigate("home");}} style={{width:"100%",background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.25)",color:"#f87171",borderRadius:10,padding:"12px",fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:600,cursor:"pointer"}}>
                Sign Out of Admin
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
