// chatbot-integration.js - Script de integração com o site existente

// Inicializar chatbot quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se já existe chatbot
    if (document.querySelector('.chatbot-widget')) return;
    
    // Criar estrutura do chatbot
    const chatbotHTML = `
        <div class="chatbot-widget">
            <div class="chatbot-toggle" id="chatbotToggle">
                <i class="bi bi-chat-dots-fill"></i>
                <span class="notification-badge" id="chatNotification" style="display: none;">1</span>
            </div>
            <div class="chatbot-container" id="chatbotContainer">
                <div class="chat-header">
                    <h3><i class="bi bi-chat-dots-fill"></i> N&G Express</h3>
                    <p>Atendimento 24h | Entregas Rápidas</p>
                    <div class="online-status">
                        <i class="bi bi-circle-fill"></i> Online
                    </div>
                    <button class="close-chat" id="closeChat">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                <div class="chat-messages" id="chatMessages">
                    <!-- Mensagens serão inseridas aqui -->
                </div>
                <div class="chat-input-container">
                    <input type="text" class="chat-input" id="chatInput" placeholder="Digite sua mensagem..." autocomplete="off">
                    <button class="send-btn" id="sendBtn">
                        <i class="bi bi-send-fill"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', chatbotHTML);
    
    // Adicionar estilos
    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = '/css/chatbot-style.css';
    document.head.appendChild(styleLink);
    
    // Configurar eventos
    const toggle = document.getElementById('chatbotToggle');
    const container = document.getElementById('chatbotContainer');
    const closeBtn = document.getElementById('closeChat');
    
    let isOpen = false;
    
    toggle.addEventListener('click', () => {
        isOpen = !isOpen;
        if (isOpen) {
            container.classList.add('open');
            document.getElementById('chatNotification').style.display = 'none';
        } else {
            container.classList.remove('open');
        }
    });
    
    closeBtn.addEventListener('click', () => {
        isOpen = false;
        container.classList.remove('open');
    });
    
    // Inicializar lógica do chatbot
    const chatbot = new NGGExpressChatbot({
        atendentes: ['Gabriele', 'Natanael'],
        apiUrl: window.API_BASE_URL,
        apiKey: window.HERE_API_CONFIG?.apiKey
    });
    
    // Funções para manipular mensagens no DOM
    function addMessageToDOM(content, type, time, atendente) {
        const messagesDiv = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        
        let displayContent = content;
        if (type === 'bot' && atendente) {
            displayContent = `<strong>${atendente}:</strong><br>${content}`;
        }
        
        messageDiv.innerHTML = `
            <div class="message-content">${displayContent}</div>
            <div class="message-time">${time}</div>
        `;
        
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        // Notificação se chat estiver fechado
        if (!isOpen && type === 'bot') {
            const notification = document.getElementById('chatNotification');
            const currentCount = parseInt(notification.textContent) || 0;
            notification.textContent = currentCount + 1;
            notification.style.display = 'flex';
        }
    }
    
    function addOptionsToDOM(options) {
        const messagesDiv = document.getElementById('chatMessages');
        const lastMessage = messagesDiv.lastElementChild;
        
        if (lastMessage && lastMessage.classList.contains('message-bot')) {
            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'options-container';
            
            options.forEach(option => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.textContent = option.text;
                btn.onclick = () => {
                    addMessageToDOM(option.text, 'user', new Date().toLocaleTimeString('pt-BR'), null);
                    option.action();
                };
                optionsContainer.appendChild(btn);
            });
            
            lastMessage.appendChild(optionsContainer);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    }
    
    // Event listeners do chatbot
    document.addEventListener('chat:message', (e) => {
        addMessageToDOM(e.detail.content, e.detail.type, e.detail.time, e.detail.atendente);
    });
    
    document.addEventListener('chat:options', (e) => {
        addOptionsToDOM(e.detail.options);
    });
    
    document.addEventListener('chat:enableInput', () => {
        const input = document.getElementById('chatInput');
        const sendBtn = document.getElementById('sendBtn');
        input.disabled = false;
        input.focus();
    });
    
    // Enviar mensagem
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    
    function sendMessage() {
        const message = input.value.trim();
        if (message) {
            document.dispatchEvent(new CustomEvent('chat:userMessage', {
                detail: { message }
            }));
            input.value = '';
        }
    }
    
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    console.log('✅ Chatbot N&G Express inicializado!');
});