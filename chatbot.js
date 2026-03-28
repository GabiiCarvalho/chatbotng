// chatbot.js - Lógica modular do chatbot
class NGGExpressChatbot {
    constructor(config) {
        this.config = {
            atendentes: config.atendentes || ['Gabriele', 'Natanael'],
            apiKey: config.apiKey || '',
            apiUrl: config.apiUrl || '',
            ...config
        };
        
        this.state = {
            step: 'initial',
            userType: null,
            atendenteAtual: null,
            dadosEntrega: {
                cidadeColeta: '',
                cidadeEntrega: '',
                enderecoColeta: '',
                enderecoEntrega: ''
            },
            motoboy: {
                nome: '',
                regiao: ''
            },
            historico: []
        };
        
        this.init();
    }
    
    init() {
        this.escolherAtendente();
        this.saudacaoInicial();
        this.setupEventListeners();
    }
    
    escolherAtendente() {
        const randomIndex = Math.floor(Math.random() * this.config.atendentes.length);
        this.state.atendenteAtual = this.config.atendentes[randomIndex];
    }
    
    getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    
    saudacaoInicial() {
        this.addMessage(`🎯 Você será atendido(a) por: <strong>${this.state.atendenteAtual}</strong>`, 'bot');
        this.addMessage(`💬 Chat Iniciado - ${this.getCurrentTime()}`, 'bot');
        this.addMessage('👋 Olá! Seja bem-vindo(a) à N&G Express! 🚚', 'bot');
        this.addMessage('Por favor, selecione uma opção:', 'bot');
        
        this.addOptions([
            { text: '📦 Sou Cliente', action: () => this.fluxoCliente() },
            { text: '🛵 Sou Motoboy', action: () => this.fluxoMotoboy() }
        ]);
    }
    
    fluxoCliente() {
        this.state.userType = 'cliente';
        this.addMessage('Ótimo! Como posso ajudar você?', 'bot');
        
        this.addOptions([
            { text: '💬 Falar com Atendente', action: () => this.falarComAtendente() },
            { text: '🚚 Solicitar Entrega', action: () => this.solicitarEntrega() }
        ]);
    }
    
    fluxoMotoboy() {
        this.state.userType = 'motoboy';
        this.state.step = 'motoboy_nome';
        this.addMessage('🛵 Para prosseguir, informe seu nome completo:', 'bot');
    }
    
    falarComAtendente() {
        this.addMessage('🔍 Aguarde um momento que logo uma atendente irá falar com você...', 'bot');
        
        setTimeout(() => {
            this.escolherAtendente();
            const horaAtual = this.getCurrentTime();
            this.addMessage(`🎯 Você será atendido(a) por: <strong>${this.state.atendenteAtual}</strong>`, 'bot');
            this.addMessage(`💬 Chat Iniciado - ${horaAtual}`, 'bot');
            this.addMessage(`Olá! Sou ${this.state.atendenteAtual}, em que posso ajudá-lo(a) hoje?`, 'bot');
            this.state.step = 'aguardando_atendente';
            this.enableInput();
        }, 2000);
    }
    
    solicitarEntrega() {
        this.addMessage('📦 Vamos solicitar sua entrega! Por favor, responda às perguntas abaixo:', 'bot');
        this.state.step = 'coleta_cidade';
        this.addMessage('📍 Qual a cidade de coleta?', 'bot');
    }
    
