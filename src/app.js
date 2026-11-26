import {clock, compose, presets, sanitize, settingsFor} from "./recursion.js";
import {drawField, drawScoreStrip, makeField} from "./art.js";
import {Player} from "./player.js";

const byId = id => document.getElementById(id);
const all = selector => [...document.querySelectorAll(selector)];
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const player = new Player();
let settings = settingsFor(0), score = compose(settings);
let audibleScore = score, audibleSettings = settings;
let fields = new Map(), fieldNumber = -1, lastFrame = 0, previousField = null;
let studio = false, playingIntent = false, previewing = false, transaction = 0, changeTimer;
let slide = 0, pace = motion.matches ? 0 : 6000, moving = pace > 0, quoteNumber = 0;
let galleryTimer, quoteTimer, noticeTimer, quoteSwap, exportVersion = 0;
const scene = byId("field");
const quotes = [
  ["…the engine might compose elaborate and scientific pieces of music of any degree of complexity or extent.", "Ada Lovelace · Notes on the Analytical Engine"],
  ["Clouds are not spheres, mountains are not cones, coastlines are not circles…", "Benoît Mandelbrot · The Fractal Geometry of Nature"]
];

function labelButton(button, icon, label){
  button.querySelector("use").setAttribute("href","#i-"+icon);
  const text=button.querySelector("span");
  if(text)text.textContent=label;
}
function notify(message){
  byId("notice").textContent=message;clearTimeout(noticeTimer);
  noticeTimer=setTimeout(()=>{byId("notice").textContent="";},3600);
}
function stateLabel(value){if(byId("status").textContent!==value)byId("status").textContent=value;}
function paintControls(){
  const preset=presets[settings.index];
  byId("studio").style.setProperty("--accent",preset.color);
  for(const key of ["depth","spread","tempo","space","ambience"]){
    const input=byId(key);input.value=settings[key];
    input.style.setProperty("--fill",100*(settings[key]-input.min)/(input.max-input.min)+"%");
    const unit=key==="tempo"?" BPM":key==="depth"?" levels":"%";
    byId(key+"-value").textContent=settings[key]+unit;
  }
  byId("seed").value=settings.seed;byId("pulse").checked=settings.pulse;
  all("[data-mood]").forEach((button,i)=>button.setAttribute("aria-pressed",i===settings.index));
}
function showScore(nextScore,nextSettings){
  audibleScore=nextScore;audibleSettings=nextSettings;fields.clear();fieldNumber=-1;previousField=null;
  const preset=presets[nextSettings.index];
  byId("duration").textContent=clock(nextScore.duration);
  byId("seek").max=nextScore.duration;
  byId("mood-name").textContent=preset.name;
  byId("voice-name").textContent=(preset.voice+" / "+preset.key).toUpperCase();
  drawScoreStrip(byId("score-strip"),nextScore,nextSettings.index);
  if(studio)drawAt(Math.min(player.position(),nextScore.duration),true);
}
function fieldFor(number){
  if(!fields.has(number))fields.set(number,makeField(scene,audibleScore,audibleSettings,number));
  return fields.get(number);
}
function drawAt(time,force=false){
  if(!studio||!scene.clientWidth)return;
  const ratio=Math.min(2,window.devicePixelRatio||1);
  const width=Math.round(scene.clientWidth*ratio),height=Math.round(scene.clientHeight*ratio);
  if(scene.width!==width||scene.height!==height){
    scene.width=width;scene.height=height;fields.clear();fieldNumber=-1;previousField=null;
  }
  const number=Math.min(audibleScore.phrases.length-1,Math.floor(time/audibleScore.phraseLength));
  const field=fieldFor(number);
  if(number!==fieldNumber){
    previousField=number===fieldNumber+1&&fields.has(fieldNumber)?fields.get(fieldNumber):null;
    fieldNumber=number;
    for(const key of fields.keys())if(key<number-1||key>number+1)fields.delete(key);
    const phraseLabel="Phrase "+(number+1)+" / "+audibleScore.phrases.length;
    byId("field-phrase").textContent=phraseLabel;
    const description=phraseLabel+", "+field.phrase.depth+" branch levels, "+field.phrase.notes.length+" sounding nodes.";
    scene.setAttribute("aria-label",presets[audibleSettings.index].name+" — "+description);
    byId("phrase-announcement").textContent=description;
  }
  if(!force&&!player.active&&time===0&&lastFrame===-1)return;
  drawField(scene,field,time>0?time:null,motion.matches,audibleScore.cadence.time);
  const phaseTime=time-field.phrase.start;
  if(previousField&&phaseTime<1.2&&!motion.matches){
    const context=scene.getContext("2d");context.setTransform(1,0,0,1,0,0);
    context.globalAlpha=1-phaseTime/1.2;context.drawImage(previousField.base,0,0);context.globalAlpha=1;
  }
  if(player.active&&field.phrase.end-time<2&&number+1<audibleScore.phrases.length&&!fields.has(number+1)){
    const expected=audibleScore;
    (window.requestIdleCallback||window.setTimeout)(()=>{if(audibleScore===expected&&studio)fieldFor(number+1);});
  }
  const last=field.phrase.notes.filter(n=>n.time<=time).sort((a,b)=>b.time-a.time)[0];
  const trace=last?"Depth "+last.level+" · "+Array(last.level+1).fill("divide").join(" › ")+(last.leaf?" › leaf":""):
    field.phrase.notes.length+" sounding nodes · each split places a note";
  byId("trace").textContent=trace;
  byId("elapsed").textContent=clock(time);byId("seek").value=time;
  byId("seek").setAttribute("aria-valuetext",clock(time)+" of "+clock(audibleScore.duration));
}
function animate(now){
  requestAnimationFrame(animate);
  if(player.active&&studio&&!scrubbing&&now-lastFrame>(motion.matches?180:0)){
    lastFrame=now;drawAt(player.position());
    byId("studio").style.setProperty("--energy",motion.matches?0:player.energy().toFixed(3));
  }
  if(player.active&&previewing&&player.position()>=16)stop();
}
function resetButtons(){
  labelButton(byId("play"),playingIntent?"pause":"play",playingIntent?"Pause":"Play");
  labelButton(byId("preview"),previewing?"stop":"play",previewing?"Stop preview":"Play preview");
}
function stop(rewind=true){
  ++transaction;clearTimeout(changeTimer);player.cancelPending();player.silence();
  if(rewind)player.offset=0;
  playingIntent=false;previewing=false;resetButtons();stateLabel(rewind?"Ready":"Paused");
  byId("studio").style.setProperty("--energy",0);
  if(studio){showScore(score,settings);drawAt(player.offset,true);}
  resetRotation();
}
player.onend=()=>stop();
async function begin(preview=false,replacement=false){
  const id=++transaction;
  const target=preview?settingsFor(slide):{...settings};
  const targetScore=compose(target);
  playingIntent=true;previewing=preview;resetButtons();resetRotation();stateLabel("Composing…");
  if(preview)labelButton(byId("preview"),"stop","Composing…");
  try{
    await player.unlock();
    if(id!==transaction)return;
    const track=await player.prepare(target);
    if(id!==transaction)return;
    const position=replacement?player.position()%targetScore.duration:player.offset;
    player.start(track,position,replacement?1.5:0.065);
    if(!preview)showScore(targetScore,target);else labelButton(byId("preview"),"stop","Stop preview");
    stateLabel("Playing");resetButtons();
  }catch(error){
    if(id!==transaction||error.name==="AbortError")return;
    stop();stateLabel("Playback unavailable");notify("Audio could not start. Press Play to try again.");
  }
}
function changed(next){
  settings=sanitize(next);score=compose(settings);paintControls();++exportVersion;
  if(playingIntent&&!previewing){
    ++transaction;player.cancelPending();clearTimeout(changeTimer);
    stateLabel("Composing…");changeTimer=setTimeout(()=>begin(false,true),350);
  }else{
    player.cancelPending();player.offset=0;showScore(score,settings);stateLabel("Ready");
  }
}
byId("play").onclick=()=>playingIntent?stop(false):begin();
byId("stop").onclick=()=>stop();
byId("preview").onclick=()=>previewing?stop():begin(true);
byId("loop").onclick=()=>{
  const at=player.position();player.loop=!player.loop;
  byId("loop").setAttribute("aria-pressed",player.loop);
  if(player.active)player.start(player.active.track,at);
};
byId("volume").oninput=event=>{
  player.setVolume(+event.target.value/100);event.target.style.setProperty("--fill",event.target.value+"%");
};
let scrubbing=false;
byId("seek").oninput=event=>{scrubbing=true;drawAt(+event.target.value,true);};
byId("seek").onchange=event=>{
  scrubbing=false;
  const at=+event.target.value;
  if(player.active)player.start(player.active.track,at);else player.offset=at;
  drawAt(at,true);
};
for(const key of ["depth","spread","tempo","space","ambience"]){
  byId(key).oninput=event=>changed({...settings,[key]:+event.target.value});
}
byId("pulse").onchange=event=>changed({...settings,pulse:event.target.checked});
byId("seed").onchange=event=>changed({...settings,seed:event.target.value});
byId("shuffle").onclick=()=>changed({...settings,seed:crypto.getRandomValues(new Uint32Array(1))[0]%100000});
all("[data-mood]").forEach((button,index)=>button.onclick=()=>changed(settingsFor(index)));
byId("download").onclick=async()=>{
  const button=byId("download");
  button.disabled=true;button.querySelector("span").textContent="Preparing WAV…";
  try{
    let version;
    do{
      version=exportVersion;
      const snapshot={...settings};
      try{
        const track=await player.prepare(snapshot);
        if(version!==exportVersion)continue;
        await player.download(snapshot,presets[snapshot.index].name.toLowerCase().replaceAll(" ","-")+"-"+snapshot.seed+".wav",track);
        notify("Your stereo WAV is ready.");break;
      }catch(error){if(error.name!=="AbortError")throw error;if(!studio)break;}
    }while(studio&&version!==exportVersion);
  }catch{notify("Export could not finish. Please try again.");}
  finally{button.disabled=false;button.querySelector("span").textContent="Export WAV";}
};

