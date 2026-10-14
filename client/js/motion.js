/* SkyLens motion layer — anime.js v3. Pure enhancement: if anime is missing or the
   user prefers reduced motion, nothing is hidden and nothing runs. */
(function(){
  if(!window.anime || matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  var $=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
  var clr=function(a){return a.complete=function(an){an.animatables.forEach(function(x){x.target.style.transform='';x.target.style.opacity='';});};};

  /* 1 ── Sidebar: logo drops in, icons stagger */
  var side=$('.site-sidebar .logo-mark, .site-sidebar .site-nav-icon');
  if(side.length){
    anime.set(side,{opacity:0,translateX:-14});
    anime({targets:side,opacity:1,translateX:0,delay:anime.stagger(70,{start:80}),duration:650,easing:'easeOutExpo',complete:clr({}).complete});
  }

  /* 2 ── Hero stagger (Hub + About + topic pages) */
  var hero=$('.hc-top > *, .hc-condition, .hc-cat, .hc-desc, .hc-right, .hcf-day, .ab2-hero .ab2-eyebrow, .ab2-hero .ab2-headline, .ab2-hero p, .ab2-cta > *, .ab2-version');
  if(hero.length){
    anime.set(hero,{opacity:0,translateY:22});
    anime({targets:hero,opacity:1,translateY:0,delay:anime.stagger(75,{start:220}),duration:900,easing:'easeOutExpo',complete:clr({}).complete});
  }

  /* 3 ── Hub: temperature counts up when live data lands; scroll hint bobs */
  var t=document.getElementById('hTemp');
  if(t){
    var busy=false, mo=new MutationObserver(function(){
      if(busy) return;
      var n=parseInt(t.textContent,10);
      if(isNaN(n)) return;
      busy=true;
      var o={v:0};
      anime({targets:o,v:n,round:1,duration:1400,easing:'easeOutExpo',
        update:function(){t.textContent=o.v;},
        complete:function(){t.textContent=n;setTimeout(function(){busy=false;},50);}});
    });
    mo.observe(t,{childList:true,characterData:true,subtree:true});
  }

  /* 4 ── Scroll reveals: cards, rows, facts, tables */
  var sel='.ab2-eyebrow, .ab2-card, .ab2-stats, .ab3-stack, .ab3-group, .lrn-feat, .lrn-card, .fact, .data-card, .sth-col, .quiz-section, .sec-lbl';
  var items=$(sel).filter(function(e){return !hero.some(function(h){return h===e||h.contains(e);});});
  if(items.length && 'IntersectionObserver' in window){
    anime.set(items,{opacity:0,translateY:28});
    var io=new IntersectionObserver(function(es){
      var vis=es.filter(function(x){return x.isIntersecting;}).map(function(x){io.unobserve(x.target);return x.target;});
      if(!vis.length) return;
      anime({targets:vis,opacity:1,translateY:0,delay:anime.stagger(90),duration:850,easing:'easeOutCubic',complete:clr({}).complete});
    },{threshold:.12,rootMargin:'0px 0px -6% 0px'});
    items.forEach(function(e){io.observe(e);});
  }

  /* 5 ── About: stat accent bars grow, chips pop in */
  var bars=$('.ab2-stat-bar');
  if(bars.length){
    anime.set(bars,{scaleY:0,transformOrigin:'50% 0%'});
    var bio=new IntersectionObserver(function(es){
      if(es.some(function(x){return x.isIntersecting;})){
        bio.disconnect();
        anime({targets:bars,scaleY:1,delay:anime.stagger(160,{start:250}),duration:900,easing:'easeOutElastic(1,.8)',complete:clr({}).complete});
      }
    },{threshold:.3});
    bio.observe(bars[0]);
  }
  var chips=$('.ab3-group .chips > *');
  if(chips.length){
    anime.set(chips,{opacity:0,scale:.85});
    var cio=new IntersectionObserver(function(es){
      var g=es.filter(function(x){return x.isIntersecting;});
      g.forEach(function(x){
        cio.unobserve(x.target);
        anime({targets:$('.chips > *',x.target),opacity:1,scale:1,delay:anime.stagger(35,{start:150}),duration:500,easing:'easeOutBack',complete:clr({}).complete});
      });
    },{threshold:.2});
    $('.ab3-group').forEach(function(g){cio.observe(g);});
  }

  /* 6 ── Table rows (topic pages) */
  var rows=$('.data-table tbody tr');
  if(rows.length && 'IntersectionObserver' in window){
    anime.set(rows,{opacity:0,translateX:-12});
    var rio=new IntersectionObserver(function(es){
      es.forEach(function(x){
        if(!x.isIntersecting) return;
        rio.unobserve(x.target);
        anime({targets:$('tbody tr',x.target),opacity:1,translateX:0,delay:anime.stagger(45),duration:600,easing:'easeOutQuad',complete:clr({}).complete});
      });
    },{threshold:.15});
    $('.data-table').forEach(function(tb){rio.observe(tb);});
  }

  /* 7 ── Icon spring on card hover */
  [['.lrn-card','.lrn-ico'],['.ab2-card','i']].forEach(function(p){
    $(p[0]).forEach(function(card){
      var ic=card.querySelector(p[1]); if(!ic) return;
      card.addEventListener('mouseenter',function(){
        anime.remove(ic);
        anime({targets:ic,scale:[1,1.18,1],rotate:[0,-8,0],duration:700,easing:'easeOutElastic(1,.6)'});
      });
    });
  });
})();
