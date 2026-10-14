/* SkyLens Dashboard motion — anime.js v3. Opacity/transform only: no layout, size or padding changes. */
(function(){
  if(!window.anime || matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  var $=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
  var done=function(an){an.animatables.forEach(function(x){x.target.style.transform='';x.target.style.opacity='';});};

  var side=$('.site-sidebar .logo-mark, .site-sidebar .site-nav-icon');
  if(side.length){
    anime.set(side,{opacity:0,translateX:-14});
    anime({targets:side,opacity:1,translateX:0,delay:anime.stagger(70,{start:80}),duration:650,easing:'easeOutExpo',complete:done});
  }

  var CARD='.data-card, .dbx-card, .db-mini-card, .db-map-wrap, .db-f10-card, .db-recent, .alert-zone';
  function reveal(view,start){
    var all=$(CARD,view);
    var els=all.filter(function(e){return !all.some(function(o){return o!==e&&o.contains(e);});});
    if(!els.length) return;
    anime.remove(els);
    anime.set(els,{opacity:0,translateY:18,scale:.985});
    anime({targets:els,opacity:1,translateY:0,scale:1,delay:anime.stagger(70,{start:start||0}),duration:800,easing:'easeOutExpo',complete:done});
  }

  var first=document.querySelector('.db-view.act');
  if(first) reveal(first,200);

  /* re-run when the user switches view tabs */
  var views=$('.db-view');
  var mo=new MutationObserver(function(ms){
    ms.forEach(function(m){
      var v=m.target;
      var was=(m.oldValue||'').split(/\s+/).indexOf('act')>-1;
      if(v.classList.contains('act') && !was) reveal(v,60);
    });
  });
  views.forEach(function(v){mo.observe(v,{attributes:true,attributeFilter:['class'],attributeOldValue:true});});
})();
