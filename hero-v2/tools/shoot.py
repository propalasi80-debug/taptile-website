import asyncio, sys
from playwright.async_api import async_playwright
pages = sys.argv[1:]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for vw, vh, tag in [(1440, 900, 'd'), (390, 844, 'm')]:
            ctx = await b.new_context(viewport={'width': vw, 'height': vh}, device_scale_factor=1)
            pg = await ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
            for name in pages:
                errs.clear()
                await pg.goto(f'http://127.0.0.1:8765/{name}', wait_until='networkidle')
                h = await pg.evaluate('document.documentElement.scrollHeight')
                for y in range(0, h, vh):
                    await pg.evaluate(f'window.scrollTo(0,{y})'); await pg.wait_for_timeout(120)
                await pg.wait_for_timeout(600)
                ow = await pg.evaluate('document.documentElement.scrollWidth')
                await pg.screenshot(path=f'/home/claude/work/shots/{tag}_{name}.png', full_page=True)
                sale = await pg.evaluate('document.documentElement.dataset.sale')
                buys = await pg.evaluate("[...document.querySelectorAll('[data-buy]')].filter(a=>a.offsetParent).map(a=>a.textContent+' -> '+a.getAttribute('href'))")
                print(tag, name, 'h', h, 'overflowX', ow > vw, 'sale', sale, 'errors', errs[:3], 'buys', buys)
            await ctx.close()
        await b.close()
asyncio.run(main())
