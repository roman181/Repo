# Saalbach Clash-like MVP

Dieses Repository enthält ein einfaches Clash‑of‑Clans‑inspiriertes Multiplayer‑MVP.

Features:
- Builder: Platzieren von Gebäuden auf Raster und Speichern der Basis (Server‑JSON)
- Attack: Matchmaking (1v1) — Server lädt Verteidigungsbasis, Spieler angreift mit einfachen Truppen
- Server‑authoritative Simulation (Bewegung, Schaden). Updates per Socket.io.

Starten (lokal):
1. Node.js installieren
2. npm install
3. npm start
4. Öffne http://localhost:3000

Hinweis: Für öffentliches Hosting nutze Railway/Render/Vercel (mit WebSocket Unterstützung) etc.
