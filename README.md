# N&G Express — Sistema de Atendimento

## Estrutura
```
ngexpress/
├── server.js              ← Servidor Node.js + API REST
├── package.json
├── ngexpress.db           ← Banco SQLite (criado automaticamente)
└── public/
    ├── chatbot-cliente.html    ← Tela do cliente
    └── painel-atendentes.html  ← Tela dos atendentes
```

## Banco de Dados (SQLite)
Tabelas criadas automaticamente:
- **conversas** — dados principais (nome, whatsapp, atendente, valor PIX, status)
- **mensagens** — histórico completo de mensagens
- **arquivos** — comprovantes em base64
- **info_entrega** — cidades, endereços, destinatário, motoboy

## Instalação

### 1. Instalar dependências
```bash
npm install
```

### 2. Iniciar servidor
```bash
node server.js
```
Servidor sobe em: http://localhost:3000

### 3. Acessar
- **Cliente:** http://localhost:3000/chatbot-cliente.html
- **Painel:**  http://localhost:3000/painel-atendentes.html

## Deploy em produção (Railway, Render, etc.)

1. Faça upload da pasta no serviço de hospedagem
2. Configure a variável de ambiente: `PORT=3000`
3. Comando de start: `node server.js`
4. Os HTMLs já detectam a URL automaticamente

## API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST   | /api/conversas | Criar/abrir conversa |
| GET    | /api/conversas | Listar todas (painel) |
| GET    | /api/conversas/:id | Buscar conversa |
| PATCH  | /api/conversas/:id | Atualizar dados |
| DELETE | /api/conversas/:id | Excluir conversa |
| POST   | /api/conversas/:id/mensagens | Enviar mensagem |
| GET    | /api/conversas/:id/arquivos | Listar comprovantes |
| POST   | /api/conversas/:id/arquivos | Upload comprovante |
| GET    | /api/conversas/cliente/historico | Buscar histórico do cliente |
| GET    | /api/health | Status do servidor |

## PIX
- Empresa: TRANSPOCRED
- CNPJ: 24.723.159/0001-00
- Banco Ailos (085) • Ag: 0108-2 • CC: 2092835-1
- Chave: 24723159000100