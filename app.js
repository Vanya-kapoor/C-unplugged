/**
 * C-Unplugged Web Music Player Application
 * Core JavaScript Logic, Web Audio Synthesis, and State Persistence.
 */

class Logger {
    constructor() {
        this.logs = JSON.parse(localStorage.getItem('c_unplugged_logs')) || [
            `${new Date().toISOString()}: Initialized session log.`
        ];
    }

    log(message) {
        const entry = `${new Date().toLocaleTimeString()} - ${message}`;
        this.logs.push(entry);
        if (this.logs.length > 100) {
            this.logs.shift(); // Keep last 100 logs
        }
        localStorage.setItem('c_unplugged_logs', JSON.stringify(this.logs));
        
        // Notify logger view if currently open
        if (app && app.currentView === 'history') {
            app.renderHistory();
        }
    }

    getLogs() {
        return this.logs;
    }
}

const logger = new Logger();

/**
 * Web Audio API Synth Engine
 * Generates beautiful, lo-fi synthesizer arpeggios dynamically so playback works offline!
 */
class SynthAudioEngine {
    constructor() {
        this.ctx = null;
        this.gainNode = null;
        this.analyser = null;
        this.isPlaying = false;
        this.currentTime = 0;
        this.duration = 180; // default 3 mins
        this.volume = 0.8;
        this.timer = null;
        this.synthInterval = null;
        
        // Callback when playback progress updates
        this.onTimeUpdate = null;
        this.onEnded = null;

        // Sound configuration based on active song
        this.activeScale = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]; // C Major
    }

    initContext() {
        if (!this.ctx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
            this.gainNode = this.ctx.createGain();
            this.analyser = this.ctx.createAnalyser();
            
            this.analyser.fftSize = 64;
            this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
            
            // Connect: Synth -> Gain -> Analyser -> Destination
            this.gainNode.connect(this.analyser);
            this.analyser.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setSong(song) {
        this.duration = (song.minutes * 60) + song.seconds;
        this.currentTime = 0;
        
        // Generate a custom scale / melody pattern based on song name length or characters
        // to make different songs sound distinct!
        const code = song.song_name.charCodeAt(0) || 60;
        const baseFreq = 130.81 + (code % 24) * 8; // base frequency
        
        // Pentatonic/major scale generation
        this.activeScale = [
            baseFreq,
            baseFreq * 9/8,
            baseFreq * 5/4,
            baseFreq * 3/2,
            baseFreq * 5/3,
            baseFreq * 2,
            baseFreq * 9/4,
            baseFreq * 5/2
        ];
    }

    play() {
        this.initContext();
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        logger.log(`AudioEngine: Started playback.`);
        
        // Time tracker
        this.timer = setInterval(() => {
            if (this.currentTime < this.duration) {
                this.currentTime++;
                if (this.onTimeUpdate) this.onTimeUpdate(this.currentTime);
            } else {
                this.stop();
                if (this.onEnded) this.onEnded();
            }
        }, 1000);

        // Synth note generator
        let noteIndex = 0;
        this.synthInterval = setInterval(() => {
            if (!this.isPlaying) return;
            this.triggerSynthNote(noteIndex);
            noteIndex = (noteIndex + 1) % 8;
        }, 350); // Play arpeggio
    }

    triggerSynthNote(step) {
        if (!this.ctx || this.ctx.state === 'suspended') return;

        const time = this.ctx.currentTime;
        
        // Create oscillator for main voice
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();

        // Arpeggiator pattern logic
        let scaleDegree = step;
        if (step === 3 || step === 7) scaleDegree = (step + Math.floor(Math.random() * 3)) % 8;
        
        const freq = this.activeScale[scaleDegree];
        osc.frequency.setValueAtTime(freq, time);

        // Warm triangle wave for retro sound
        osc.type = step % 4 === 0 ? 'sine' : 'triangle';
        
        noteGain.gain.setValueAtTime(0, time);
        noteGain.gain.linearRampToValueAtTime(0.15, time + 0.05);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);

        osc.connect(noteGain);
        noteGain.connect(this.gainNode);
        
        osc.start(time);
        osc.stop(time + 0.35);

        // Add a soft sub-bass note on beat 0 and 4
        if (step === 0 || step === 4) {
            const subOsc = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            subOsc.frequency.setValueAtTime(freq / 2, time);
            subOsc.type = 'sine';
            
            subGain.gain.setValueAtTime(0, time);
            subGain.gain.linearRampToValueAtTime(0.2, time + 0.1);
            subGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.6);
            
            subOsc.connect(subGain);
            subGain.connect(this.gainNode);
            subOsc.start(time);
            subOsc.stop(time + 0.65);
        }
    }

    pause() {
        this.isPlaying = false;
        clearInterval(this.timer);
        clearInterval(this.synthInterval);
        logger.log(`AudioEngine: Paused playback.`);
    }

    stop() {
        this.pause();
        this.currentTime = 0;
        if (this.onTimeUpdate) this.onTimeUpdate(this.currentTime);
    }

    seek(seconds) {
        this.currentTime = Math.max(0, Math.min(this.duration, seconds));
        if (this.onTimeUpdate) this.onTimeUpdate(this.currentTime);
        logger.log(`AudioEngine: Seeked to ${this.currentTime}s.`);
    }

    setVolume(volume) {
        this.volume = volume;
        if (this.gainNode) {
            this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        }
        logger.log(`AudioEngine: Volume changed to ${Math.round(volume * 100)}%.`);
    }
}

