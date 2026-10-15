import { createApp } from './app.ts';

const app = createApp();
const { cfg } = app.ctx;
if (cfg.seed) await app.seed();
app.server.listen(cfg.port, () => console.log(`Opcode API on :${cfg.port} · chain=${cfg.chainMode} · x=${app.ctx.x.name} · dev=${cfg.allowDev}`));
const timer = setInterval(async () => { const r = await app.tick(); if (r.errors.length) console.warn('worker:', r.errors.join(' | ')); app.ctx.store.save(); }, cfg.workerMs);
const stop = () => { clearInterval(timer); app.ctx.store.save(); app.server.close(() => process.exit(0)); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
