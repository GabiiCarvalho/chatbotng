#!/bin/bash
# ============================================================
# N&G Express — Iniciar servidor
# Execute: bash iniciar.sh
# ============================================================

echo ""
echo "🚚 N&G Express — Iniciando servidor..."
echo "============================================"
echo ""
echo "📡 Chatbot cliente: http://localhost:3000/chatbot-cliente.html"
echo "👩‍💼 Painel atendentes: http://localhost:3000/painel-atendentes.html"
echo "🔍 Status da API: http://localhost:3000/api/health"
echo ""
echo "Para parar: pressione CTRL+C"
echo "============================================"
echo ""

node server.js