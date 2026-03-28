// whatsapp-mobile.js - Script para criar atalho no WhatsApp Mobile
// Usar com aplicativos como "Shortcuts" (iOS) ou "Tasker" (Android)

class WhatsAppMobileBot {
    constructor() {
        this.atendentes = ['Gabriele', 'Natanael'];
        this.atendenteAtual = null;
        this.step = 'initial';
        this.userType = null;
        this.dadosEntrega = {
            cidadeColeta: '',
            cidadeEntrega: '',
            enderecoColeta: '',
            enderecoEntrega: ''
        };
    }
    
    getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    
    escolherAtendente() {
        return this.atendentes[Math.floor(Math.random() * this.atendentes.length)];
    }
    
    async iniciarAtendimento(numeroWhatsApp) {
        this.atendenteAtual = this.escolherAtendente();
        const horaAtual = this.getCurrentTime();
        
        const mensagens = [
            `🎯 Você será atendido(a) por: *${this.atendenteAtual}*`,
            `💬 Chat Iniciado - ${horaAtual}`,
            `👋 Olá! Seja bem-vindo(a) à N&G Express! 🚚`,
            `Meu nome é ${this.atendenteAtual} e estou aqui para ajudar você com entregas rápidas e seguras.`,
            `Por favor, selecione uma opção:\n\n1️⃣ Sou Cliente\n2️⃣ Sou Motoboy`
        ];
        
        for (const msg of mensagens) {
            await this.enviarMensagem(numeroWhatsApp, msg);
            await this.delay(1000);
        }
        
        return true;
    }
    