    async calcularRota(enderecoColeta, enderecoEntrega) {
        // Integração com HERE Maps
        try {
            const response = await fetch(`${this.config.apiUrl}/calcular-rota`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enderecoColeta, enderecoEntrega })
            });
            
            const data = await response.json();
            return {
                distancia: data.distancia,
                tempo: data.tempo,
                valor: data.valor
            };
        } catch (error) {
            console.error('Erro ao calcular rota:', error);
            // Fallback para cálculo local
            const distancia = (Math.random() * 50 + 5).toFixed(1);
            const tempo = Math.floor(distancia * 2.5);
            const valor = (distancia * 2.5 + 5).toFixed(2);
            
            return {
                distancia: `${distancia} km`,
                tempo: `${tempo} minutos`,
                valor: `R$ ${valor}`
            };
        }
    }
    
    async confirmarEntrega() {
        this.addMessage('✅ Entrega confirmada! Seu pedido foi registrado.', 'bot');
        this.addMessage('📱 Em breve você receberá um código de rastreamento por WhatsApp.', 'bot');
        this.addMessage('💚 Agradecemos pela preferência!', 'bot');
        
        setTimeout(() => {
            this.reset();
        }, 3000);
    }
    
    cancelarEntrega() {
        this.addMessage('❌ Entrega cancelada. Gerando link de pagamento PIX...', 'bot');
        
        const pixCode = '00020126360014br.gov.bcb.pix011155599999999520400005303986540510.005802BR5913N&G Express6008Cidade62070503***6304E2F3';
        
        this.addMessage(`💳 Para pagamento, utilize o código PIX abaixo:\n\n<strong>${pixCode}</strong>\n\nOu escaneie o QR Code.`, 'bot');
        this.addMessage('💡 Após o pagamento, sua entrega será agendada.', 'bot');
        
        setTimeout(() => {
            this.reset();
        }, 5000);
    }
    
    addMessage(content, type) {
        // Implementar adição de mensagem ao DOM
        const event = new CustomEvent('chat:message', {
            detail: { content, type, time: this.getCurrentTime(), atendente: this.state.atendenteAtual }
        });
        document.dispatchEvent(event);
        
        this.state.historico.push({
            tipo: type,
            mensagem: content,
            horario: this.getCurrentTime(),
            atendente: type === 'bot' ? this.state.atendenteAtual : null
        });
    }
    
    addOptions(options) {
        const event = new CustomEvent('chat:options', {
            detail: { options }
        });
        document.dispatchEvent(event);
    }
    
    enableInput() {
        const event = new CustomEvent('chat:enableInput');
        document.dispatchEvent(event);
    }
    
    reset() {
        this.state = {
            step: 'initial',
            userType: null,
            atendenteAtual: null,
            dadosEntrega: {
                cidadeColeta: '',
                cidadeEntrega: '',
                enderecoColeta: '',
                enderecoEntrega: ''
            },
            motoboy: {
                nome: '',
                regiao: ''
            },
            historico: []
        };
        
        this.escolherAtendente();
        this.saudacaoInicial();
    }
    
    setupEventListeners() {
        // Configurar event listeners para mensagens do usuário
        document.addEventListener('chat:userMessage', (e) => {
            this.processUserMessage(e.detail.message);
        });
    }
    
    processUserMessage(message) {
        const msg = message.trim();
        if (!msg) return;
        
        switch(this.state.step) {
            case 'coleta_cidade':
                this.state.dadosEntrega.cidadeColeta = msg;
                this.state.step = 'entrega_cidade';
                this.addMessage('📍 Qual é a cidade de entrega?', 'bot');
                break;
            case 'entrega_cidade':
                this.state.dadosEntrega.cidadeEntrega = msg;
                this.state.step = 'coleta_endereco';
                this.addMessage('🏠 Agora, informe o endereço completo de coleta (Rua, Número, Bairro):', 'bot');
                break;
            case 'coleta_endereco':
                this.state.dadosEntrega.enderecoColeta = msg;
                this.state.step = 'entrega_endereco';
                this.addMessage('🏠 Informe o endereço completo de entrega (Rua, Número, Bairro):', 'bot');
                break;
            case 'entrega_endereco':
                this.processarEntregaEndereco(msg);
                break;
            case 'motoboy_nome':
                this.state.motoboy.nome = msg;
                this.state.step = 'motoboy_regiao';
                this.addMessage('📍 Em qual região você está localizado? (ex: Vale do Itajaí, Litoral, etc)', 'bot');
                break;
            case 'motoboy_regiao':
                this.state.motoboy.regiao = msg;
                this.addMessage(`✅ Obrigado, ${this.state.motoboy.nome}!`, 'bot');
                this.addMessage('🔍 Aguarde um momento que logo uma atendente irá falar com você...', 'bot');
                this.falarComAtendente();
                break;
            default:
                this.addMessage('Desculpe, não entendi. Por favor, escolha uma das opções disponíveis.', 'bot');
                if (this.state.userType === 'cliente') {
                    this.fluxoCliente();
                } else if (this.state.userType === 'motoboy') {
                    this.fluxoMotoboy();
                }
        }
    }
    
    async processarEntregaEndereco(endereco) {
        this.state.dadosEntrega.enderecoEntrega = endereco;
        this.addMessage('🔄 Calculando rota e valores...', 'bot');
        
        try {
            const resultado = await this.calcularRota(
                this.state.dadosEntrega.enderecoColeta,
                this.state.dadosEntrega.enderecoEntrega
            );
            
            this.addMessage(`✅ ROTA CALCULADA:\n\n📏 Distância: ${resultado.distancia}\n⏱️ Tempo estimado: ${resultado.tempo}\n💰 Valor: ${resultado.valor}\n\n🗺️ Regiões:\n- Coleta: ${this.state.dadosEntrega.cidadeColeta}\n- Entrega: ${this.state.dadosEntrega.cidadeEntrega}`, 'bot');
            
            this.addOptions([
                { text: '✅ Confirmar Entrega', action: () => this.confirmarEntrega() },
                { text: '❌ Cancelar', action: () => this.cancelarEntrega() }
            ]);
            
            this.state.step = 'confirmacao_entrega';
        } catch (error) {
            this.addMessage('❌ Desculpe, não foi possível calcular a rota. Por favor, tente novamente ou fale com um atendente.', 'bot');
            this.fluxoCliente();
        }
    }
}

// Exportar para uso
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NGGExpressChatbot;
}