import {clamp} from "./recursion.js";
import {waveFile} from "./synth.js";
export class Player {
  constructor() {
    this.level=0.60; this.loop=false; this.offset=0; this.revision=0;
  }
  unlock() {
    if(!this.context){
      this.context=new AudioContext();
      this.master=this.context.createGain(); this.master.gain.value=this.level;
      this.analyser=this.context.createAnalyser();this.analyser.fftSize=256;
      this.samples=new Float32Array(this.analyser.fftSize);this.smoothed=0;
      this.master.connect(this.analyser);this.analyser.connect(this.context.destination);
    }
    return this.context.resume();
  }
  energy(){
    if(!this.analyser)return 0;
    this.analyser.getFloatTimeDomainData(this.samples);
    let sum=0;
    for(const sample of this.samples)sum+=sample*sample;
    const rms=Math.sqrt(sum/this.samples.length);
    this.smoothed += 0.28*(Math.min(1,rms*8)-this.smoothed);
    return this.smoothed;
  }
  setVolume(value){
    this.level=clamp(value,0,1);
    if(this.master)this.master.gain.setTargetAtTime(this.level,this.context.currentTime,0.025);
  }
  position(){
    if(!this.active)return this.offset;
    const elapsed=this.context.currentTime-this.active.started+this.active.offset;
    const duration=this.active.buffer.duration;
    if(this.loop&&elapsed>=duration)return 1+(elapsed-duration)%(duration-1);
    return Math.min(elapsed,duration);
  }
  silence(fade=0.045){
    this.offset=this.position();
    const old=this.active;
    this.active=null;
    if(!old)return;
    const now=this.context.currentTime;
    old.source.onended=null;
    old.gain.gain.cancelScheduledValues(now);
    old.gain.gain.setValueAtTime(old.gain.gain.value,now);
    old.gain.gain.linearRampToValueAtTime(0,now+fade);
    old.source.stop(now+fade+0.02);
    old.source.onended=()=>{old.source.disconnect();old.gain.disconnect();};
  }
  cancelPending(){
    if(!this.pending)return;
    this.pending.worker.terminate();
    this.pending.reject(new DOMException("Superseded","AbortError"));
    this.pending=null;
  }
  prepare(settings){
    const key=JSON.stringify(settings);
    if(this.ready?.key===key)return Promise.resolve(this.ready);
    if(this.pending?.key===key)return this.pending.promise;
    this.cancelPending();
    const worker=new Worker(new URL("./audio-worker.js",import.meta.url),{type:"module"});
    let rejectPending;
    const promise=new Promise((resolve,reject)=>{
      rejectPending=reject;
      worker.onmessage=({data})=>{
        this.pending=null;worker.terminate();
        if(data.error){reject(new Error(data.error));return;}
        this.ready={key,pcm:data,buffer:null,looped:false};
        resolve(this.ready);
      };
      worker.onerror=event=>{this.pending=null;worker.terminate();reject(new Error(event.message));};
    });
    this.pending={key,promise,worker,reject:rejectPending};
    worker.postMessage(settings);
    return promise;
  }
  start(track,offset=0,fade=0.055){
    const ctx=this.context;
    if(!track.buffer){
      track.buffer=ctx.createBuffer(2,track.pcm.left.length,track.pcm.sampleRate);
      track.buffer.copyToChannel(track.pcm.left,0);track.buffer.copyToChannel(track.pcm.right,1);
    }
    if(track.looped!==this.loop){
      const count=track.pcm.sampleRate, end=track.buffer.length-count;
      for(const [ch,raw] of [track.pcm.left,track.pcm.right].entries()){
        const tail=raw.slice(end);
        if(this.loop)for(let i=0;i<count;i++){
          const angle=i/(count-1)*Math.PI/2;
          tail[i]=tail[i]*Math.cos(angle)+raw[i]*Math.sin(angle);
        }
        track.buffer.copyToChannel(tail,ch,end);
      }
      track.looped=this.loop;
    }
    this.silence(fade);
    const source=ctx.createBufferSource(), gain=ctx.createGain(), now=ctx.currentTime;
    source.buffer=track.buffer;source.loop=this.loop;
    source.loopStart=1;source.loopEnd=track.buffer.duration;
    source.connect(gain);gain.connect(this.master);
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(1,now+fade);
    const start=clamp(offset,0,track.buffer.duration-0.025);
    this.active={source,gain,buffer:track.buffer,started:now,offset:start,track};
    source.onended=()=>{if(this.active?.source===source){this.active=null;this.offset=0;this.onend?.();}source.disconnect();gain.disconnect();};
    source.start(now,start);
  }
  async download(settings,name,prepared=null){
    const track=prepared||await this.prepare(settings);
    const blob=new Blob([waveFile(track.pcm,1)],{type:"audio/wav"});
    const url=URL.createObjectURL(blob), link=document.createElement("a");
    link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
}