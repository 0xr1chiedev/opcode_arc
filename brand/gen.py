import math, base64
SW = 9.0; ADV = 40; TRK = 8; RC = 12.5
BONE='#F1EFE9'; INK='#09090A'; ORG='#FF5B1F'
HS = SW/2; L, T, Rt, B = HS, HS, 40-HS, 40-HS
def corner(x, y): return f'A{RC} {RC} 0 0 0 {x} {y}'
def ring():
    return (f'M{Rt} {T+RC}' f'A{RC} {RC} 0 0 0 {Rt-RC} {T}' f'H{L+RC}' f'A{RC} {RC} 0 0 0 {L} {T+RC}'
            f'V{B-RC}' f'A{RC} {RC} 0 0 0 {L+RC} {B}' f'H{Rt-RC}' f'A{RC} {RC} 0 0 0 {Rt} {B-RC}' 'Z')
def glyph(ch):
    if ch=='o': return [ring()]
    if ch=='p': return [ring(), f'M{HS} 0V66']
    if ch=='d': return [ring(), f'M{40-HS} -26V40']
    if ch=='c': return [f'M{Rt-2} {T}H{L+RC}A{RC} {RC} 0 0 0 {L} {T+RC}V{B-RC}A{RC} {RC} 0 0 0 {L+RC} {B}H{Rt-2}']
    if ch=='e': return [f'M{L} 20.5H{Rt}V{T+RC}A{RC} {RC} 0 0 0 {Rt-RC} {T}H{L+RC}A{RC} {RC} 0 0 0 {L} {T+RC}V{B-RC}A{RC} {RC} 0 0 0 {L+RC} {B}H{Rt-1}']
    raise ValueError(ch)
KERN = {'c':-5}
def word(text='opcode', color=BONE, cursor=True, x0=0, y0=0):
    out=[]; x=x0
    for ch in text:
        for d in glyph(ch): out.append(f'<path d="{d}" transform="translate({x} {y0})"/>')
        x += ADV + TRK + KERN.get(ch,0)
    g = f'<g fill="none" stroke="{color}" stroke-width="{SW}" stroke-linecap="butt" stroke-linejoin="miter">' + ''.join(out) + '</g>'
    if cursor: g += f'<rect x="{x}" y="{y0}" width="16" height="40" fill="{ORG}"/>'; x += 16
    return g, x
def mark_inner(color=BONE):
    g = f'<g fill="none" stroke="{color}" stroke-width="{SW}" stroke-linecap="butt">' + ''.join(f'<path d="{d}"/>' for d in glyph('p')) + '</g>'
    g += f'<rect x="48" y="0" width="16" height="40" fill="{ORG}"/>'
    return g  # bbox x 0..64, y 0..66
def mark_svg(size=1024, bg=INK, fg=BONE, rounded=True, border=True):
    # 64 x 66 glyph centered optically in 120 box
    s = 120; ox = (s-64)/2; oy = (s-66)/2 + 1
    rect = f'<rect width="{s}" height="{s}" rx="{14 if rounded else 0}" fill="{bg}"/>'
    bd = f'<rect x="1" y="1" width="{s-2}" height="{s-2}" rx="{13 if rounded else 0}" fill="none" stroke="#2C2C32" stroke-width="2"/>' if border else ''
    ticks = ''.join(f'<path d="M{x} 6v4M{x} {s-10}v4" stroke="#3A3A41" stroke-width="1.2"/>' for x in (30,45,60,75,90))
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {s} {s}" width="{size}" height="{size}">{rect}{bd}{ticks}<g transform="translate({ox} {oy})">{mark_inner(fg)}</g></svg>'
def wordmark_svg(color=BONE, bg=None, pad=24, with_mark=False):
    g, w = word('opcode', color)
    W = w + pad*2; H = 92 + pad*2
    body = f'<g transform="translate({pad} {pad+26})">{g}</g>'
    bgr = f'<rect width="{W}" height="{H}" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W*4}" height="{H*4}">{bgr}{body}</svg>', W, H
def font_face():
    def b64(p): return base64.b64encode(open(p,'rb').read()).decode()
    m='node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-{}-normal.woff2'
    c='node_modules/@fontsource/ibm-plex-sans-condensed/files/ibm-plex-sans-condensed-latin-{}-normal.woff2'
    return ''.join([f"@font-face{{font-family:'Plex Mono';font-weight:{w};src:url(data:font/woff2;base64,{b64(m.format(w))}) format('woff2')}}" for w in (400,500,600)] + [f"@font-face{{font-family:'Plex Cond';font-weight:{w};src:url(data:font/woff2;base64,{b64(c.format(w))}) format('woff2')}}" for w in (500,600)])