/**
 * Main Application State & Coordinator
 */
class App {
    constructor() {
        this.audioEngine = new SynthAudioEngine();
        this.currentView = 'songs'; // 'songs', 'albums', 'history', 'playlist-[name]', 'album-[name]'
        
        // Initial / Saved state
        this.songs = JSON.parse(localStorage.getItem('c_unplugged_songs')) || [
            { id: 1, song_name: 'Bohemian Rhapsody', singer: 'Queen', album: 'A Night at the Opera', minutes: 5, seconds: 55 },
            { id: 2, song_name: 'Hotel California', singer: 'Eagles', album: 'Hotel California', minutes: 6, seconds: 30 },
            { id: 3, song_name: 'Imagine', singer: 'John Lennon', album: 'Imagine', minutes: 3, seconds: 4 }
        ];

        this.playlists = JSON.parse(localStorage.getItem('c_unplugged_playlists')) || {
            'Classic Rock': [1, 2],
            'Chill Hits': [3]
        };

        this.albums = JSON.parse(localStorage.getItem('c_unplugged_albums')) || [
            { name: 'A Night at the Opera', year: 1975 },
            { name: 'Hotel California', year: 1976 },
            { name: 'Imagine', year: 1971 }
        ];

        // Active state
        this.currentTrackList = [...this.songs]; // active pool of playing tracks
        this.currentPlayingIndex = -1; // -1 means none
        this.isLooping = false;
        
        // Canvas visualizer rendering context
        this.canvas = null;
        this.canvasCtx = null;
        this.animationFrameId = null;

        // Initialize App
        this.init();
    }

    saveState() {
        localStorage.setItem('c_unplugged_songs', JSON.stringify(this.songs));
        localStorage.setItem('c_unplugged_playlists', JSON.stringify(this.playlists));
        localStorage.setItem('c_unplugged_albums', JSON.stringify(this.albums));
    }

    init() {
        // Elements
        this.canvas = document.getElementById('visualizer');
        this.canvasCtx = this.canvas.getContext('2d');
        
        // Setup Canvas Resolution
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Audio callbacks
        this.audioEngine.onTimeUpdate = (time) => this.updateProgressBar(time);
        this.audioEngine.onEnded = () => this.handleTrackEnded();

        // Event bindings
        this.bindEvents();

        // Render UI
        this.renderPlaylists();
        this.renderTracks();
        this.startVisualizer();
        
        logger.log('App: Loaded state & interface initialized.');
    }

