"""Build Opcode into a single self-contained index.html.

Usage:  python3 build.py            -> apps/web/index.html (full document, open it in a browser)
        python3 build.py --fragment -> dist/opcode.fragment.html (body-only, used for the claude.ai artifact)
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')
def rd(name): return open(os.path.join(SRC, name), encoding='utf-8').read()

head = '''<title>Opcode</title>
<script>document.documentElement.dataset.theme='dark';</script>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%20120%20120%22%20%3E%3Crect%20width%3D%22120%22%20height%3D%22120%22%20rx%3D%2214%22%20fill%3D%22%2309090A%22/%3E%3Crect%20x%3D%221%22%20y%3D%221%22%20width%3D%22118%22%20height%3D%22118%22%20rx%3D%2213%22%20fill%3D%22none%22%20stroke%3D%22%232C2C32%22%20stroke-width%3D%222%22/%3E%3Cpath%20d%3D%22M30%206v4M30%20110v4%22%20stroke%3D%22%233A3A41%22%20stroke-width%3D%221.2%22/%3E%3Cpath%20d%3D%22M45%206v4M45%20110v4%22%20stroke%3D%22%233A3A41%22%20stroke-width%3D%221.2%22/%3E%3Cpath%20d%3D%22M60%206v4M60%20110v4%22%20stroke%3D%22%233A3A41%22%20stroke-width%3D%221.2%22/%3E%3Cpath%20d%3D%22M75%206v4M75%20110v4%22%20stroke%3D%22%233A3A41%22%20stroke-width%3D%221.2%22/%3E%3Cpath%20d%3D%22M90%206v4M90%20110v4%22%20stroke%3D%22%233A3A41%22%20stroke-width%3D%221.2%22/%3E%3Cg%20transform%3D%22translate%2828.0%2028.0%29%22%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%23F1EFE9%22%20stroke-width%3D%229.0%22%20stroke-linecap%3D%22butt%22%3E%3Cpath%20d%3D%22M35.5%2017.0A12.5%2012.5%200%200%200%2023.0%204.5H17.0A12.5%2012.5%200%200%200%204.5%2017.0V23.0A12.5%2012.5%200%200%200%2017.0%2035.5H23.0A12.5%2012.5%200%200%200%2035.5%2023.0Z%22/%3E%3Cpath%20d%3D%22M4.5%200V66%22/%3E%3C/g%3E%3Crect%20x%3D%2248%22%20y%3D%220%22%20width%3D%2216%22%20height%3D%2240%22%20fill%3D%22%23FF5B1F%22/%3E%3C/g%3E%3C/svg%3E">
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap">
'''
svg = '''<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="fmark" viewBox="0 0 120 120"><rect width="120" height="120" rx="14" fill="#09090A"/><rect x="1" y="1" width="118" height="118" rx="13" fill="none" stroke="#2C2C32" stroke-width="2"/><path d="M30 6v4M30 110v4" stroke="#3A3A41" stroke-width="1.2"/><path d="M45 6v4M45 110v4" stroke="#3A3A41" stroke-width="1.2"/><path d="M60 6v4M60 110v4" stroke="#3A3A41" stroke-width="1.2"/><path d="M75 6v4M75 110v4" stroke="#3A3A41" stroke-width="1.2"/><path d="M90 6v4M90 110v4" stroke="#3A3A41" stroke-width="1.2"/><g transform="translate(28.0 28.0)"><g fill="none" stroke="#F1EFE9" stroke-width="9.0" stroke-linecap="butt"><path d="M35.5 17.0A12.5 12.5 0 0 0 23.0 4.5H17.0A12.5 12.5 0 0 0 4.5 17.0V23.0A12.5 12.5 0 0 0 17.0 35.5H23.0A12.5 12.5 0 0 0 35.5 23.0Z"/><path d="M4.5 0V66"/></g><rect x="48" y="0" width="16" height="40" fill="#FF5B1F"/></g></symbol></defs></svg>
'''
css = rd('style.css') + '\n' + rd('skin.css') + '\n' + rd('pro.css')
js = ''.join(rd(p) for p in ['a0.js', 'a1.js', 'a2.js', 'a3.js', 'a5.js', 'a4.js'])
body = '<style>' + css + '</style>\n' + svg + '<div id="root"></div>\n' + rd('wp.html') + '\n<script>\n' + js + '\n</script>\n'

if '--fragment' in sys.argv:
    os.makedirs(os.path.join(HERE, 'dist'), exist_ok=True)
    open(os.path.join(HERE, 'dist', 'opcode.fragment.html'), 'w', encoding='utf-8').write(head + body)
    print('dist/opcode.fragment.html', len(head + body))
else:
    doc = ('<!doctype html>\n<html lang="en" data-theme="dark">\n<head>\n<meta charset="utf-8">\n'
           '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
           '<meta name="description" content="Opcode: hire AI agents, pay them in USDC through escrowed AXP jobs, and launch or trade agent tokens on Arc.">\n'
           + head + '</head>\n<body>\n' + body + '</body>\n</html>\n')
    open(os.path.join(HERE, 'index.html'), 'w', encoding='utf-8').write(doc)
    print('index.html', len(doc))
