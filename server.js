const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const https   = require('https');
const { v4: uuid } = require('uuid');
const initSql = require('sql.js');

const app  = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'banco.db');

// ── Mercado Pago ───────────────────────────────────────────
const MP_ACCESS_TOKEN   = process.env.MP_ACCESS_TOKEN   || 'APP_USR-460981285996431-032818-00692b024b5a6ec3db98a3e0645429d3-1651166060';
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || '06611dddba6e420e383464cb08e693856ff24d9bfd4038b628ceaf41f6872c07';
// ✅ https:// obrigatório — Mercado Pago rejeita webhook sem protocolo
const BASE_URL = process.env.BASE_URL || 'https://chatbotng-production.up.railway.app';

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '25mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Configuração de preços ─────────────────────────────────
const PRICING_CONFIG = {
    valorMinimoAte7km: { moto: 15.00 },
    valorPorKm:        { moto: 1.80 },
    limiteKmMinimo:    7
};


//-- URL-----------------------------------
// Raiz → chatbot do cliente
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chatbot-cliente.html'));
});

// /painel → painel dos atendentes
app.get('/painel', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'painel-atendentes.html'));
});
// ── Banco ──────────────────────────────────────────────────
let DB;

async function abrirBanco() {
    const SQL = await initSql();
    DB = fs.existsSync(DB_FILE)
        ? new SQL.Database(fs.readFileSync(DB_FILE))
        : new SQL.Database();

    DB.run(`CREATE TABLE IF NOT EXISTS conversas (
        id TEXT PRIMARY KEY,
        nome TEXT DEFAULT '',
        whatsapp TEXT DEFAULT '',
        user_type TEXT DEFAULT '',
        atendente TEXT DEFAULT '',
        aberta INTEGER DEFAULT 1,
        lida INTEGER DEFAULT 0,
        arquivada INTEGER DEFAULT 0,
        valor REAL DEFAULT 0,
        pix TEXT DEFAULT '',
        mp_payment_id TEXT DEFAULT '',
        aguard_pag INTEGER DEFAULT 0,
        pag_conf INTEGER DEFAULT 0,
        coleta_cidade TEXT DEFAULT '',
        coleta_end TEXT DEFAULT '',
        entrega_cidade TEXT DEFAULT '',
        entrega_end TEXT DEFAULT '',
        dest_nome TEXT DEFAULT '',
        dest_tel TEXT DEFAULT '',
        motoboy_regiao TEXT DEFAULT '',
        ultima TEXT DEFAULT '',
        distancia_km REAL DEFAULT 0,
        veiculo TEXT DEFAULT 'moto',
        criada INTEGER,
        atualizada INTEGER
    )`);

    // Migração: garante que todas as colunas existem em bancos antigos
    const migracoes = [
        `ALTER TABLE conversas ADD COLUMN mp_payment_id TEXT DEFAULT ''`,
        `ALTER TABLE conversas ADD COLUMN distancia_km REAL DEFAULT 0`,
        `ALTER TABLE conversas ADD COLUMN veiculo TEXT DEFAULT 'moto'`,
        `ALTER TABLE conversas ADD COLUMN aguard_pag INTEGER DEFAULT 0`,
        `ALTER TABLE conversas ADD COLUMN pag_conf INTEGER DEFAULT 0`,
        `ALTER TABLE conversas ADD COLUMN arquivada INTEGER DEFAULT 0`,
        `ALTER TABLE conversas ADD COLUMN user_type TEXT DEFAULT ''`,
        `ALTER TABLE conversas ADD COLUMN atendente TEXT DEFAULT ''`,
        `ALTER TABLE conversas ADD COLUMN pix TEXT DEFAULT ''`,
        `ALTER TABLE conversas ADD COLUMN coleta_cidade TEXT DEFAULT ''`,
        `ALTER TABLE conversas ADD COLUMN coleta_end TEXT DEFAULT ''`,
        `ALTER TABLE conversas ADD COLUMN entrega_cidade TEXT DEFAULT ''`,
        `ALTER TABLE conversas ADD COLUMN entrega_end TEXT DEFAULT ''`,
        `ALTER TABLE conversas ADD COLUMN dest_nome TEXT DEFAULT ''`,
        `ALTER TABLE conversas ADD COLUMN dest_tel TEXT DEFAULT ''`,
        `ALTER TABLE conversas ADD COLUMN motoboy_regiao TEXT DEFAULT ''`,
        `ALTER TABLE conversas ADD COLUMN ultima TEXT DEFAULT ''`,
    ];
    for (const sql of migracoes) {
        try { DB.run(sql); } catch (_) { /* coluna já existe, ignora */ }
    }

    DB.run(`CREATE TABLE IF NOT EXISTS msgs (
        id TEXT PRIMARY KEY,
        conv_id TEXT,
        tipo TEXT,
        texto TEXT DEFAULT '',
        atendente TEXT DEFAULT '',
        ts INTEGER
    )`);

    DB.run(`CREATE TABLE IF NOT EXISTS arquivos (
        id TEXT PRIMARY KEY,
        conv_id TEXT,
        nome TEXT DEFAULT '',
        mime TEXT DEFAULT '',
        dados TEXT DEFAULT '',
        ts INTEGER
    )`);

    salvar();
    console.log('✅ Banco pronto:', DB_FILE);
}