    resizeCanvas() {
        if (this.canvas) {
            this.canvas.width = this.canvas.parentElement.clientWidth;
            this.canvas.height = this.canvas.parentElement.clientHeight;
        }
    }

    bindEvents() {
        // Sidebar views
        document.getElementById('navAllSongs').addEventListener('click', () => this.setView('songs'));
        document.getElementById('navAlbums').addEventListener('click', () => this.setView('albums'));
        document.getElementById('navHistory').addEventListener('click', () => this.setView('history'));

        // Play/Pause, Next, Prev, Volume, Loop
        document.getElementById('btnPlayPause').addEventListener('click', () => this.togglePlayPause());
        document.getElementById('btnNext').addEventListener('click', () => this.playNext());
        document.getElementById('btnPrev').addEventListener('click', () => this.playPrevious());
        document.getElementById('btnLoop').addEventListener('click', () => this.toggleLoop());
        
        // Seek interactions
        const progressBarWrap = document.getElementById('progressBarWrap');
        progressBarWrap.addEventListener('click', (e) => {
            const rect = progressBarWrap.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            const targetTime = pos * this.audioEngine.duration;
            this.audioEngine.seek(targetTime);
        });

        // Volume interactions
        const volumeBarWrap = document.getElementById('volumeBarWrap');
        volumeBarWrap.addEventListener('click', (e) => {
            const rect = volumeBarWrap.getBoundingClientRect();
            const val = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            document.getElementById('volumeBarFill').style.width = `${val * 100}%`;
            this.audioEngine.setVolume(val);
        });

        // Search Input
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.renderTracks(e.target.value);
        });

        // Modal triggers
        document.getElementById('btnAddSong').addEventListener('click', () => this.showModal('addSongModal'));
        document.getElementById('btnCreatePlaylist').addEventListener('click', () => this.showModal('createPlaylistModal'));
        document.getElementById('btnCreateAlbum').addEventListener('click', () => this.showModal('createAlbumModal'));
        document.getElementById('btnDeletePlaylist').addEventListener('click', () => this.deleteActivePlaylist());

        // Forms
        document.getElementById('addSongForm').addEventListener('submit', (e) => this.handleAddSongForm(e));
        document.getElementById('createPlaylistForm').addEventListener('submit', (e) => this.handleCreatePlaylistForm(e));
        document.getElementById('createAlbumForm').addEventListener('submit', (e) => this.handleCreateAlbumForm(e));
        document.getElementById('addToPlaylistForm').addEventListener('submit', (e) => this.handleAddToPlaylistForm(e));

        // Close buttons in modals
        document.querySelectorAll('.closeModalBtn').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });

        // Mobile responsive sidebar toggle
        const toggleBtn = document.getElementById('mobileMenuToggle');
        const sidebar = document.getElementById('sidebar');
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('open');
        });
        document.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }

    // Modal management
    showModal(id) {
        document.getElementById(id).classList.add('show');
    }

    closeModals() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.classList.remove('show');
        });
    }

    showToast(message) {
        const toast = document.getElementById('toastNotification');
        document.getElementById('toastMessage').innerText = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    setView(viewName) {
        this.currentView = viewName;
        
        // Active states in sidebar navigation
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        document.getElementById('playlistActions').style.display = 'none';

        if (viewName === 'songs') {
            document.getElementById('navAllSongs').classList.add('active');
            this.currentTrackList = [...this.songs];
            this.updateHero('All Library Tracks', 'Listen to all your uploaded tracks. High-fidelity web synthesis audio playback.', 'Playlist', this.currentTrackList.length);
            this.renderTracks();
        } else if (viewName === 'albums') {
            document.getElementById('navAlbums').classList.add('active');
            this.renderAlbumsView();
        } else if (viewName === 'history') {
            document.getElementById('navHistory').classList.add('active');
            this.renderHistory();
        } else if (viewName.startsWith('playlist-')) {
            const playlistName = viewName.replace('playlist-', '');
            // Highlight specific sidebar playlist
            const listItems = document.querySelectorAll('.sidebar-playlist-item');
            listItems.forEach(item => {
                if (item.dataset.name === playlistName) item.classList.add('active');
            });
            document.getElementById('playlistActions').style.display = 'flex';

            const songIds = this.playlists[playlistName] || [];
            this.currentTrackList = this.songs.filter(s => songIds.includes(s.id));
            this.updateHero(playlistName, `Custom user playlist. High-fidelity audio sequence.`, 'Custom Playlist', this.currentTrackList.length);
            this.renderTracks();
        } else if (viewName.startsWith('album-')) {
            const albumName = viewName.replace('album-', '');
            const albumObj = this.albums.find(a => a.name === albumName);
            this.currentTrackList = this.songs.filter(s => s.album === albumName);
            this.updateHero(albumName, `Album released in ${albumObj ? albumObj.year : 'Unknown'}.`, 'Album', this.currentTrackList.length);
            this.renderTracks();
        }
        
        logger.log(`App: Navigated to ${viewName} view.`);
    }

    updateHero(title, desc, badge, count) {
        document.getElementById('heroTitle').innerText = title;
        document.getElementById('heroDescription').innerText = desc;
        document.getElementById('heroContextBadge').innerText = badge;
        document.getElementById('heroSongCount').innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13" />
            </svg>
            ${count} Songs
        `;
    }

    // CRUD Event Handlers
    handleAddSongForm(e) {
        const title = document.getElementById('songTitle').value.trim();
        const artist = document.getElementById('songArtist').value.trim();
        const albumName = document.getElementById('songAlbum').value.trim();
        const min = parseInt(document.getElementById('songMin').value);
        const sec = parseInt(document.getElementById('songSec').value);

        if (!title || !artist || !albumName) return;

        const nextId = this.songs.length > 0 ? Math.max(...this.songs.map(s => s.id)) + 1 : 1;
        const newSong = {
            id: nextId,
            song_name: title,
            singer: artist,
            album: albumName,
            minutes: min,
            seconds: sec
        };

        this.songs.push(newSong);
        
        // Automatically create album entry if it doesn't exist
        if (!this.albums.some(a => a.name.toLowerCase() === albumName.toLowerCase())) {
            this.albums.push({ name: albumName, year: new Date().getFullYear() });
        }

        this.saveState();
        this.closeModals();
        document.getElementById('addSongForm').reset();
        
        // Refresh view
        if (this.currentView === 'songs') {
            this.currentTrackList = [...this.songs];
            this.setView('songs');
        } else {
            this.renderPlaylists();
        }

        logger.log(`App: Added song "${title}" by ${artist} to library.`);
        this.showToast(`"${title}" added to Library!`);
    }

    handleCreatePlaylistForm(e) {
        const name = document.getElementById('playlistName').value.trim();
        if (!name) return;

        if (this.playlists[name]) {
            alert('A playlist with this name already exists!');
            return;
        }

        this.playlists[name] = [];
        this.saveState();
        this.closeModals();
        document.getElementById('createPlaylistForm').reset();
        
        this.renderPlaylists();
        logger.log(`App: Created playlist "${name}".`);
        this.showToast(`Playlist "${name}" created!`);
        this.setView(`playlist-${name}`);
    }

    handleCreateAlbumForm(e) {
        const name = document.getElementById('albumName').value.trim();
        const year = parseInt(document.getElementById('albumYear').value);
        if (!name) return;

        if (this.albums.some(a => a.name.toLowerCase() === name.toLowerCase())) {
            alert('An album with this name already exists!');
            return;
        }

        this.albums.push({ name, year });
        this.saveState();
        this.closeModals();
        document.getElementById('createAlbumForm').reset();
        
        logger.log(`App: Created album "${name}" (${year}).`);
        this.showToast(`Album "${name}" created!`);
        this.setView('albums');
    }

    deleteActivePlaylist() {
        if (!this.currentView.startsWith('playlist-')) return;
        const playlistName = this.currentView.replace('playlist-', '');
        
        if (confirm(`Are you sure you want to delete the playlist "${playlistName}"?`)) {
            delete this.playlists[playlistName];
            this.saveState();
            this.renderPlaylists();
            logger.log(`App: Deleted playlist "${playlistName}".`);
            this.showToast(`Playlist "${playlistName}" deleted.`);
            this.setView('songs');
        }
    }

    showAddToPlaylistModal(songId) {
        document.getElementById('addToPlaylistSongId').value = songId;
        
        // Build selection options
        const select = document.getElementById('targetSelect');
        select.innerHTML = '<option value="" disabled selected>-- Choose playlist or album --</option>';
        
        // Add Playlists
        const optGroupPlaylists = document.createElement('optgroup');
        optGroupPlaylists.label = 'Playlists';
        Object.keys(this.playlists).forEach(name => {
            const opt = document.createElement('option');
            opt.value = `playlist:${name}`;
            opt.innerText = name;
            optGroupPlaylists.appendChild(opt);
        });
        select.appendChild(optGroupPlaylists);

        // Add Albums
        const optGroupAlbums = document.createElement('optgroup');
        optGroupAlbums.label = 'Albums';
        this.albums.forEach(album => {
            const opt = document.createElement('option');
            opt.value = `album:${album.name}`;
            opt.innerText = album.name;
            optGroupAlbums.appendChild(opt);
        });
        select.appendChild(optGroupAlbums);

        this.showModal('addToPlaylistModal');
    }

    handleAddToPlaylistForm(e) {
        const songId = parseInt(document.getElementById('addToPlaylistSongId').value);
        const targetValue = document.getElementById('targetSelect').value;
        
        if (!targetValue) return;

        const song = this.songs.find(s => s.id === songId);
        if (!song) return;

        const [type, name] = targetValue.split(':');
        
        if (type === 'playlist') {
            if (!this.playlists[name].includes(songId)) {
                this.playlists[name].push(songId);
                this.saveState();
                logger.log(`App: Added song "${song.song_name}" to playlist "${name}".`);
                this.showToast(`Added to "${name}"`);
            } else {
                alert('Song is already in this playlist!');
            }
        } else if (type === 'album') {
            // Update song's album
            song.album = name;
            this.saveState();
            logger.log(`App: Set album of song "${song.song_name}" to "${name}".`);
            this.showToast(`Set album to "${name}"`);
        }

        this.closeModals();
        // Refresh active views
        if (this.currentView.startsWith('playlist-') || this.currentView.startsWith('album-')) {
            this.setView(this.currentView);
        }
    }

    removeSongFromPlaylist(songId, playlistName) {
        const index = this.playlists[playlistName].indexOf(songId);
        if (index > -1) {
            this.playlists[playlistName].splice(index, 1);
            this.saveState();
            logger.log(`App: Removed song ID ${songId} from playlist "${playlistName}".`);
            this.setView(`playlist-${playlistName}`);
        }
    }

    deleteSongFromLibrary(songId) {
        const song = this.songs.find(s => s.id === songId);
        if (!song) return;

        if (confirm(`Are you sure you want to permanently delete "${song.song_name}" from the global library?`)) {
            // Remove from global list
            this.songs = this.songs.filter(s => s.id !== songId);

            // Remove from all playlists
            Object.keys(this.playlists).forEach(name => {
                this.playlists[name] = this.playlists[name].filter(id => id !== songId);
            });

            this.saveState();
            logger.log(`App: Permanently deleted song "${song.song_name}" from library.`);
            this.showToast(`Deleted "${song.song_name}"`);
            
            // Refresh view
            if (this.currentPlayingIndex > -1 && this.currentTrackList[this.currentPlayingIndex].id === songId) {
                this.audioEngine.stop();
                this.currentPlayingIndex = -1;
                this.updatePlayerUI(null);
            }
            
            if (this.currentView === 'songs') {
                this.currentTrackList = [...this.songs];
            }
            this.setView(this.currentView);
        }
    }

    // UI Rendering
    renderPlaylists() {
        const container = document.getElementById('playlistsList');
        container.innerHTML = '';

        Object.keys(this.playlists).forEach(name => {
            const el = document.createElement('a');
            el.className = 'nav-item sidebar-playlist-item';
            el.dataset.name = name;
            el.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span>${name}</span>
            `;
            el.addEventListener('click', () => this.setView(`playlist-${name}`));
            container.appendChild(el);
        });
    }

    renderTracks(searchFilter = '') {
        const container = document.getElementById('trackListContainer');
        container.innerHTML = '';

        let filtered = [...this.currentTrackList];
        if (searchFilter.trim()) {
            const query = searchFilter.toLowerCase();
            filtered = filtered.filter(s => 
                s.song_name.toLowerCase().includes(query) || 
                s.singer.toLowerCase().includes(query) || 
                s.album.toLowerCase().includes(query)
            );
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                    </svg>
                    <h3>No tracks found</h3>
                    <p>Try searching for a different term or add a new track.</p>
                </div>
            `;
            return;
        }

        filtered.forEach((song, idx) => {
            const isCurrentPlaying = this.currentPlayingIndex > -1 && 
                                     this.currentTrackList[this.currentPlayingIndex] &&
                                     this.currentTrackList[this.currentPlayingIndex].id === song.id;
            
            const item = document.createElement('div');
            item.className = `track-item ${isCurrentPlaying ? 'active' : ''}`;
            
            const formatDuration = `${song.minutes}:${song.seconds.toString().padStart(2, '0')}`;
            
            // Build action buttons contextually
            let actionBtnHtml = '';
            if (this.currentView.startsWith('playlist-')) {
                const playlistName = this.currentView.replace('playlist-', '');
                actionBtnHtml = `
                    <button class="btn-track-action remove-playlist-btn" title="Remove from playlist" data-song-id="${song.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                `;
            } else {
                actionBtnHtml = `
                    <button class="btn-track-action add-playlist-btn" title="Add to playlist/album" data-song-id="${song.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                    <button class="btn-track-action delete-library-btn" title="Delete permanently" data-song-id="${song.id}" style="margin-left:6px;">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                `;
            }

            item.innerHTML = `
                <div class="track-index">${idx + 1}</div>
                <div class="track-details">
                    <div class="track-title">${song.song_name}</div>
                    <div class="track-artist">${song.singer}</div>
                </div>
                <div class="track-album">${song.album}</div>
                <div class="track-duration">${formatDuration}</div>
                <div class="track-actions">${actionBtnHtml}</div>
            `;

            // Double click to play
            item.addEventListener('dblclick', () => this.playTrack(song));
            
            // Single click to highlight & load info, but double click is cleaner
            // Standard click plays
            item.querySelector('.track-details').addEventListener('click', () => this.playTrack(song));
            item.querySelector('.track-index').addEventListener('click', () => this.playTrack(song));

            // Stop propagation on buttons
            if (item.querySelector('.add-playlist-btn')) {
                item.querySelector('.add-playlist-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showAddToPlaylistModal(song.id);
                });
            }
            if (item.querySelector('.delete-library-btn')) {
                item.querySelector('.delete-library-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteSongFromLibrary(song.id);
                });
            }
            if (item.querySelector('.remove-playlist-btn')) {
                item.querySelector('.remove-playlist-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    const playlistName = this.currentView.replace('playlist-', '');
                    this.removeSongFromPlaylist(song.id, playlistName);
                });
            }

            container.appendChild(item);
        });
    }

    renderAlbumsView() {
        const container = document.getElementById('trackListContainer');
        container.innerHTML = '';
        
        document.getElementById('trackListTitle').innerText = 'All Albums';

        if (this.albums.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No albums created yet</h3>
                    <p>Click "Create Album" to start your music catalogue.</p>
                </div>
            `;
            return;
        }

        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
        grid.style.gap = '20px';

        this.albums.forEach(album => {
            const card = document.createElement('div');
            card.className = 'section-card';
            card.style.cursor = 'pointer';
            card.style.transition = 'all var(--transition-fast)';
            
            // Count tracks in album
            const tracksCount = this.songs.filter(s => s.album.toLowerCase() === album.name.toLowerCase()).length;

            card.innerHTML = `
                <div class="hero-art" style="height:120px; border-radius:12px; margin-bottom:10px; background:linear-gradient(45deg, var(--bg-card), var(--primary-glow));">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:40px;height:40px;opacity:0.4;">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                </div>
                <div style="font-weight:700; font-size:16px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${album.name}</div>
                <div style="font-size:13px; color:var(--text-secondary); display:flex; justify-content:space-between;">
                    <span>${album.year}</span>
                    <span>${tracksCount} tracks</span>
                </div>
            `;
            card.addEventListener('click', () => {
                this.setView(`album-${album.name}`);
            });
            grid.appendChild(card);
        });

        container.appendChild(grid);
    }

    renderHistory() {
        const container = document.getElementById('trackListContainer');
        container.innerHTML = '';
        document.getElementById('trackListTitle').innerText = 'Command Interaction Logs';

        const logs = logger.getLogs();
        if (logs.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>No session logs recorded yet.</p></div>`;
            return;
        }

        const logList = document.createElement('div');
        logList.style.display = 'flex';
        logList.style.flexDirection = 'column';
        logList.style.gap = '8px';

        logs.forEach(log => {
            const el = document.createElement('div');
            el.className = 'history-item';
            el.innerText = log;
            logList.appendChild(el);
        });

        container.appendChild(logList);
    }

    // Audio Playback Orchestration
    playTrack(song) {
        // Find index in active list
        const idx = this.currentTrackList.findIndex(s => s.id === song.id);
        if (idx > -1) {
            this.currentPlayingIndex = idx;
        }

        // Set song metadata in audio engine
        this.audioEngine.setSong(song);
        
        // Start playback
        this.audioEngine.play();

        // Update UI
        this.updatePlayerUI(song);
        this.renderTracks(); // highlight active track
        
        logger.log(`App: Playing track "${song.song_name}" by ${song.singer}.`);
    }

    togglePlayPause() {
        if (this.currentPlayingIndex === -1) {
            // Play first song in list
            if (this.currentTrackList.length > 0) {
                this.playTrack(this.currentTrackList[0]);
            }
            return;
        }

        const activeTrack = this.currentTrackList[this.currentPlayingIndex];

        if (this.audioEngine.isPlaying) {
            this.audioEngine.pause();
            document.body.classList.remove('playing');
            document.getElementById('nowPlayingCard').classList.remove('playing');
            document.getElementById('playIcon').innerHTML = '<path d="M8 5v14l11-7z" />';
        } else {
            this.audioEngine.play();
            document.body.classList.add('playing');
            document.getElementById('nowPlayingCard').classList.add('playing');
            document.getElementById('playIcon').innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />';
        }
    }

    playNext() {
        if (this.currentTrackList.length === 0) return;

        let nextIdx = this.currentPlayingIndex + 1;
        
        // Circular loop check (original C Circular Doubly Linked List replica)
        if (nextIdx >= this.currentTrackList.length) {
            nextIdx = 0; // loops back to beginning
        }

        this.currentPlayingIndex = nextIdx;
        this.playTrack(this.currentTrackList[this.currentPlayingIndex]);
    }

    playPrevious() {
        if (this.currentTrackList.length === 0) return;

        let prevIdx = this.currentPlayingIndex - 1;
        
        // Circular loop check
        if (prevIdx < 0) {
            prevIdx = this.currentTrackList.length - 1; // loops back to end
        }

        this.currentPlayingIndex = prevIdx;
        this.playTrack(this.currentTrackList[this.currentPlayingIndex]);
    }

    toggleLoop() {
        this.isLooping = !this.isLooping;
        const btn = document.getElementById('btnLoop');
        if (this.isLooping) {
            btn.classList.add('active-toggle');
            logger.log(`App: Looped playback enabled.`);
        } else {
            btn.classList.remove('active-toggle');
            logger.log(`App: Looped playback disabled.`);
        }
    }

    handleTrackEnded() {
        logger.log(`App: Track ended.`);
        if (this.isLooping) {
            // Replay same song
            this.playTrack(this.currentTrackList[this.currentPlayingIndex]);
        } else {
            // Play next
            this.playNext();
        }
    }

    updatePlayerUI(song) {
        if (!song) {
            document.getElementById('playerTrackTitle').innerText = 'No Song Playing';
            document.getElementById('playerTrackArtist').innerText = '-';
            document.getElementById('cardSongTitle').innerText = 'No Track Playing';
            document.getElementById('cardSongArtist').innerText = 'Select a track to play';
            document.body.classList.remove('playing');
            document.getElementById('nowPlayingCard').classList.remove('playing');
            document.getElementById('playIcon').innerHTML = '<path d="M8 5v14l11-7z" />';
            document.getElementById('timeCurrent').innerText = '0:00';
            document.getElementById('timeDuration').innerText = '0:00';
            document.getElementById('progressBarFill').style.width = '0%';
            return;
        }

        // Active layout class
        document.body.classList.add('playing');
        document.getElementById('nowPlayingCard').classList.add('playing');
        
        // Bottom player info
        document.getElementById('playerTrackTitle').innerText = song.song_name;
        document.getElementById('playerTrackArtist').innerText = song.singer;

        // Card info
        document.getElementById('cardSongTitle').innerText = song.song_name;
        document.getElementById('cardSongArtist').innerText = song.singer;
        
        // Generate a random gradient color based on singer/title length for nice custom look
        const hue = (song.song_name.length * 15) % 360;
        document.getElementById('vinylLabelArt').style.backgroundColor = `hsl(${hue}, 70%, 40%)`;

        // Switch Play Icon to Pause
        document.getElementById('playIcon').innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />';

        // Set duration
        const durationFormatted = `${song.minutes}:${song.seconds.toString().padStart(2, '0')}`;
        document.getElementById('timeDuration').innerText = durationFormatted;
    }

    updateProgressBar(currentTime) {
        const duration = this.audioEngine.duration;
        const percent = (currentTime / duration) * 100;
        
        document.getElementById('progressBarFill').style.width = `${percent}%`;
        
        // Current Time label
        const mins = Math.floor(currentTime / 60);
        const secs = Math.floor(currentTime % 60);
        document.getElementById('timeCurrent').innerText = `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Dynamic Equalizer Visualizer Rendering
    startVisualizer() {
        const draw = () => {
            this.animationFrameId = requestAnimationFrame(draw);
            
            const width = this.canvas.width;
            const height = this.canvas.height;
            
            this.canvasCtx.clearRect(0, 0, width, height);

            let dataArray = new Uint8Array(32);
            
            if (this.audioEngine.isPlaying && this.audioEngine.analyser) {
                // Read frequency data
                this.audioEngine.analyser.getByteFrequencyData(dataArray);
            } else {
                // Render a quiet idle pulse visualizer
                const time = Date.now() * 0.004;
                for (let i = 0; i < 32; i++) {
                    dataArray[i] = Math.max(10, 15 + Math.sin(time + i * 0.3) * 10);
                }
            }

            const barWidth = (width / 32) - 2;
            let x = 0;

            for (let i = 0; i < 32; i++) {
                const barHeight = (dataArray[i] / 255) * height * 0.85;
                
                // Color gradient
                const grad = this.canvasCtx.createLinearGradient(0, height, 0, height - barHeight);
                grad.addColorStop(0, 'hsl(141, 73%, 42%)');
                grad.addColorStop(1, 'hsl(190, 80%, 50%)');
                
                this.canvasCtx.fillStyle = grad;
                this.canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight);
                
                x += barWidth + 2;
            }
        };
        draw();
    }
}

// Global App reference
let app;
window.addEventListener('DOMContentLoaded', () => {
    app = new App();
});
