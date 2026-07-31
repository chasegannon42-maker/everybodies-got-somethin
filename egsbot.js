/* EGS autoplay QA bot v5 — inject into the game page (needs window.__egsTest).
   Drives the REAL input layer. Doctrines: orbit-kite, wall-gating, bullet dodge,
   BFS door routing (key-aware), shoots fakes, mirror→center, mimic→stand, shooter→hunt,
   LoS pursuit, stall forensics (bosses exempt), NaN/stuck/softlock watchdogs.
   API: __bot.start(diag,{variant,protocol,prognosis,chronic}); __bot.run(steps);
        __campaign(configs, stepsPer); __bossGauntlet2(list). */
window.__bot = (function(){
  const G = window.__egsTest.G;
  const B = {
    rep:null, move:{x:0,y:0}, aim:null, _origMove:null, _origAim:null, orbitDir:1,
    reset(){ this.rep={steps:0,simT:0,rooms:0,kills:0,errors:[],stuck:0,nan:0,softlocks:0,deaths:0,cause:null,events:[],maxDepth:1,hpLog:[]}; this._lastPos={x:0,y:0}; this._stateT=0; this._lastState=''; this._roomKey=''; this._roomT=0; this._losT=0; this._slT=0; this._idleT=0; },
    hook(){ if(!this._origMove){ this._origMove=Input.getMove.bind(Input); this._origAim=Input.getAim.bind(Input); } Input.getMove=()=>B.move; Input.getAim=()=>B.aim; },
    unhook(){ if(this._origMove){ Input.getMove=this._origMove; Input.getAim=this._origAim; } this._origMove=null; },
    nearest(arr,p){ let b=null,bd=1e9; for(const a of arr){ const d=U.dist(p.x,p.y,a.x,a.y); if(d<bd){bd=d;b=a;} } return b; },
    solidAt(x,y){ const t=pxToTile(x,y); return t.c>=0&&t.r>=0&&t.c<COLS&&t.r<ROWS&&tileSolid(G.room.layout,t.c,t.r); },
    losBlocked(p,t){ for(let u=0.2;u<1;u+=0.2){ if(this.solidAt(p.x+(t.x-p.x)*u, p.y+(t.y-p.y)*u)) return true; } return false; },
    waypoint(tgt){   // tile BFS → next step center; falls back to direct line
      const p=G.player;
      const s=pxToTile(p.x,p.y), t=pxToTile(U.clamp(tgt.x,RX+8,RX+RW-8),U.clamp(tgt.y,RY+8,RY+RH-8));
      const inb=(c,r)=>c>=0&&r>=0&&c<COLS&&r<ROWS;
      if(!inb(s.c,s.r)||!inb(t.c,t.r)||(s.c===t.c&&s.r===t.r)) return tgt;
      const solid=(c,r)=>tileSolid(G.room.layout,c,r);
      const dist=new Int16Array(COLS*ROWS).fill(-1);
      const q=[[t.c,t.r]]; dist[t.r*COLS+t.c]=0;
      while(q.length){
        const [c,r]=q.shift();
        for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){
          const c2=c+dc,r2=r+dr;
          if(!inb(c2,r2)||dist[r2*COLS+c2]>=0||solid(c2,r2)) continue;
          dist[r2*COLS+c2]=dist[r*COLS+c]+1; q.push([c2,r2]);
        }
      }
      if(dist[s.r*COLS+s.c]<0) return tgt;   // no route — straight line and pray
      let best=null,bd=dist[s.r*COLS+s.c];
      for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const c2=s.c+dc,r2=s.r+dr;
        if(!inb(c2,r2)||solid(c2,r2)) continue;
        const d=dist[r2*COLS+c2];
        if(d>=0&&d<bd){bd=d;best={x:RX+(c2+0.5)*TILE,y:RY+(r2+0.5)*TILE};}
      }
      if(bd<=0) return tgt;
      return best||tgt;
    },

    doorTarget(){
      const room=G.room; if(!room) return null;
      const p=G.player, key=r=>r.gx+','+r.gy;
      const score=r=>{
        if(r.type==='item'&&!r.lockOpen&&(p.keys|0)<1) return -1;
        if(r.type==='boss') return G.floorRooms.every(x=>x.cleared||x.type==='boss'||x.type==='secret'||(x.type==='item'&&!x.lockOpen&&(p.keys|0)<1))?100:-1;
        if(!r.visited) return 60+(r.type==='item'||r.type==='clinic'?20:0);
        if(!r.cleared&&r.type!=='secret') return 50;
        return -1;
      };
      const start=key(room), q=[room], prev={}, seen={[start]:true};
      let best=null,bestS=-1;
      while(q.length){
        const r=q.shift(); const s=score(r);
        if(r!==room&&s>bestS){bestS=s;best=r;}
        for(const d in DIRS){
          if(!r.doors[d]&&!(r.secretDoors[d]&&G.secretFound)) continue;
          const n=G.roomAt(r.gx+DIRS[d].dx, r.gy+DIRS[d].dy);
          if(!n||seen[key(n)]) continue;
          seen[key(n)]=true; prev[key(n)]={from:key(r),dir:d}; q.push(n);
        }
      }
      if(!best) return null;
      let k=key(best), dir=null;
      while(prev[k]&&prev[k].from!==start) k=prev[k].from;
      if(prev[k]) dir=prev[k].dir;
      if(!dir) return null;
      const mid={x:RX+RW/2,y:RY+RH/2};
      return {N:{x:mid.x,y:RY+2},S:{x:mid.x,y:RY+RH-2},W:{x:RX+2,y:mid.y},E:{x:RX+RW-2,y:mid.y}}[dir];
    },

    steer(){
      const p=G.player; if(!p||p.dead) return;
      // stall forensics (bosses exempt)
      const rk=G.room?(G.depth+':'+G.room.gx+','+G.room.gy):'';
      if(rk!==this._roomKey){ this._roomKey=rk; this._roomT=0; if(this._skipPk) this._skipPk.clear(); this._pkTgt=null; } else this._roomT+=1/60;
      if(G.room&&G.room.type==='boss'&&this._roomT>40) this._roomT=-35;
      if(G.room&&!G.room.cleared&&this._roomT>45){
        const ids=G.enemies.filter(e=>!e.dying).map(e=>e.id+'@'+Math.round(U.dist(p.x,p.y,e.x,e.y))).join(',');
        this.rep.errors.push('SLOW@'+G.depth+' t='+G.room.type+' en=['+ids+'] boss='+(G.boss&&!G.boss.dead?G.boss.id:'-'));
        for(const e of G.enemies) if(!e.dying) e.hurt(99999,G,true);
        if(G.boss&&!G.boss.dead) G.boss.hurt(99999,G);
        this._roomT=0;
      }
      let vx=0,vy=0;
      const live=G.enemies.filter(e=>!e.dying&&!e.charmed&&!e.fake&&e.spawnT<=0&&e.id!=='auditor');
      const boss=G.boss&&!G.boss.dead?G.boss:null;
      let foe=null;
      if(boss&&(!live.length||U.dist(p.x,p.y,boss.x,boss.y)<300)) foe=boss;
      if(!foe) foe=this.nearest(live,p);
      // THE AUDITOR: never trade shots with the file — just stay out of arm's reach
      const aud=G.enemies.find(e=>e.id==='auditor'&&!e.dying);
      if(aud){ const d=U.dist(p.x,p.y,aud.x,aud.y); if(d<190){ const n=U.norm(p.x-aud.x,p.y-aud.y); const w=(190-d)/190*2.6; vx+=n.x*w; vy+=n.y*w; } }
      // bullet dodge
      for(const b of G.eBullets){
        if(b.dead||b.fake) continue;
        const d=U.dist(p.x,p.y,b.x,b.y); if(d>140) continue;
        if((p.x-b.x)*b.vx+(p.y-b.y)*b.vy<=0) continue;
        const perp={x:-b.vy,y:b.vx};
        const side=(p.x-b.x)*perp.x+(p.y-b.y)*perp.y>=0?1:-1;
        const w=(140-d)/140*2.4, n=U.norm(perp.x*side,perp.y*side);
        vx+=n.x*w; vy+=n.y*w;
      }
      for(const z of G.zones){ if(z.kind==='ember'||z.kind==='trigger'){ const d=U.dist(p.x,p.y,z.x,z.y); if(d<z.r+48){ const n=U.norm(p.x-z.x,p.y-z.y); vx+=n.x*2.1; vy+=n.y*2.1; } } }
      if(foe){
        if(p.x<RX+70) vx+=(RX+70-p.x)/70*1.6;
        if(p.x>RX+RW-70) vx-=(p.x-(RX+RW-70))/70*1.6;
        if(p.y<RY+70) vy+=(RY+70-p.y)/70*1.6;
        if(p.y>RY+RH-70) vy-=(p.y-(RY+RH-70))/70*1.6;
        const beh=foe.beh;
        if(foe!==boss&&beh==='mirror'){         // Doubt: stand at center, it converges onto you
          const c={x:RX+RW/2,y:RY+RH/2}, d=U.dist(p.x,p.y,c.x,c.y);
          if(d>26){ const n=U.norm(c.x-p.x,c.y-p.y); vx+=n.x*1.8; vy+=n.y*1.8; }
        } else if(foe!==boss&&beh==='mimic'){    // Projection: hold still, it drifts in
          // (dodge/wall forces still apply)
        } else if(foe!==boss&&(beh==='shooter'||beh==='larper')){   // Ads flee: walk them down
          const n=U.norm(foe.x-p.x,foe.y-p.y); vx+=n.x*1.6; vy+=n.y*1.6;
        } else {
          const d=U.dist(p.x,p.y,foe.x,foe.y);
          const want=foe===boss?200:150;
          const rad=U.norm(foe.x-p.x,foe.y-p.y);
          const radW=U.clamp((d-want)/90,-1.6,1.1);
          vx+=rad.x*radW; vy+=rad.y*radW;
          const tan={x:-rad.y*this.orbitDir,y:rad.x*this.orbitDir};
          vx+=tan.x*0.85; vy+=tan.y*0.85;
          const fx=p.x+tan.x*56, fy=p.y+tan.y*56;
          if(fx<RX+40||fx>RX+RW-40||fy<RY+40||fy>RY+RH-40||this.solidAt(fx,fy)) this.orbitDir*=-1;
        }
      } else {
        let tgt=null;
        this._skipPk=this._skipPk||new Set();
        const pk=this.nearest(G.pickups.filter(k=>!k.dead&&!this._skipPk.has(k)&&!(k.type==='pill'&&p.pill!=null)&&!(k.type==='half'&&p.hp>=p.maxhp)&&!(k.type==='full'&&p.hp>=p.maxhp)),p);
        const ped=this.nearest((G.peds||[]).filter(d=>!d.taken&&(
          d.kind==='item'||d.kind==='boss'||d.kind==='npc'
          ||(d.kind==='cooler'&&p.hp<p.maxhp)
          ||(d.kind==='recruit'&&p.allies&&p.allies.length<3)
        )),p);
        if(pk) tgt=pk; else if(ped) tgt=ped;
        else if(G.trapdoor) tgt=G.trapdoor;
        else tgt=this.doorTarget();
        // give up on targets that aren't panning out (pickup in a rock, etc.)
        if(tgt===pk&&pk){
          if(this._pkTgt===pk){ this._pkT++; const prog=U.dist(p.x,p.y,pk.x,pk.y);
            if(this._pkT>240&&prog>=this._pkBest-6){ this._skipPk.add(pk); this.rep.errors.push('PKSKIP:'+pk.type+'@'+G.depth); this._pkTgt=null; }
            this._pkBest=Math.min(this._pkBest,prog);
          } else { this._pkTgt=pk; this._pkT=0; this._pkBest=U.dist(p.x,p.y,pk.x,pk.y); }
        } else this._pkTgt=null;
        if(tgt){ const wp=this.waypoint(tgt); const n=U.norm(wp.x-p.x,wp.y-p.y); vx+=n.x*1.2; vy+=n.y*1.2; }
      }
      const ah=U.norm(vx,vy);
      if(ah.x||ah.y){
        if(this.solidAt(p.x+ah.x*34,p.y+ah.y*34)){
          const perp={x:-ah.y,y:ah.x};
          const lo=!this.solidAt(p.x+perp.x*34,p.y+perp.y*34);
          vx+=(lo?perp.x:-perp.x)*1.7; vy+=(lo?perp.y:-perp.y)*1.7;
        }
      }
      this.move=(Math.abs(vx)+Math.abs(vy)>0.05)?U.norm(vx,vy):{x:0,y:0};
      // aim: bosses > healers > real enemies > fakes (they hold the doors)
      let shootAt=null;
      if(boss&&G.boss.vulnerable!==false) shootAt=boss;
      const healer=live.length>1?live.find(e=>e.beh==='buffer'):null;
      const ne=healer||this.nearest(live,p);
      if(ne&&(!shootAt||U.dist(p.x,p.y,ne.x,ne.y)<U.dist(p.x,p.y,shootAt.x,shootAt.y)*0.7)) shootAt=ne;
      if(!shootAt&&boss) shootAt=boss;
      if(!shootAt){ const anyE=this.nearest(G.enemies.filter(e=>!e.dying&&!e.charmed&&e.spawnT<=0&&e.id!=='auditor'),p); if(anyE) shootAt=anyE; }
      if(shootAt&&!p.flags.pacifist){
        if(this.losBlocked(p,shootAt)) this._losT++; else this._losT=0;
        if(this._losT>60){
          const n=U.norm(shootAt.x-p.x,shootAt.y-p.y);
          let mx=n.x,my=n.y;
          if(this.solidAt(p.x+n.x*34,p.y+n.y*34)){ const perp={x:-n.y,y:n.x}; const lo=!this.solidAt(p.x+perp.x*40,p.y+perp.y*40); mx+=(lo?perp.x:-perp.x)*1.4; my+=(lo?perp.y:-perp.y)*1.4; }
          this.move=U.norm(mx,my);
        }
        const d=U.dist(p.x,p.y,shootAt.x,shootAt.y), tt=d/(p.shotSpd||440);
        const lx=shootAt.x+(shootAt.vx||0)*tt, ly=shootAt.y+(shootAt.vy||0)*tt;
        const sp=p.effSpd?p.effSpd():225;
        this.aim=U.norm((lx-p.x)-this.move.x*sp*0.22*tt*2.2,(ly-p.y)-this.move.y*sp*0.22*tt*2.2);
      } else this.aim=null;
      if(p.abilCd<=0&&(live.length>=3||(boss&&U.dist(p.x,p.y,boss.x,boss.y)<180)||G.eBullets.length>14)){ try{ p.useAbility(G); }catch(e){ this.rep.errors.push('ability:'+e.message); } }
      if(p.pill!=null&&p.hp<=p.maxhp*0.4&&Math.random()<0.02){ try{ G.usePill(); }catch(e){ this.rep.errors.push('pill:'+e.message); } }
    },

    handleOverlays(){
      const st=G.state;
      if(st==='appealoffer'){ const b=document.getElementById('bAcceptDeath'); if(b){b.click(); this.rep.events.push('appeal-declined');} return true; }
      if(st==='bossdeal'){ const b=document.getElementById('bDealFinish'); if(b){b.click(); this.rep.events.push('deal-refused');} return true; }
      if(st==='document'){ const b=document.getElementById('bDocBack'); if(b){b.click(); this.rep.events.push('doc-read');} return true; }
      if(st==='compound'){ const b=document.getElementById('bFuseNo'); if(b){b.click(); this.rep.events.push('fuse-declined');} return true; }
      if(st==='rivalduel'){ const b=document.getElementById('bDuelNo'); if(b){b.click(); this.rep.events.push('duel-declined');} return true; }
      if(st==='payphone'){ const b=document.getElementById('bPhBack'); if(b){b.click(); this.rep.events.push('hung-up');} return true; }
      if(st==='handoffoffer'){ const b=document.getElementById('bMopNo'); if(b){b.click(); this.rep.events.push('mop-declined');} return true; }
      if(st==='firealarm'){ const b=document.getElementById('bAlarmNo'); if(b){b.click(); this.rep.events.push('alarm-resisted');} return true; }
      if(st==='openmic'){ const b=document.getElementById('bMicYes'); if(b){b.click(); this.rep.events.push('mic-supported');} return true; }
      if(st==='actuary'){ const b=document.getElementById('bActNo'); if(b){b.click(); this.rep.events.push('odds-declined');} return true; }
      if(st==='comorbid'){ const c=document.querySelector('.cmcard'); if(c){c.click(); this.rep.events.push('comorbid');} return true; }
      if(st==='handbook'){ const b=document.getElementById('bHbBack'); if(b){b.click(); this.rep.events.push('handbook-closed');} return true; }
      if(st==='cutscene'){ Story.skipScene(); return true; }
      if(st==='event'){ const c=document.querySelector('.cmcard'); if(c){c.click(); this.rep.events.push('event');} else { G.hideOverlay(); G.state='run'; } return true; }
      if(st==='ending'){ const b=document.getElementById('bEndKeep'); if(b){b.click(); this.rep.events.push('ending-keep');} return true; }
      if(st==='dead') return false;
      return null;
    },

    run(nSteps){
      this.hook();
      for(let i=0;i<nSteps;i++){
        const st=G.state;
        if(st==='dead'){ this.rep.deaths++; this.rep.cause=(G.player&&G.player._lastSrc)||'?'; break; }
        if(st!=='run'&&st!=='descend'){
          const h=this.handleOverlays();
          if(h===false) break;
          this._lastState===st?this._stateT++:(this._stateT=0,this._lastState=st);
          if(this._stateT>600){ this.rep.errors.push('STATE-STUCK:'+st); break; }
          try{ G.update(1/60); }catch(e){ this.rep.errors.push('update['+st+']:'+e.message); break; }
          this.rep.steps++; continue;
        }
        try{ this.steer(); }catch(e){ this.rep.errors.push('steer:'+e.message); }
        try{ G.update(1/60); }catch(e){ this.rep.errors.push('update:'+e.message); break; }
        this.rep.steps++; this.rep.simT+=1/60;
        const p=G.player;
        if(p){
          if(!isFinite(p.x)||!isFinite(p.y)||!isFinite(p.hp)){ this.rep.nan++; this.rep.errors.push('NaN player'); break; }
          if(this.rep.steps%30===0) this.rep.hpLog.push(Math.round(p.hp));
          if(this.rep.steps%720===0){
            const moved=U.dist(p.x,p.y,this._lastPos.x,this._lastPos.y);
            if(moved<20&&G.room&&(!G.room.cleared||this.doorTarget()||G.trapdoor)){
              this.rep.stuck++; this.rep.errors.push('STUCK@'+G.depth+' t='+G.room.type+(G.room.cleared?'c':''));
              // recenter to a free tile (room center may be a rock)
              let px=RX+RW/2, py=RY+RH/2;
              out2: for(let rad=0;rad<=4;rad++) for(let dc=-rad;dc<=rad;dc++) for(let dr=-rad;dr<=rad;dr++){
                if(Math.max(Math.abs(dc),Math.abs(dr))!==rad) continue;
                const c2=Math.floor(COLS/2)+dc, r2=Math.floor(ROWS/2)+dr;
                if(c2<0||r2<0||c2>=COLS||r2>=ROWS) continue;
                if(!tileSolid(G.room.layout,c2,r2)){ px=RX+(c2+0.5)*TILE; py=RY+(r2+0.5)*TILE; break out2; }
              }
              p.x=px; p.y=py;
            }
            this._lastPos={x:p.x,y:p.y};
          }
          this.rep.maxDepth=Math.max(this.rep.maxDepth,G.depth);
          // silent-idle watchdog: cleared room, nothing to fight, nowhere to go
          if(st==='run'&&this.rep.steps%20===0){
            const noExit=G.room&&G.room.cleared&&!G.enemies.some(e=>!e.dying&&e.id!=='auditor')&&!G.trapdoor
              &&!(G.peds||[]).some(d=>!d.taken&&(d.kind==='item'||d.kind==='boss'||d.kind==='npc'||d.kind==='recruit'||d.kind==='cooler'))
              &&!this.doorTarget();
            this._idleT=noExit?(this._idleT||0)+20:0;
            if(this._idleT>900){
              this.rep.errors.push('IDLE-NOEXIT@'+G.depth+' fl='+G.floorRooms.map(x=>x.type[0]+(x.visited?'v':'')+(x.cleared?'c':'')).join(' ')+' asc='+(G.ascent?1:0)+' keys='+p.keys);
              break;
            }
          }
        }
        if(this.rep.steps%300===0){ for(const e of G.enemies){ if(!isFinite(e.x)||!isFinite(e.y)||!isFinite(e.hp)){ this.rep.nan++; this.rep.errors.push('NaN enemy '+e.id); e.dying=true; } } }
      }
      this.unhook();
      this.rep.rooms=G.stats?G.stats.rooms:0;
      this.rep.kills=G.stats?G.stats.kills:0;
      return this.rep;
    },
    start(diag,opts){
      this.reset();
      G._startPrognosis=(opts&&opts.prognosis)||null;
      G._startProtocol=(opts&&opts.protocol)||null;
      G._startChronic=!!(opts&&opts.chronic);
      G.beginRun(diag||'adhd',null,!!(opts&&opts.variant));
      return 'started '+diag;
    }
  };
  window.__campaign = async function(configs, stepsPer){
    const results=[];
    for(const cfg of configs){
      B.start(cfg.diag,cfg);
      if(cfg.depth){ const p=G.player; p.dmg+=cfg.depth*0.6; p.maxhp+=cfg.depth; p.hp=p.maxhp; p.spd*=1.08; G.depth=cfg.depth; G.newFloor(); }
      const rep=B.run(stepsPer);
      results.push({ cfg:(cfg.diag||'adhd')+(cfg.variant?'II':'')+(cfg.protocol?'/'+cfg.protocol:'')+(cfg.depth?'@'+cfg.depth:''),
        simMin:+(rep.simT/60).toFixed(1), depth:rep.maxDepth, rooms:rep.rooms, kills:rep.kills,
        died:rep.deaths?rep.cause:null, stuck:rep.stuck, nan:rep.nan, errs:rep.errors, events:rep.events.slice(0,8) });
      if(G.state==='dead'){ try{ G.recordRun('dead'); }catch(e){} }
      G.showTitle();
    }
    return results;
  };
  window.__bossGauntlet2 = async function(list){
    const out=[];
    for(const cfg of list){
      B.start('adhd');
      const p=G.player;
      p.dmg=cfg.dmg||8; p.maxhp=20; p.hp=20; p.spd*=1.05;
      G.depth=cfg.depth||5; G.newFloor();
      G.bossId=cfg.id;
      const br=G.floorRooms.find(r=>r.type==='boss');
      G.enterRoom(br,null);
      if(!G.boss){ out.push({id:cfg.id,err:'no boss'}); continue; }
      G.boss.introT=0;
      B.hook(); B.reset();
      let steps=0; const cap=(cfg.cap||150)*60;
      while(steps<cap&&!G.boss.dead&&!p.dead){
        if(G.state!=='run'){ B.handleOverlays(); try{ G.update(1/60); }catch(e){ break; } steps++; continue; }
        try{ B.steer(); G.update(1/60); }catch(e){ B.rep.errors.push('upd:'+e.message); break; }
        steps++;
      }
      B.unhook();
      out.push({ id:cfg.id, killed:G.boss.dead, secs:+(steps/60).toFixed(1), hpLost:+(20-p.hp).toFixed(1), died:p.dead, errs:B.rep.errors.slice(0,4) });
      if(G.state==='dead') G.state='run';
      await new Promise(r=>setTimeout(r,120));
      if(G.state==='cutscene') Story.skipScene();
      if(G.state==='ending'){ const b=document.getElementById('bEndKeep'); if(b) b.click(); }
      G.showTitle();
    }
    return out;
  };
  return B;
})();