function salvar() { fs.writeFileSync(DB_FILE, Buffer.from(DB.export())); }
function rodar(sql, params = []) { DB.run(sql, params); salvar(); }

function um(sql, params = []) {
    const s = DB.prepare(sql);
    s.bind(params);
    const r = s.step() ? s.getAsObject() : null;
    s.free();
    return r;
}

function todos(sql, params = []) {
    const out = [];
    const s = DB.prepare(sql);
    s.bind(params);
    while (s.step()) out.push(s.getAsObject());
    s.free();
    return out;
}

function agora() { return Date.now(); }

function calcularPreco(distanciaKm, veiculo = 'moto') {
    const km       = parseFloat(distanciaKm) || 0;
    const limite   = PRICING_CONFIG.limiteKmMinimo;
    const valorMin = PRICING_CONFIG.valorMinimoAte7km[veiculo] || 15.00;
    const valorKm  = PRICING_CONFIG.valorPorKm[veiculo] || 1.80;
    if (km <= limite) return valorMin;
    return valorMin + ((km - limite) * valorKm);
}

function montar(c) {
    if (!c) return null;
    const mensagens = todos('SELECT * FROM msgs WHERE conv_id=? ORDER BY ts ASC', [c.id]);
    const arquivos  = todos('SELECT id,nome,mime,dados,ts FROM arquivos WHERE conv_id=? ORDER BY ts ASC', [c.id]);
    return {
        id: c.id,
        aberta:    !!c.aberta,
        lida:      !!c.lida,
        arquivada: !!c.arquivada,
        ultima:    c.ultima,
        ts:        c.atualizada,
        msgs: mensagens.map(m => ({ id: m.id, tipo: m.tipo, texto: m.texto, atendente: m.atendente, ts: m.ts })),
        arquivos: arquivos.map(a => ({ id: a.id, nome: a.nome, mime: a.mime, dados: a.dados, ts: a.ts })),
        info: {
            nome: c.nome, whatsapp: c.whatsapp,
            userType: c.user_type, atendenteAtivo: c.atendente,
            valor: c.valor, pixPayload: c.pix,
            mpPaymentId: c.mp_payment_id,
            aguardandoConfirmacao: !!c.aguard_pag,
            pagamentoConfirmado:   !!c.pag_conf,
            distancia: c.distancia_km, veiculo: c.veiculo,
            coleta:       { cidade: c.coleta_cidade,  endereco: c.coleta_end  },
            entrega:      { cidade: c.entrega_cidade, endereco: c.entrega_end },
            destinatario: { nome: c.dest_nome, tel: c.dest_tel },
            motoboy:      { regiao: c.motoboy_regiao }
        }
    };
}

