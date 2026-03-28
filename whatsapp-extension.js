// whatsapp-extension.js - Extensão para WhatsApp Web

console.log('🚀 N&G Express Extension carregada!');

// Criar e injetar o chatbot no WhatsApp Web
function injectChatbot() {
    // Verificar se já existe
    if (document.getElementById('ng-chatbot-container')) return;
    
    // Criar container do chatbot
    const chatbotContainer = document.createElement('div');
    chatbotContainer.id = 'ng-chatbot-container';
    chatbotContainer.innerHTML = `
        <div class="ng-chatbot-widget">
            <div class="ng-chatbot-toggle" id="ngChatbotToggle">
                <i class="bi bi-chat-dots-fill"></i>
                <span class="ng-notification-badge" style="display: none;">1</span>
            </div>
            <iframe 
                id="ngChatbotIframe"
                src="${chrome.runtime.getURL('chatbot.html')}"
                style="
                    position: fixed;
                    bottom: 90px;
                    right: 20px;
                    width: 380px;
                    height: 600px;
                    border: none;
                    border-radius: 20px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    display: none;
                    z-index: 9999;
                    background: white;
                "
            ></iframe>
        </div>
    `;
    
    document.body.appendChild(chatbotContainer);
    
    // Adicionar estilos
    const style = document.createElement('style');
    style.textContent = `
        .ng-chatbot-widget {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
        }
        
        .ng-chatbot-toggle {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        }
        
        .ng-chatbot-toggle:hover {
            transform: scale(1.05);
        }
        
        .ng-chatbot-toggle i {
            font-size: 28px;
            color: white;
        }
        
        .ng-notification-badge {
            position: absolute;
            top: -5px;
            right: -5px;
            background: #f56565;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            font-size: 11px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        @media (max-width: 768px) {
            #ngChatbotIframe {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                width: 100% !important;
                height: 100% !important;
                border-radius: 0 !important;
                bottom: auto !important;
                right: auto !important;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Eventos
    const toggle = document.getElementById('ngChatbotToggle');
    const iframe = document.getElementById('ngChatbotIframe');
    let isOpen = false;
    
    toggle.addEventListener('click', () => {
        isOpen = !isOpen;
        iframe.style.display = isOpen ? 'block' : 'none';
        if (isOpen) {
            document.querySelector('.ng-notification-badge').style.display = 'none';
        }
    });
    
    // Fechar ao clicar fora (apenas desktop)
    document.addEventListener('click', (e) => {
        if (isOpen && !chatbotContainer.contains(e.target)) {
            isOpen = false;
            iframe.style.display = 'none';
        }
    });
}

// Aguardar carregamento do WhatsApp Web
function waitForWhatsApp() {
    const checkInterval = setInterval(() => {
        if (document.querySelector('div[data-testid="conversation-panel"]')) {
            clearInterval(checkInterval);
            injectChatbot();
        }
    }, 1000);
}

// Iniciar
if (window.location.hostname === 'web.whatsapp.com') {
    waitForWhatsApp();
}