function setSlide(index){
  slide=(index+presets.length)%presets.length;
  all("[data-slide]").forEach((img,i)=>{img.classList.toggle("shown",i===slide);img.setAttribute("aria-hidden",i!==slide);});
  all("[data-gallery]").forEach((button,i)=>button.setAttribute("aria-pressed",i===slide));
  byId("feature-name").textContent=presets[slide].name;byId("slide-number").textContent="0"+(slide+1);
  byId("gallery").style.setProperty("--accent",presets[slide].color);
  for(let j=0;j<2;j++){
    const other=(slide+j+1)%3,mini=byId("mini-"+j);
    mini.querySelector("img").src="assets/scene-"+other+".webp";
    mini.setAttribute("aria-label","Show "+presets[other].name);
    mini.onclick=()=>{if(previewing)stop();setSlide(other);resetRotation();};
  }
}
all("[data-gallery]").forEach((button,i)=>button.onclick=()=>{if(previewing)stop();setSlide(i);resetRotation();});
function showQuote(index,animate=true){
  quoteNumber=index%quotes.length;
  const box=byId("quote");clearTimeout(quoteSwap);
  if(animate&&!motion.matches)box.classList.add("fading");
  const apply=()=>{byId("quote-text").textContent=quotes[quoteNumber][0];byId("quote-author").textContent=quotes[quoteNumber][1];box.classList.remove("fading");};
  if(animate&&!motion.matches)quoteSwap=setTimeout(apply,330);else apply();
}
byId("next-quote").onclick=()=>{showQuote(quoteNumber+1);resetRotation();};
function resetRotation(){
  clearInterval(galleryTimer);clearInterval(quoteTimer);
  byId("rotate").setAttribute("aria-label",moving?"Pause automatic motion":"Resume automatic motion");
  labelButton(byId("rotate"),moving?"pause":"play","");
  if(!moving||studio||previewing||document.hidden||byId("manual").open)return;
  if(!byId("gallery").matches(":hover,:focus-within"))galleryTimer=setInterval(()=>setSlide(slide+1),pace||6000);
  if(!document.querySelector(".quote-area").matches(":hover,:focus-within"))quoteTimer=setInterval(()=>showQuote(quoteNumber+1),Math.max(6000,pace));
}
byId("rotate").onclick=()=>{moving=!moving;if(moving&&!pace)pace=6000;byId("pace").value=moving?pace:0;resetRotation();};
byId("pace").onchange=event=>{pace=+event.target.value;moving=pace>0;resetRotation();};
byId("pace").value=pace;
for(const el of [byId("gallery"),document.querySelector(".quote-area")]){
  for(const type of ["mouseenter","mouseleave","focusin","focusout"])el.addEventListener(type,()=>setTimeout(resetRotation,0));
}
document.addEventListener("visibilitychange",resetRotation);
motion.addEventListener("change",()=>{moving=!motion.matches;pace=moving?6000:0;byId("pace").value=pace;resetRotation();if(studio)drawAt(player.position(),true);});
document.addEventListener("keydown",event=>{
  if(event.code!=="Space"||event.repeat||!studio||byId("manual").open)return;
  if(event.target.closest("a,button,input,select,textarea,[contenteditable=true]"))return;
  event.preventDefault();byId("play").click();
});
const manual=byId("manual");let opener;
all("[data-help]").forEach(button=>button.onclick=()=>{
  opener=button;manual.showModal();manual.scrollTop=0;byId("close-help").focus();resetRotation();
});
function closeManual(){
  if(manual.classList.contains("leaving"))return;
  manual.classList.add("leaving");
  setTimeout(()=>{manual.close();manual.classList.remove("leaving");opener?.focus();resetRotation();},motion.matches?0:190);
}
manual.addEventListener("cancel",event=>{event.preventDefault();closeManual();});
manual.addEventListener("click",event=>{
  if(event.target!==manual)return;
  const rect=manual.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeManual();
});
manual.addEventListener("keydown",event=>{
  if(event.key!=="Tab")return;
  const first=byId("close-help"),last=byId("pace");
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
});
byId("close-help").onclick=closeManual;
function route(initial=false){
  const hash=location.hash.slice(1),[dest,preset]=hash.split("/");
  if(dest==="content")return;
  const nextStudio=dest==="studio";
  const apply=()=>{
    stop();studio=nextStudio;
    byId("studio").hidden=!studio;byId("landing").hidden=studio;
    all("[data-nav]").forEach(a=>{
      if(a.dataset.nav===(studio?"studio":dest==="soundscapes"?"soundscapes":"overview"))a.setAttribute("aria-current","page");
      else a.removeAttribute("aria-current");
    });
    if(studio){
      if(/^[012]$/.test(preset||""))settings=settingsFor(+preset);
      score=compose(settings);paintControls();showScore(score,settings);window.scrollTo(0,0);
      if(!initial)byId("studio-title").focus({preventScroll:true});
    }else if(dest==="soundscapes")byId("soundscapes").scrollIntoView();
    else window.scrollTo(0,0);
    resetRotation();
  };
  if(!initial&&nextStudio!==studio&&!motion.matches&&document.startViewTransition)document.startViewTransition(apply);else apply();
}
window.addEventListener("hashchange",()=>route());
new ResizeObserver(()=>{if(studio)drawAt(player.position(),true);}).observe(scene);
if("IntersectionObserver" in window&&!motion.matches){
  const observer=new IntersectionObserver(entries=>entries.forEach(({target,isIntersecting})=>{
    if(isIntersecting){target.classList.add("revealed");observer.unobserve(target);}
  }),{threshold:0.04});
  all(".preset-card,.quote-area,.controls,.transport").forEach(el=>{el.classList.add("reveal");observer.observe(el);});
}
setSlide(0);showQuote(0,false);paintControls();route(true);requestAnimationFrame(animate);