// ── Helper Mercado Pago ────────────────────────────────────
function mpRequest(method, endpoint, body) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const options = {
            hostname: 'api.mercadopago.com',
            path:     endpoint,
            method,
            headers: {
                'Authorization':     `Bearer ${MP_ACCESS_TOKEN}`,
                'Content-Type':      'application/json',
                'X-Idempotency-Key': uuid(),
            }
        };
        if (data) options.headers['Content-Length'] = Buffer.byteLength(data);
        const req = https.request(options, res => {
            let raw = '';
            res.on('data', chunk => raw += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
                catch (e) { reject(new Error('Resposta inválida MP: ' + raw.slice(0, 200))); }
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

// ══════════════════════════════════════════════════════════
// ROTAS
// ══════════════════════════════════════════════════════════

// Criar conversa
app.post('/api/conv', (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ erro: 'id obrigatório' });
    let c = um('SELECT * FROM conversas WHERE id=?', [id]);
    if (!c) {
        rodar('INSERT INTO conversas (id,criada,atualizada) VALUES (?,?,?)', [id, agora(), agora()]);
        c = um('SELECT * FROM conversas WHERE id=?', [id]);
    }
    res.json(montar(c));
});

// Buscar conversa
app.get('/api/conv/:id', (req, res) => {
    const c = um('SELECT * FROM conversas WHERE id=?', [req.params.id]);
    if (!c) return res.status(404).json({ erro: 'não encontrada' });
    res.json(montar(c));
});

// Listar todas
app.get('/api/conv', (req, res) => {
    const lista = todos('SELECT * FROM conversas WHERE arquivada=0 ORDER BY atualizada DESC');
    res.json(lista.map(montar));
});

// Atualizar conversa
app.patch('/api/conv/:id', (req, res) => {
    const { id } = req.params;
    const b = req.body;
    const c = um('SELECT * FROM conversas WHERE id=?', [id]);
    if (!c) return res.status(404).json({ erro: 'não encontrada' });

    const campos = [], vals = [];
    const add = (col, val) => { if (val !== undefined) { campos.push(`${col}=?`); vals.push(val); } };

    add('nome',           b.nome);
    add('whatsapp',       b.whatsapp);
    add('user_type',      b.userType);
    add('atendente',      b.atendente);
    add('aberta',         b.aberta      !== undefined ? (b.aberta      ? 1 : 0) : undefined);
    add('lida',           b.lida        !== undefined ? (b.lida        ? 1 : 0) : undefined);
    add('arquivada',      b.arquivada   !== undefined ? (b.arquivada   ? 1 : 0) : undefined);
    add('valor',          b.valor);
    add('pix',            b.pixPayload);
    add('mp_payment_id',  b.mpPaymentId);
    add('aguard_pag',     b.aguardandoConfirmacao !== undefined ? (b.aguardandoConfirmacao ? 1 : 0) : undefined);
    add('pag_conf',       b.pagamentoConfirmado   !== undefined ? (b.pagamentoConfirmado   ? 1 : 0) : undefined);
    add('coleta_cidade',  b.coleta?.cidade);
    add('coleta_end',     b.coleta?.endereco);
    add('entrega_cidade', b.entrega?.cidade);
    add('entrega_end',    b.entrega?.endereco);
    add('dest_nome',      b.destinatario?.nome);
    add('dest_tel',       b.destinatario?.tel);
    add('motoboy_regiao', b.motoboy?.regiao);
    add('distancia_km',   b.distancia);
    add('veiculo',        b.veiculo);
    add('ultima',         b.ultima);

    if (campos.length > 0) {
        campos.push('atualizada=?');
        vals.push(agora(), id);
        rodar(`UPDATE conversas SET ${campos.join(',')} WHERE id=?`, vals);
    }
    res.json(montar(um('SELECT * FROM conversas WHERE id=?', [id])));
});

// Deletar conversa
app.delete('/api/conv/:id', (req, res) => {
    const id = req.params.id;
    rodar('DELETE FROM msgs      WHERE conv_id=?', [id]);
    rodar('DELETE FROM arquivos  WHERE conv_id=?', [id]);
    rodar('DELETE FROM conversas WHERE id=?',      [id]);
    res.json({ ok: true });
});

// Histórico do cliente
app.get('/api/historico', (req, res) => {
    const { nome, whatsapp, excluir } = req.query;
    if (!nome || !whatsapp) return res.json(null);
    const waNorm = whatsapp.replace(/\D/g, '');
    const lista  = todos(
        `SELECT * FROM conversas WHERE id!=? AND LOWER(TRIM(nome))=LOWER(TRIM(?)) AND arquivada=0 ORDER BY atualizada DESC`,
        [excluir || '', nome]
    );
    const match = lista.find(c => (c.whatsapp || '').replace(/\D/g, '') === waNorm && (c.coleta_cidade || c.entrega_cidade));
    res.json(match ? montar(match) : null);
});

// Calcular preço
app.post('/api/calcular', (req, res) => {
    const { distancia, veiculo } = req.body;
    const preco = calcularPreco(parseFloat(distancia) || 0, veiculo || 'moto');
    res.json({ distancia: parseFloat(distancia) || 0, valor: preco, veiculo: veiculo || 'moto' });
});

// ── PIX — Gerar cobrança no Mercado Pago ──────────────────
app.post('/api/pix/criar', async (req, res) => {
    const { convId, valor, nomeCliente } = req.body;
    if (!convId || !valor) return res.status(400).json({ erro: 'convId e valor obrigatórios' });

    try {
        const mpBody = {
            transaction_amount: parseFloat(parseFloat(valor).toFixed(2)),
            description:        `Entrega N&G Express #${convId.slice(-6).toUpperCase()}`,
            payment_method_id:  'pix',
            payer: {
                email:      'cliente@ngexpress.com.br',
                first_name: nomeCliente || 'Cliente',
                last_name:  'NGExpress',
                identification: { type: 'CPF', number: '00000000000' }
            },
            notification_url:   `${BASE_URL}/api/pix/webhook`,
            external_reference: convId,
        };

        console.log('📤 Criando PIX no MP:', JSON.stringify(mpBody));
        const resp = await mpRequest('POST', '/v1/payments', mpBody);
        console.log('📥 Resposta MP:', resp.status, JSON.stringify(resp.body).slice(0, 300));

        if (resp.status !== 201) {
            return res.status(502).json({ erro: 'Erro no Mercado Pago', detalhe: resp.body });
        }

        const pix = resp.body.point_of_interaction?.transaction_data;
        if (!pix?.qr_code) return res.status(502).json({ erro: 'MP não retornou QR Code PIX' });

        rodar(
            'UPDATE conversas SET mp_payment_id=?, pix=?, aguard_pag=1, atualizada=? WHERE id=?',
            [String(resp.body.id), pix.qr_code, agora(), convId]
        );

        res.json({
            paymentId:    resp.body.id,
            qrCode:       pix.qr_code,
            qrCodeBase64: pix.qr_code_base64 || null,
            valor:        resp.body.transaction_amount,
        });

    } catch (err) {
        console.error('❌ Erro criar PIX:', err.message);
        res.status(500).json({ erro: err.message });
    }
});

// ── PIX — Webhook do Mercado Pago ─────────────────────────
app.post('/api/pix/webhook', async (req, res) => {
    res.sendStatus(200);

    try {
        const { type, data } = req.body;
        if (type !== 'payment' || !data?.id) return;

        const resp = await mpRequest('GET', `/v1/payments/${data.id}`, null);
        if (resp.status !== 200) return;

        const payment = resp.body;
        if (payment.status !== 'approved') return;

        const convId = payment.external_reference;
        if (!convId) return;

        const c = um('SELECT * FROM conversas WHERE id=?', [convId]);
        if (!c || c.pag_conf) return;

        rodar('UPDATE conversas SET pag_conf=1, aguard_pag=0, lida=0, atualizada=? WHERE id=?', [agora(), convId]);

        const msgId = uuid(), ts = agora();
        rodar(
            'INSERT INTO msgs (id,conv_id,tipo,texto,atendente,ts) VALUES (?,?,?,?,?,?)',
            [msgId, convId, 'atendente',
             '✅ Pagamento confirmado! Sua entrega foi registrada. Em breve nosso motoboy irá buscar seu pedido. 🚚',
             'Sistema', ts]
        );
        rodar('UPDATE conversas SET ultima=?,atualizada=? WHERE id=?', ['✅ Pagamento confirmado!', ts, convId]);

        console.log(`✅ PIX aprovado — conversa ${convId}`);
    } catch (err) {
        console.error('❌ Erro webhook:', err.message);
    }
});

// ── PIX — Consultar status ────────────────────────────────
app.get('/api/pix/status/:convId', async (req, res) => {
    const c = um('SELECT * FROM conversas WHERE id=?', [req.params.convId]);
    if (!c) return res.status(404).json({ erro: 'não encontrada' });
    if (!c.mp_payment_id) return res.json({ status: 'sem_cobranca' });
    try {
        const resp = await mpRequest('GET', `/v1/payments/${c.mp_payment_id}`, null);
        if (resp.status !== 200) return res.status(502).json({ erro: 'Erro ao consultar MP' });
        res.json({ status: resp.body.status, valor: resp.body.transaction_amount });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// ── Mensagens ──────────────────────────────────────────────
app.post('/api/conv/:id/msgs', (req, res) => {
    const { tipo, texto, atendente } = req.body;
    const conv_id = req.params.id;
    const id = uuid(), ts = agora();
    rodar('INSERT INTO msgs (id,conv_id,tipo,texto,atendente,ts) VALUES (?,?,?,?,?,?)',
        [id, conv_id, tipo, texto || '', atendente || '', ts]);
    if (tipo === 'user') {
        rodar('UPDATE conversas SET ultima=?,atualizada=?,lida=0 WHERE id=?', [(texto || '').substring(0, 80), ts, conv_id]);
    } else {
        rodar('UPDATE conversas SET ultima=?,atualizada=? WHERE id=?', [(texto || '').substring(0, 80), ts, conv_id]);
    }
    res.json({ id, ts, ok: true });
});

// ── Arquivos ───────────────────────────────────────────────
app.post('/api/conv/:id/arq', (req, res) => {
    const { nome, mime, dados } = req.body;
    if (!dados) return res.status(400).json({ erro: 'dados obrigatório' });
    const id = uuid(), ts = agora();
    rodar('INSERT INTO arquivos (id,conv_id,nome,mime,dados,ts) VALUES (?,?,?,?,?,?)',
        [id, req.params.id, nome || 'arquivo', mime || 'image/jpeg', dados, ts]);
    rodar('UPDATE conversas SET ultima=?,atualizada=?,lida=0 WHERE id=?', ['📎 Comprovante enviado', ts, req.params.id]);
    res.json({ id, ts, ok: true });
});

app.get('/api/conv/:id/arq', (req, res) => {
    res.json(todos('SELECT * FROM arquivos WHERE conv_id=? ORDER BY ts ASC', [req.params.id]));
});

// ── Health ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    const nc = um('SELECT COUNT(*) as c FROM conversas');
    const nm = um('SELECT COUNT(*) as c FROM msgs');
    res.json({
        ok: true,
        conversas: nc?.c || 0,
        mensagens: nm?.c || 0,
        banco: fs.existsSync(DB_FILE) ? `${(fs.statSync(DB_FILE).size / 1024).toFixed(1)}KB` : 'novo'
    });
});

// ── Iniciar ────────────────────────────────────────────────
abrirBanco().then(() => {
    app.listen(PORT, () => {
        console.log('');
        console.log('🚚 N&G Express rodando!');
        console.log(`📡 http://localhost:${PORT}`);
        console.log(`👤 Cliente: http://localhost:${PORT}/chatbot-cliente.html`);
        console.log(`👩‍💼 Painel:  http://localhost:${PORT}/painel-atendentes.html`);
        console.log(`💳 Webhook: ${BASE_URL}/api/pix/webhook`);
        console.log('');
    });
});