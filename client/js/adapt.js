/* skyLens — background-adaptive colour.
   Reads the page's .dbp-bg photo, then sets --teal (accent) and the
   --text / --muted brightness so icons, labels and bars suit the photo.
   Warning colours (--gold, --storm, --emerald) are never touched. */
(function () {
  var DEFAULT_HUE = 170;              // original teal
  var root = document.documentElement;

  // Pure analysis of RGBA pixel data -> {hue, sat, lum}
  function analyze(d) {
    var n = 0, lum = 0, sx = 0, sy = 0, sat = 0, w = 0;
    for (var i = 0; i < d.length; i += 4) {
      var r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
      var mx = Math.max(r, g, b), mn = Math.min(r, g, b), c = mx - mn;
      lum += 0.2126 * r + 0.7152 * g + 0.0722 * b; n++;
      if (c < 0.04) continue;
      var h = mx === r ? ((g - b) / c) % 6 : mx === g ? (b - r) / c + 2 : (r - g) / c + 4;
      h = (h * 60 + 360) % 360;
      var s = c / (mx || 1), wt = s * mx;      // favour vivid, bright pixels
      sx += Math.cos(h * Math.PI / 180) * wt;
      sy += Math.sin(h * Math.PI / 180) * wt;
      sat += s; w += wt;
    }
    var hue = w ? (Math.atan2(sy, sx) * 180 / Math.PI + 360) % 360 : DEFAULT_HUE;
    return { hue: hue, sat: n ? sat / n : 0, lum: n ? lum / n : 0.2 };
  }

  function apply(a) {
    // low-colour photos (grey fog etc.) keep the default teal
    var hue = a.sat < 0.1 ? DEFAULT_HUE : a.hue;
    var L = Math.min(Math.max(a.lum, 0), 1);
    var textA  = Math.min(0.88, 0.76 + L * 0.2);
    var mutedA = Math.min(0.78, 0.64 + L * 0.25);
    root.style.setProperty('--teal', 'hsl(' + Math.round(hue) + ',44%,66%)');   // clear but restrained accent
    root.style.setProperty('--text', 'rgba(255,255,255,' + textA.toFixed(2) + ')');
    root.style.setProperty('--muted', 'rgba(255,255,255,' + mutedA.toFixed(2) + ')');
  }

  function run(url) {
    var img = new Image();
    img.onload = function () {
      try {
        var cv = document.createElement('canvas'); cv.width = cv.height = 48;
        var cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, 48, 48);
        apply(analyze(cx.getImageData(0, 0, 48, 48).data));
      } catch (e) { /* tainted canvas (file://) -> keep defaults */ }
    };
    img.src = url;
  }

  function urlOf(el) {
    var m = /url\(["']?([^"')]+)["']?\)/.exec(el.style.backgroundImage || getComputedStyle(el).backgroundImage);
    return m && m[1];
  }

  function init() {
    var bg = document.querySelector('.dbp-bg');
    if (!bg) {                                   // Hub: sample the hero video instead
      var v = document.querySelector('video.hc-video');
      if (!v) return;
      var done = false, grab = function () {
        if (done || v.readyState < 2) return; done = true;
        try {
          var cv = document.createElement('canvas'); cv.width = cv.height = 48;
          var cx = cv.getContext('2d'); cx.drawImage(v, 0, 0, 48, 48);
          apply(analyze(cx.getImageData(0, 0, 48, 48).data));
        } catch (e) {}
      };
      v.addEventListener('loadeddata', grab); v.addEventListener('playing', grab); grab();
      return;
    }
    var u = urlOf(bg); if (u) run(u);
    // follow background changes (Dashboard swaps it with the weather)
    new MutationObserver(function () { var n = urlOf(bg); if (n && n !== u) { u = n; run(u); } })
      .observe(bg, { attributes: true, attributeFilter: ['style', 'class'] });
  }

  window.skylensAdapt = { analyze: analyze, apply: apply, run: run };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
