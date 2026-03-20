document.addEventListener("DOMContentLoaded", function () {
    const chatToggle = document.getElementById("ai-chat-toggle");
    const chatWindow = document.getElementById("ai-chat-window");
    const chatClose = document.getElementById("ai-chat-close");
    const chatForm = document.getElementById("ai-chat-form");
    const chatInput = document.getElementById("ai-chat-input-text");
    const chatMessages = document.getElementById("ai-chat-messages");
    
    const chatTooltip = document.getElementById("ai-chat-tooltip");
    const tooltipClose = document.getElementById("ai-tooltip-close");

    let chatHistory = [];

    // Show tooltip after 2.5 seconds
    setTimeout(() => {
        if (chatTooltip && chatWindow.classList.contains("d-none")) {
            chatTooltip.classList.remove("d-none");
        }
    }, 2500);

    // Close tooltip manually
    if(tooltipClose) {
        tooltipClose.addEventListener("click", (e) => {
            e.stopPropagation();
            chatTooltip.remove();
        });
    }

    // Toggle chat visibility
    function toggleChat() {
        if(chatTooltip) {
            chatTooltip.remove(); // Quita el globo para siempre si abren el chat
        }
        
        if (chatWindow.classList.contains("d-none")) {
            chatWindow.classList.remove("d-none");
            chatInput.focus();
        } else {
            chatWindow.classList.add("d-none");
        }
    }

    chatToggle.addEventListener("click", toggleChat);
    chatClose.addEventListener("click", toggleChat);

    // Add a message to the chat
    function addMessage(text, isUser = false, isHtml = false) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `chat-message ${isUser ? "user-message" : "ai-message"}`;
        
        if (isHtml) {
            msgDiv.innerHTML = text;
        } else {
            msgDiv.textContent = text;
        }
        
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll
    }

    // Handle form submission
    chatForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const userText = chatInput.value.trim();
        if (!userText) return;

        // Display user message
        addMessage(userText, true);
        chatInput.value = "";
        
        // Show loading indicator
        const loadingId = "loading-" + Date.now();
        const loadingHtml = `<div id="${loadingId}" class="text-muted small"><i class="fas fa-circle-notch fa-spin"></i> La IA está escribiendo...</div>`;
        addMessage(loadingHtml, false, true);

        // API CONFIGURATION
        const API_KEY = "AIzaSyB0eMCfaxHH_NNWQBVxTM7ELxQ6p0WfPk4"; 
        
        // Asistente Prompt
        const systInst = `Eres el asistente legal virtual de SGC Abogados.
        REGLA DE ORO: Tus respuestas deben ser MUY CORTAS y al grano. Máximo 1 o 2 líneas por mensaje.
        Perfílalos en este orden:
        PASO 1: Si saludan, pregúntales directamente de qué trata su caso.
        PASO 2: Cuando cuenten el caso, diles que podemos ayudarles y pregúntarles: ¿Prefieres asesoría Presencial o Virtual?
        PASO 3: Al elegir la modalidad, envíalos a agendar su fecha y hora en este enlace: https://calendar.app.google/HrAaWAP6kU9SYpAw8`;
        
        // Agregar mensaje del usuario al historial
        chatHistory.push({ role: "user", parts: [{ text: userText }] });

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systInst }] },
                    contents: chatHistory
                })
            });

            const data = await response.json();
            
            // Remove loading
            const loader = document.getElementById(loadingId);
            if(loader) loader.parentElement.remove();

            if (data.candidates && data.candidates.length > 0) {
                let aiResponse = data.candidates[0].content.parts[0].text;
                
                // Agregar al historial de chat
                chatHistory.push({ role: "model", parts: [{ text: aiResponse }] });
                
                // Formatear markdown para HTML
                aiResponse = aiResponse.replace(/\n/g, "<br>");
                
                // Si la respuesta incluye el enlace, lo estilizamos como botón
                if(aiResponse.includes("https://calendar.app.google/HrAaWAP6kU9SYpAw8")) {
                    aiResponse = aiResponse.replace(/https:\/\/calendar\.app\.google\/[a-zA-Z0-9]+/g, function(match){
                        return `<br><br><a href="${match}" target="_blank" class="calendar-link"><i class="fas fa-calendar-alt me-1"></i> Ver horarios y agendar cita</a>`;
                    });
                }
                
                addMessage(aiResponse, false, true);
            } else {
                addMessage("Hubo un error de conexión, por favor intenta de nuevo.", false);
                chatHistory.pop(); // Revert user message from history
            }
        } catch (error) {
            // Remove loading
            const loadEl = document.getElementById(loadingId);
            if(loadEl) loadEl.parentElement.remove();
            console.error("Error AI:", error);
            
            // Fallback
            addMessage("Lo siento, estoy teniendo problemas de conexión. Si deseas agendar una cita directamente, puedes hacerlo aquí:<br><a href='https://calendar.google.com/' target='_blank' class='calendar-link'><i class='fas fa-calendar-alt me-1'></i> Agendar Cita en Google Calendar</a>", false, true);
        }
    });
});