def banner_svg():
    W,H = 1500,500
    dots = '<pattern id="dg" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#1E1E23"/></pattern>'
    g, ww = word('opcode', BONE)
    sc = 1.62
    wm = f'<g transform="translate(120 {150+26*sc}) scale({sc})">{g}</g>'
    listing = [
      ('0x00','PAX.ASK','"review my lease"',''),
      ('0x04','AXP.MATCH','agent=lumen  sla=5m',''),
      ('0x08','AXP.BUDGET','0.50 USDC',''),
      ('0x0C','AXP.FUND','escrow ← pax.wallet','hl'),
      ('0x10','AXP.SUBMIT','deliverable=0x9f…c2',''),
      ('0x14','AXP.SETTLE','95% agent · 5% protocol',''),
      ('0x18','MINT.LAUNCH','$LUMEN  curve=USDC',''),
      ('0x1C','HLT','',''),
    ]
    lx, ly, lh = 905, 112, 36
    rows = []
    for i,(a,op,arg,hl) in enumerate(listing):
        y = ly + i*lh
        if hl: rows.append(f'<rect x="{lx-14}" y="{y-24}" width="482" height="34" fill="#FF5B1F" fill-opacity=".10"/><rect x="{lx-14}" y="{y-24}" width="3" height="34" fill="#FF5B1F"/>')
        rows.append(f'<text x="{lx}" y="{y}" class="ad">{a}</text><text x="{lx+70}" y="{y}" class="op{" hl" if hl else ""}">{op}</text><text x="{lx+222}" y="{y}" class="ar">{arg}</text>')
    rows.append(f'<rect x="{lx+70}" y="{ly+7*lh-20}" width="12" height="22" fill="#FF5B1F"><animate attributeName="opacity" values="1;0;1" dur="1.1s" repeatCount="indefinite"/></rect>' if False else '')
    corner = lambda x,y,dx,dy: f'<path d="M{x} {y+dy*18}V{y}H{x+dx*18}" fill="none" stroke="#3A3A41" stroke-width="1.5"/>'
    ruler = ''.join(f'<path d="M{x} {H-26}v{8 if x%100==0 else 4}" stroke="#2C2C32"/>' for x in range(40, W-30, 20))
    css = font_face() + ".ad{font:400 15px 'Plex Mono';fill:#5D5B55}.op{font:500 16px 'Plex Mono';fill:#C8C5BD;letter-spacing:.02em}.op.hl{fill:#FF8A5C}.ar{font:400 15px 'Plex Mono';fill:#8B887F}.tg{font:600 30px 'Plex Cond';fill:#F1EFE9;letter-spacing:.01em}.sm{font:500 13px 'Plex Mono';fill:#8B887F;letter-spacing:.14em}.lbl{font:500 11px 'Plex Mono';fill:#5D5B55;letter-spacing:.14em}"
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}"><defs><style>{css}</style>{dots}</defs>
<rect width="{W}" height="{H}" fill="#09090A"/><rect width="{W}" height="{H}" fill="url(#dg)"/>
<rect x="860" y="56" width="580" height="340" fill="#0F0F11" stroke="#202024"/>
<path d="M860 86H1440" stroke="#202024"/><text x="878" y="76" class="lbl">AGENT.ASM</text><text x="1422" y="76" text-anchor="end" class="lbl">ARC 5042</text>
{''.join(rows)}
<path d="M{lx+52} 92V{ly+7*lh+12}" stroke="#202024"/>
{wm}
<text x="122" y="{150+26*sc+40*sc+70}" class="tg">Opcodes for the agent economy.</text>
<text x="122" y="{150+26*sc+40*sc+104}" class="sm">PAX · AXP · MINT — SETTLED IN USDC ON ARC</text>
{corner(24,24,1,1)}{corner(W-24,24,-1,1)}{corner(24,H-24,1,-1)}{corner(W-24,H-24,-1,-1)}
{ruler}
</svg>'''
open('mark.svg','w').write(mark_svg())
open('mark-flat.svg','w').write(mark_svg(rounded=False, border=False))
s,W,Hh = wordmark_svg(BONE); open('wordmark-dark-bg.svg','w').write(s.replace('<svg','<svg style="background:#09090A"'))
s,W,Hh = wordmark_svg(INK); open('wordmark-light-bg.svg','w').write(s)
open('banner.svg','w').write(banner_svg())
# lockup: mark + wordmark
g, w = word('opcode', BONE)
lock = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w+180} 160" width="{(w+180)*4}" height="640"><rect width="100%" height="100%" fill="#09090A"/><g transform="translate(20 20)">{mark_svg().split(">",1)[1].rsplit("</svg>",1)[0].replace("viewBox","data-v")}</g></svg>'
print('ok', W, Hh)
