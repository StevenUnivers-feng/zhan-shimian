/* WebAudio 合成音效 + BGM，零外部音频文件 */
(function () {
  window.ZSM = window.ZSM || {};
  var ctxA = null, master = null, musicGain = null;
  var sfxOn = ZSM.storage.get('zsm_sfx', true);
  var musicOn = ZSM.storage.get('zsm_music', true);
  var musicTimer = null, nextNote = 0, step = 0;

  function ac() {
    if (!ctxA) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctxA = new AC();
      master = ctxA.createGain(); master.gain.value = 0.9; master.connect(ctxA.destination);
      musicGain = ctxA.createGain(); musicGain.gain.value = 0.0; musicGain.connect(master);
    }
    if (ctxA.state === 'suspended') ctxA.resume();
    return ctxA;
  }
  function unlock() { var c = ac(); if (c && musicOn) startMusic(); }

  function tone(freq, dur, type, gain, slideTo, dest) {
    var c = ac(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(gain || 0.2, c.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g); g.connect(dest || master);
    o.start(); o.stop(c.currentTime + dur + 0.02);
  }
  function noise(dur, gain, f0, f1, q) {
    var c = ac(); if (!c) return;
    var len = Math.max(1, Math.floor(c.sampleRate * dur));
    var buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var src = c.createBufferSource(); src.buffer = buf;
    var f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q || 1;
    f.frequency.setValueAtTime(f0, c.currentTime);
    f.frequency.exponentialRampToValueAtTime(f1, c.currentTime + dur);
    var g = c.createGain();
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(); src.stop(c.currentTime + dur);
  }

  var SFX = {
    click: function () { tone(660, 0.08, 'square', 0.12); },
    collect: function () { tone(880, 0.1, 'sine', 0.18); setTimeout(function () { tone(1320, 0.12, 'sine', 0.16); }, 60); },
    slice: function () { noise(0.16, 0.3, 3000, 700, 2); },
    fling: function () { noise(0.22, 0.25, 300, 1800, 1); },
    collide: function () { tone(180, 0.09, 'square', 0.16); noise(0.08, 0.2, 900, 300, 1); },
    hurt: function () { tone(220, 0.25, 'sawtooth', 0.2, 110); },
    pop: function () { tone(520, 0.08, 'sine', 0.15, 780); },
    win: function () { [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { tone(f, 0.22, 'triangle', 0.18); }, i * 110); }); },
    fail: function () { [392, 330, 262].forEach(function (f, i) { setTimeout(function () { tone(f, 0.3, 'triangle', 0.18); }, i * 160); }); }
  };
  function sfx(name) { if (!sfxOn) return; var f = SFX[name]; if (f) f(); }

  /* BGM：轻柔夜曲循环 */
  var SCALE = [261.6, 311.1, 349.2, 392.0, 466.2, 523.3];
  function scheduleMusic() {
    var c = ac(); if (!c) return;
    while (nextNote < c.currentTime + 0.3) {
      var beat = 0.28;
      var n = SCALE[(step * 3 + (step % 4)) % SCALE.length];
      var o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle'; o.frequency.value = (step % 8 === 0) ? n / 2 : n;
      g.gain.setValueAtTime(0.0001, nextNote);
      g.gain.exponentialRampToValueAtTime(0.06, nextNote + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, nextNote + beat * 0.95);
      o.connect(g); g.connect(musicGain);
      o.start(nextNote); o.stop(nextNote + beat);
      nextNote += beat; step++;
    }
  }
  function startMusic() {
    var c = ac(); if (!c || musicTimer) return;
    musicGain.gain.value = musicOn ? 0.5 : 0;
    nextNote = c.currentTime + 0.1; step = 0;
    musicTimer = setInterval(scheduleMusic, 120);
  }
  function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } if (musicGain) musicGain.gain.value = 0; }

  ZSM.audio = {
    unlock: unlock, sfx: sfx,
    isSfx: function () { return sfxOn; }, isMusic: function () { return musicOn; },
    setSfx: function (on) { sfxOn = !!on; ZSM.storage.set('zsm_sfx', sfxOn); },
    setMusic: function (on) {
      musicOn = !!on; ZSM.storage.set('zsm_music', musicOn);
      if (musicGain) musicGain.gain.value = musicOn ? 0.5 : 0;
      if (musicOn) startMusic(); else stopMusic();
    }
  };
})();
