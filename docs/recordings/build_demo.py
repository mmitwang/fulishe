# -*- coding: utf-8 -*-
"""
福礼社平台 录屏配音/字幕/演示文档 构建脚本

流程：
1. 每段视频的解说句 → Windows SAPI（Microsoft Huihui）逐句生成中文配音 WAV
2. 实测每句 WAV 时长 → 生成与配音精确对齐的字幕时间轴
3. ffmpeg 拼接配音 → 与 webm 合成 mp4（libx264 + aac + drawtext 硬字幕）
4. 输出 demo-data.json（供 HTML 演示文档逐句高亮）

运行：python docs/recordings/build_demo.py
"""
import json
import re
import subprocess
import tempfile
from pathlib import Path

FF = r'C:\Users\TonyWang\AppData\Local\Programs\Python\Python310\lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win64-v4.2.2.exe'
ROOT = Path(__file__).resolve().parent          # docs/recordings
FONT = 'C\\:/Windows/Fonts/msyh.ttc'            # drawtext 滤镜内路径转义

# 每段视频：file=完整文件名(不含扩展名)、dur=视频时长(秒)、lines=解说句（仅中文标点）
VIDEOS = [
    {
        'id': '01', 'file': '01-超级管理员-平台初始化和系统管理',
        'title': '超级管理员 · 平台初始化和系统管理', 'dur': 23,
        'lines': [
            '本段演示超级管理员的核心操作。',
            '使用管理员账号登录后台并查看工作台数据。',
            '用户管理支持查询和新增用户。',
            '角色与菜单管理用于分配权限。',
            '租户管理维护入驻商户信息。',
            '最后在数据备份中执行手动备份。',
        ],
    },
    {
        'id': '02', 'file': '02-商户管理员-商户工作台和商品订单财务',
        'title': '商户管理员 · 商户工作台和商品订单财务', 'dur': 28,
        'lines': [
            '本段演示商户管理员的日常经营操作。',
            '工作台汇总商品订单与财务概况。',
            '商品管理支持查询与新增商品。',
            '订单列表可查看交易明细。',
            '支付退款与发票模块处理资金往来。',
            '供应链页面管理采购库存与结算。',
            '各环节数据实时联动。',
        ],
    },
    {
        'id': '03', 'file': '03-采购专员-供应商和采购入库',
        'title': '采购专员 · 供应商和采购入库', 'dur': 20,
        'lines': [
            '本段演示采购专员的业务流程。',
            '采购单页面支持查询与新建采购。',
            '供应商管理维护合作关系。',
            '库存页面实时反映入库情况。',
            '发货与结算完成对账闭环。',
        ],
    },
    {
        'id': '04', 'file': '04-供应商-采购接单发货和对账',
        'title': '供应商 · 采购接单发货和对账', 'dur': 12,
        'lines': [
            '本段演示供应商的协作操作。',
            '供应商查看采购单并安排发货。',
            '对账页面核对结算数据。',
        ],
    },
    {
        'id': '05', 'file': '05-运营专员-商品订单和分销运营',
        'title': '运营专员 · 商品订单和分销运营', 'dur': 17,
        'lines': [
            '本段演示运营专员的日常工作。',
            '商品管理维护在售商品信息。',
            '分销规则与推广订单驱动增长。',
            '发票页面处理开票申请。',
        ],
    },
    {
        'id': '06', 'file': '06-分销商-选品分享和佣金',
        'title': '分销商 · 选品分享和佣金', 'dur': 12,
        'lines': [
            '本段演示分销商的推广操作。',
            '选品中心挑选商品并生成分享。',
            '佣金页面查看推广收益。',
        ],
    },
    {
        'id': '07', 'file': '07-普通用户-商城浏览下单支付和售后',
        'title': '普通用户 · 商城浏览下单支付和售后', 'dur': 24,
        'lines': [
            '本段演示普通用户的完整购物流程。',
            '登录商城后浏览首页推荐商品。',
            '商品详情页查看图文与规格。',
            '加入购物车并提交订单。',
            '收银台完成模拟支付。',
            '订单中心可查看状态并申请售后。',
        ],
    },
]


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')


