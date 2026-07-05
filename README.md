# 🎵 C-Unplugged Music Application 🎵

**C-Unplugged** has been converted from a terminal CLI application into a premium, fully-featured, responsive **Spotify-style Web Music Player**. Built natively with standard web technologies, it features rich audio synthesis, a live equalizer visualizer, customizable playlists, and automated state persistence.

---

## 🌟 Key Features

- 🎧 **Spotify-like Premium UI**: Glassmorphic, dark-mode design with fluid transitions, active-track highlighting, responsive side navigation, and a dynamic media card layout.
- 🔊 **Built-in Web Audio Synth Engine**: Zero dependencies on external MP3 links! Playback generates beautiful real-time synthesizer arpeggios that adapt to each song, complete with dynamic volume scaling, loop capability, and seeking.
- 📊 **Canvas Audio Visualizer**: A custom frequency visualizer that reacts instantly to the synthesizer frequencies during active playback.
- 🔁 **Looped Playback & Navigation**: Supports full play, pause, next, previous, and infinite looping of playlists (mimicking the original Doubly Circular Linked List sequence structure).
- ⚡ **Interactive Catalog Customization**: Easily add custom songs or create custom albums and playlists right from the interface.
- 💾 **100% localStorage Persistence**: Your library additions, newly created albums, custom playlists, and session log history are saved automatically and survive page refreshes.
- 📜 **Session Command Logger**: Review the active session logs in the "Command Log" page to monitor interaction history.

---

## 🏗️ Architecture & Web Stack

- **HTML5 & Vanilla CSS**: Implements modern flexbox, CSS grid, customized scrollbars, animations, and custom SVG iconography.
- **ES6 JavaScript Modules**: Handles state orchestration, Web Audio API synthesis, canvas rendering, form submissions, and state persistence.
- **Web Audio API**: Provides oscillator voice synthesis, gain manipulation for volume levels, and analyser node output for frequency bars.
- **Local Storage API**: Handles simple, instant JSON serialization and deserialization of the app state.

---

## 🚀 Getting Started

### 1. Launching Locally (Any Web Server)

Since this is a lightweight static client-side web application, you can run it using any simple static file server.

**Option A: Python HTTP Server (Built-in)**
```bash
python -m http.server 8000
```
Then navigate to: `http://localhost:8000`

**Option B: Node.js (npx)**
```bash
npx serve .
```
Then navigate to the URL printed in the console.

**Option C: Direct Execution**
Simply double-click the `index.html` file in your system file explorer to open it directly in Google Chrome, Microsoft Edge, or Firefox.

---

## 🎮 How to Use

1. **Browsing tracks**: Click **All Songs** in the sidebar to view the global catalog. Click any track row to play/pause.
2. **Playing Music**: Controls are located in the bottom media bar. You can play/pause, step to the next/previous track, toggle looping, drag/click the progress seek bar to skip around, or adjust the volume slider.
3. **Creating Playlists**: Click the `+` button in the sidebar under Playlists, name it, and save.
4. **Adding Tracks**:
   - To add a new song to the global library: click **Add Song to Library** in the header.
   - To enqueue a song into a playlist: click the `+` icon on a song row and select your target playlist or album.
5. **Viewing Command Logs**: Click **Command Log** in the sidebar to review the step-by-step history of operations performed.