    async processarResposta(numeroWhatsApp, resposta) {
        const msg = resposta.trim();
        
        if (this.step === 'initial') {
            if (msg === '1' || msg.toLowerCase().includes('cliente')) {
                this.userType = 'cliente';
                await this.enviarMensagem(numeroWhatsApp, "Ótimo! Como posso ajudar você?\n\n1️⃣ Falar com Atendente\n2️⃣ Solicitar Entrega");
                this.step = 'cliente_opcao';
            } else if (msg === '2' || msg.toLowerCase().includes('motoboy')) {
                this.userType = 'motoboy';
                await this.enviarMensagem(numeroWhatsApp, "🛵 Para prosseguir, informe seu nome completo:");
                this.step = 'motoboy_nome';
            }
        }
        else if (this.step === 'cliente_opcao') {
            if (msg === '1' || msg.toLowerCase().includes('atendente')) {
                await this.enviarMensagem(numeroWhatsApp, "🔍 Aguarde um momento que logo uma atendente irá falar com você...");
                await this.delay(2000);
                this.atendenteAtual = this.escolherAtendente();
                const horaAtual = this.getCurrentTime();
                await this.enviarMensagem(numeroWhatsApp, `🎯 Você será atendido(a) por: *${this.atendenteAtual}*`);
                await this.enviarMensagem(numeroWhatsApp, `💬 Chat Iniciado - ${horaAtual}`);
                await this.enviarMensagem(numeroWhatsApp, `Olá! Sou ${this.atendenteAtual}, em que posso ajudá-lo(a) hoje?`);
                this.step = 'aguardando_atendente';
            } else if (msg === '2' || msg.toLowerCase().includes('entrega')) {
                await this.enviarMensagem(numeroWhatsApp, "📦 Vamos solicitar sua entrega!\n\n📍 Qual a cidade de coleta?");
                this.step = 'coleta_cidade';
            }
        }
        else if (this.step === 'coleta_cidade') {
            this.dadosEntrega.cidadeColeta = msg;
            await this.enviarMensagem(numeroWhatsApp, "📍 Qual é a cidade de entrega?");
            this.step = 'entrega_cidade';
        }
        else if (this.step === 'entrega_cidade') {
            this.dadosEntrega.cidadeEntrega = msg;
            await this.enviarMensagem(numeroWhatsApp, "🏠 Informe o endereço completo de coleta (Rua, Número, Bairro):");
            this.step = 'coleta_endereco';
        }
        else if (this.step === 'coleta_endereco') {
            this.dadosEntrega.enderecoColeta = msg;
            await this.enviarMensagem(numeroWhatsApp, "🏠 Informe o endereço completo de entrega (Rua, Número, Bairro):");
            this.step = 'entrega_endereco';
        }
        else if (this.step === 'entrega_endereco') {
            this.dadosEntrega.enderecoEntrega = msg;
            await this.enviarMensagem(numeroWhatsApp, "🔄 Calculando rota e valores...");
            
            const resultado = await this.calcularEntrega();
            
            await this.enviarMensagem(numeroWhatsApp, 
                `✅ *ROTA CALCULADA*\n\n` +
                `📏 Distância: ${resultado.distancia}\n` +
                `⏱️ Tempo estimado: ${resultado.tempo}\n` +
                `💰 Valor: ${resultado.valor}\n\n` +
                `🗺️ Regiões:\n- Coleta: ${this.dadosEntrega.cidadeColeta}\n- Entrega: ${this.dadosEntrega.cidadeEntrega}\n\n` +
                `Escolha uma opção:\n1️⃣ Confirmar Entrega\n2️⃣ Cancelar`
            );
            this.step = 'confirmacao_entrega';
        }
        else if (this.step === 'confirmacao_entrega') {
            if (msg === '1' || msg.toLowerCase().includes('confirmar')) {
                await this.enviarMensagem(numeroWhatsApp, "✅ Entrega confirmada! Seu pedido foi registrado.");
                await this.enviarMensagem(numeroWhatsApp, "📱 Em breve você receberá um código de rastreamento por WhatsApp.");
                await this.enviarMensagem(numeroWhatsApp, "💚 Agradecemos pela preferência!");
                this.reset();
            } else if (msg === '2' || msg.toLowerCase().includes('cancelar')) {
                await this.enviarMensagem(numeroWhatsApp, "❌ Entrega cancelada. Gerando link de pagamento PIX...");
                await this.enviarMensagem(numeroWhatsApp, "💳 Código PIX: 00020126360014br.gov.bcb.pix011155599999999520400005303986540510.005802BR5913N&G Express6008Cidade62070503***6304E2F3");
                await this.enviarMensagem(numeroWhatsApp, "💡 Após o pagamento, sua entrega será agendada.");
                this.reset();
            }
        }
        else if (this.step === 'motoboy_nome') {
            this.motoboyNome = msg;
            await this.enviarMensagem(numeroWhatsApp, "📍 Em qual região você está localizado? (ex: Vale do Itajaí, Litoral, etc)");
            this.step = 'motoboy_regiao';
        }
        else if (this.step === 'motoboy_regiao') {
            this.motoboyRegiao = msg;
            await this.enviarMensagem(numeroWhatsApp, `✅ Obrigado, ${this.motoboyNome}!`);
            await this.enviarMensagem(numeroWhatsApp, "🔍 Aguarde um momento que logo uma atendente irá falar com você...");
            await this.delay(2000);
            this.atendenteAtual = this.escolherAtendente();
            const horaAtual = this.getCurrentTime();
            await this.enviarMensagem(numeroWhatsApp, `🎯 Você será atendido(a) por: *${this.atendenteAtual}*`);
            await this.enviarMensagem(numeroWhatsApp, `💬 Chat Iniciado - ${horaAtual}`);
            await this.enviarMensagem(numeroWhatsApp, `Olá ${this.motoboyNome}! Sou ${this.atendenteAtual}, em que posso ajudar?`);
            this.step = 'aguardando_atendente';
        }
        else if (this.step === 'aguardando_atendente') {
            await this.enviarMensagem(numeroWhatsApp, "📨 Mensagem enviada para o atendente. Aguarde retorno...");
            await this.delay(1000);
            await this.enviarMensagem(numeroWhatsApp, `👩‍💼 ${this.atendenteAtual}: Recebi sua mensagem! Em breve retorno.`);
        }
    }
    
    async calcularEntrega() {
        // Simular cálculo
        return new Promise((resolve) => {
            setTimeout(() => {
                const distancia = (Math.random() * 50 + 5).toFixed(1);
                const tempo = Math.floor(distancia * 2.5);
                const valor = (distancia * 2.5 + 5).toFixed(2);
                resolve({
                    distancia: `${distancia} km`,
                    tempo: `${tempo} minutos`,
                    valor: `R$ ${valor}`
                });
            }, 1500);
        });
    }
    
    async enviarMensagem(numero, mensagem) {
        // Implementar envio via WhatsApp API
        console.log(`Enviando para ${numero}: ${mensagem}`);
        return true;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    reset() {
        this.step = 'initial';
        this.userType = null;
        this.dadosEntrega = {
            cidadeColeta: '',
            cidadeEntrega: '',
            enderecoColeta: '',
            enderecoEntrega: ''
        };
    }
}

// Exportar para uso
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WhatsAppMobileBot;
}