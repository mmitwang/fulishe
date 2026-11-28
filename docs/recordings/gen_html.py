# -*- coding: utf-8 -*-
"""读取 demo-data.json，生成单文件 HTML 演示文档（数据内嵌，双击即可打开）"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DOCS = ROOT.parent
data = json.loads((ROOT / 'demo-data.json').read_text(encoding='utf-8'))

TEMPLATE = r'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>福礼社平台 · 角色功能演示</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Microsoft YaHei','PingFang SC',sans-serif; background:#f5f6fa; color:#303133; }
  header { background:linear-gradient(135deg,#c8102e,#e0463c); color:#fff; padding:22px 32px; }
  header h1 { font-size:22px; font-weight:600; }
  header p { margin-top:6px; font-size:13px; opacity:.85; }
  .wrap { display:flex; gap:20px; max-width:1440px; margin:24px auto; padding:0 24px; align-items:flex-start; }
  aside { width:300px; flex-shrink:0; background:#fff; border-radius:12px; padding:12px; box-shadow:0 2px 12px rgba(0,0,0,.06); }
  .item { padding:13px 14px; border-radius:9px; cursor:pointer; margin-bottom:6px; border:1px solid transparent; transition:all .15s; }
  .item:hover { background:#fdf0f0; }
  .item.active { background:#fdf0f0; border-color:#c8102e; }
  .item .t { font-size:14px; font-weight:600; line-height:1.5; }
  .item.active .t { color:#c8102e; }
  .item .m { font-size:12px; color:#909399; margin-top:4px; }
  main { flex:1; min-width:0; }
  .card { background:#fff; border-radius:12px; padding:20px; box-shadow:0 2px 12px rgba(0,0,0,.06); margin-bottom:20px; }
  h2 { font-size:18px; margin-bottom:14px; }
  video { width:100%; border-radius:10px; background:#000; display:block; }
  .cue { padding:10px 14px; border-radius:8px; font-size:14px; line-height:1.6; cursor:pointer; color:#606266; display:flex; gap:10px; }
  .cue:hover { background:#f5f6fa; }
  .cue.on { background:#fdf0f0; color:#c8102e; font-weight:600; }
  .cue .no { flex-shrink:0; width:22px; height:22px; border-radius:50%; background:#e4e7ed; color:#606266; font-size:12px; display:flex; align-items:center; justify-content:center; margin-top:2px; }
  .cue.on .no { background:#c8102e; color:#fff; }
  .tip { font-size:12px; color:#909399; line-height:1.8; }
  footer { text-align:center; padding:20px; font-size:12px; color:#909399; }
</style>
</head>
<body>
<header>
  <h1>福礼社平台 · 角色功能演示</h1>
  <p>七类角色关键工作流录屏 ｜ 内嵌中文字幕 ｜ 中文语音解说 ｜ 点击左侧切换角色，点击下方解说词跳转对应片段</p>
</header>
<div class="wrap">
  <aside id="list"></aside>
  <main>
    <div class="card">
      <h2 id="title"></h2>
      <video id="player" controls playsinline></video>
      <p class="tip" style="margin-top:10px">视频已内嵌硬字幕与中文配音（语音由系统合成），可直接播放，无需联网。</p>
    </div>
    <div class="card">
      <h2>解说词 · 点击跳转</h2>
      <div id="cues"></div>
    </div>
  </main>
</div>
<footer>福礼社电商平台 · 功能演示文档 ｜ 视频与解说一一对应，名称与实际操作匹配</footer>
<script>
const DATA = __DATA__;
const list = document.getElementById('list');
const player = document.getElementById('player');
const title = document.getElementById('title');
const cuesBox = document.getElementById('cues');
let cur = 0;

DATA.forEach((v, i) => {
  const d = document.createElement('div');
  d.className = 'item' + (i === 0 ? ' active' : '');
  d.innerHTML = '<div class="t">' + v.title + '</div><div class="m">时长 ' + v.dur + ' 秒 · ' + v.cues.length + ' 段解说</div>';
  d.onclick = () => select(i);
  list.appendChild(d);
});

function select(i) {
  cur = i;
  const v = DATA[i];
  [...list.children].forEach((el, j) => el.classList.toggle('active', j === i));
  title.textContent = v.title;
  player.src = 'recordings/' + encodeURI(v.mp4);
  cuesBox.innerHTML = '';
  v.cues.forEach((c, j) => {
    const d = document.createElement('div');
    d.className = 'cue';
    d.innerHTML = '<span class="no">' + (j + 1) + '</span><span>' + c.text + '</span>';
    d.onclick = () => { player.currentTime = c.start + 0.05; player.play(); };
    cuesBox.appendChild(d);
  });
  player.play().catch(() => {});
}

player.addEventListener('timeupdate', () => {
  const t = player.currentTime;
  const cues = DATA[cur].cues;
  [...cuesBox.children].forEach((el, j) => {
    el.classList.toggle('on', t >= cues[j].start && t < cues[j].end);
  });
});

select(0);
player.pause();
</script>
</body>
</html>
'''

html = TEMPLATE.replace('__DATA__', json.dumps(data, ensure_ascii=False))
out = DOCS / '平台功能演示.html'
out.write_text(html, encoding='utf-8')
print(f'已生成 {out}（{out.stat().st_size / 1024:.1f} KB）')