def tts(lines, work: Path, tag: str):
    """逐句 SAPI 生成 WAV，返回 wav 路径列表"""
    jf = work / f'{tag}_lines.json'
    jf.write_text(json.dumps(lines, ensure_ascii=False), encoding='utf-8')
    ps1 = work / f'{tag}_tts.ps1'
    ps1.write_text(
        "param($json, $outdir)\n"
        "Add-Type -AssemblyName System.Speech\n"
        "$lines = [IO.File]::ReadAllText($json, [Text.Encoding]::UTF8) | ConvertFrom-Json\n"
        "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer\n"
        "$s.SelectVoice('Microsoft Huihui Desktop')\n"
        "$s.Rate = 0\n"
        "$i = 0\n"
        "foreach ($line in $lines) {\n"
        f"  $f = Join-Path $outdir ('{tag}_line_' + $i.ToString('00') + '.wav')\n"
        "  $s.SetOutputToWaveFile($f)\n"
        "  $s.Speak([string]$line)\n"
        "  $i++\n"
        "}\n"
        "$s.Dispose()\n",
        encoding='utf-8')
    r = run(['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', str(ps1),
             '-json', str(jf), '-outdir', str(work)])
    wavs = sorted(work.glob(f'{tag}_line_*.wav'))
    if len(wavs) != len(lines):
        raise RuntimeError(f'TTS 失败 {tag}: {r.stdout}\n{r.stderr}')
    return wavs


def wav_duration(p: Path) -> float:
    r = run([FF, '-hide_banner', '-i', str(p)])
    m = re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)', r.stderr)
    if not m:
        raise RuntimeError(f'无法读取时长: {p}')
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))


def concat_wav(wavs, out: Path, work: Path, tag: str):
    lst = work / f'{tag}_concat.txt'
    lst.write_text(''.join(f"file '{w.as_posix()}'\n" for w in wavs), encoding='utf-8')
    r = run([FF, '-y', '-f', 'concat', '-safe', '0', '-i', str(lst),
             '-ar', '44100', '-ac', '1', str(out)])
    if not out.exists():
        raise RuntimeError(f'配音拼接失败 {tag}: {r.stderr[-800:]}')


def drawtext_filters(lines, durs):
    """每句一个 drawtext，enable 按配音时间轴显示，与配音对齐"""
    parts = []
    t = 0.0
    for line, d in zip(lines, durs):
        start, end = t, t + d
        txt = line.replace("'", '').replace(':', '：').replace(',', '，').replace('%', '％')
        parts.append(
            f"drawtext=fontfile='{FONT}':text='{txt}':fontsize=26:fontcolor=white:"
            f"box=1:boxcolor=black@0.55:boxborderw=12:x=(w-text_w)/2:y=h-66:"
            f"enable='between(t,{start:.2f},{end:.2f})'")
        t = end
    return ','.join(parts)


def main():
    work = Path(tempfile.gettempdir()) / 'fulishe-demo-build'
    work.mkdir(parents=True, exist_ok=True)
    demo = []
    for v in VIDEOS:
        tag = f"v{v['id']}"
        print(f"[{v['id']}] {v['title']} ...", flush=True)
        webm = ROOT / f"{v['file']}.webm"
        if not webm.exists():
            raise RuntimeError(f'找不到源视频 {webm}')
        wavs = tts(v['lines'], work, tag)
        durs = [wav_duration(w) for w in wavs]
        voice = work / f'{tag}_voice.wav'
        concat_wav(wavs, voice, work, tag)
        out = ROOT / f"{v['file']}.mp4"
        vf = drawtext_filters(v['lines'], durs)
        r = run([FF, '-y', '-i', str(webm), '-i', str(voice),
                 '-vf', vf, '-af', 'apad',
                 '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p',
                 '-c:a', 'aac', '-b:a', '128k',
                 '-t', str(v['dur']), '-movflags', '+faststart', str(out)])
        if not out.exists():
            raise RuntimeError(f'合成失败 {v["id"]}: {r.stderr[-1200:]}')
        size = out.stat().st_size / 1024 / 1024
        t = 0.0
        cues = []
        for line, d in zip(v['lines'], durs):
            cues.append({'start': round(t, 2), 'end': round(t + d, 2), 'text': line})
            t += d
        demo.append({'id': v['id'], 'title': v['title'], 'dur': v['dur'],
                     'mp4': out.name, 'webm': webm.name, 'cues': cues})
        print(f"    配音 {t:.1f}s / 视频 {v['dur']}s → {out.name} ({size:.2f} MB)", flush=True)
    (ROOT / 'demo-data.json').write_text(json.dumps(demo, ensure_ascii=False, indent=2), encoding='utf-8')
    print('\n全部完成，数据已写入 demo-data.json')


if __name__ == '__main__':
    main()
