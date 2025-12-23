// 1. Initialisiere Gun mit öffentlichen Relay-Peers
// Diese Server verteilen die Nachrichten, speichern sie aber nicht permanent wie eine klassische Datenbank.
const gun = Gun([
    'https://gun-manhattan.herokuapp.com/gun',
    'https://relay.peer.ooo/gun',
    'https://gun-us.herokuapp.com/gun' 
]);

// Erstelle einen Referenz-Namen für den Chat (wie ein Kanal-Name)
// Ändere 'mein-geheimer-chat-2025' in etwas Einzigartiges, wenn du einen privaten Raum willst!
const chatApp = gun.get('mein-geheimer-chat-2025-v1');

// UI Elemente auswählen
const messageBoard = document.getElementById('message-board');
const messageInput = document.getElementById('message-input');
const usernameInput = document.getElementById('username');
const sendBtn = document.getElementById('send-btn');
const statusDiv = document.getElementById('status');

// Zufälligen Namen generieren, falls leer
if(!localStorage.getItem('alias')) {
    usernameInput.value = "Gast" + Math.floor(Math.random() * 1000);
} else {
    usernameInput.value = localStorage.getItem('alias');
}

// 2. Nachrichten EMPFANGEN
// map() iteriert über alle Nachrichten, once() abonniert Updates
chatApp.map().once((node, id) => {
    if (!node || !node.text) return; // Leere Daten ignorieren
    
    // Prüfen, ob Nachricht schon angezeigt wird (Deduplizierung)
    if (document.getElementById(id)) return;

    // Nachricht ins HTML einfügen
    renderMessage(id, node);
});

function renderMessage(id, data) {
    const div = document.createElement('div');
    div.id = id;
    div.className = 'message';
    
    // Zeitstempel lesbar machen
    const time = new Date(data.createdAt).toLocaleTimeString();

    div.innerHTML = `
        <strong>${sanitize(data.alias)}</strong>
        <span class="text">${sanitize(data.text)}</span>
        <div class="time">${time}</div>
    `;

    messageBoard.appendChild(div);
    // Automatisch nach unten scrollen
    messageBoard.scrollTop = messageBoard.scrollHeight;
}

// 3. Nachrichten SENDEN
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const text = messageInput.value.trim();
    const alias = usernameInput.value.trim() || "Anonym";

    if (!text) return;

    // Speichere den Namen für den nächsten Besuch
    localStorage.setItem('alias', alias);

    // Datenpaket erstellen
    const messageData = {
        text: text,
        alias: alias,
        createdAt: Date.now() // Zeitstempel für Sortierung
    };

    // An GunDB senden (set fügt es zur Liste hinzu)
    chatApp.set(messageData);

    // Eingabefeld leeren
    messageInput.value = '';
}

// Hilfsfunktion gegen HTML-Injection (Sicherheit)
function sanitize(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

// Einfacher Verbindungs-Check (optional)
setTimeout(() => {
    if(messageBoard.children.length === 0) {
        statusDiv.innerText = "Warte auf Peers...";
    } else {
        statusDiv.innerText = "Verbunden";
        statusDiv.style.color = "#00ff88";
    }
}, 2000);