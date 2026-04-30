/**
 * Watch Page - Stream Player & Chat
 * Handles HLS (.m3u8) live streaming
 */

// Global configuration
const STREAM_CONFIG = {
    debugLogsEnabled: true,
    debugLogsTimeout: 30000, // 30 seconds
    streamLoadingTimeout: 10000, // 10 seconds
};

// Global state
let player = null; // HLS player
let playerType = null; // 'hls' or 'native'
let debugInterval = null;
window.isLive = false;
window.streamUrl = window.streamUrl || '';

/**
 * Chat functionality
 */
const Chat = {
    messages: null,
    input: null,
    connection: null,
    // ⭐ Original color scheme (diverse colors)
    colors: ['#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA', '#FFAAA5'],

    init() {
        this.messages = document.getElementById('chatMessages');
        this.input = document.getElementById('chatInput');

        if (!this.messages || !this.input) {
            log.warn('Chat elements not found');
            return;
        }

        // Get the shared SignalR connection
        window.getHubConnection().then(connection => {
            this.connection = connection;
        }).catch(err => {
            log.error('Failed to get SignalR connection:', err);
        });

        this.scrollToBottom();
        this.setupEventListeners();
    },

    setupEventListeners() {
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Add click handler for send button
        const sendBtn = document.getElementById('chatSendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.sendMessage();
            });
        }
    },

    scrollToBottom() {
        if (this.messages) {
            this.messages.scrollTop = this.messages.scrollHeight;
        }
    },

    getRandomColor() {
        return this.colors[Math.floor(Math.random() * this.colors.length)];
    },

    sendMessage() {
        if (!this.messages || !this.connection) {
            console.warn('Chat not initialized or not connected');
            return;
        }
        const message = this.input.value.trim();
        if (message) {
            console.log('Sending message:', message); // Debug
            // Send via SignalR
            this.connection.invoke("SendMessage", window.userName || 'Anonymous', message)
                .catch(err => console.error('Send message failed:', err));
            this.input.value = '';
        }
    },

    addMessage(username, text, color) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';

        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'chat-username';
        usernameSpan.style.color = color;
        usernameSpan.textContent = username;

        const textSpan = document.createElement('span');
        textSpan.className = 'chat-text';
        textSpan.textContent = text;

        messageDiv.appendChild(usernameSpan);
        messageDiv.appendChild(textSpan);
        this.messages.appendChild(messageDiv);

        this.scrollToBottom();
    },
};

// Initialize SignalR handlers when connection is ready
window.getHubConnection().then(connection => {
    // Setup watch page specific SignalR handlers
    connection.on("StreamStarted", (streamUrl) => {
        log.info("Received StreamStarted notification:", streamUrl);

        if (!window.isLive) {
            log.info("Stream was offline, now starting player");
            window.isLive = true;
            window.streamUrl = streamUrl;
            initializePlayer();
        } else {
            log.info("Stream already live, updating URL if needed");
            if (window.streamUrl !== streamUrl) {
                window.streamUrl = streamUrl;
            }
        }
    });

    connection.on("StreamUpdated", (data) => {
        log.info("Received StreamUpdated:", data);
        if (data.viewers !== undefined) {
            // Update viewer count in UI
            const viewerElements = document.querySelectorAll('.viewer-stat, .chat-viewer-count');
            viewerElements.forEach(el => {
                el.textContent = `${data.viewers.toLocaleString()} viewers`;
            });
        }
    });

    connection.on("ReceiveMessage", (userName, message) => {
        const color = Chat.getRandomColor();
        Chat.addMessage(userName, message, color);
    });
}).catch(err => {
    log.error("Failed to setup SignalR handlers:", err);
});

/**
 * Logging helper
 */
const log = {
    info: (message, ...args) => {
        if (STREAM_CONFIG.debugLogsEnabled) {
            console.log('🎥', message, ...args);
        }
    },
    success: (message, ...args) => {
        if (STREAM_CONFIG.debugLogsEnabled) {
            console.log('✅', message, ...args);
        }
    },
    error: (message, ...args) => {
        console.error('❌', message, ...args);
    },
    warn: (message, ...args) => {
        console.warn('⚠️', message, ...args);
    },
    debug: (label, data) => {
        if (STREAM_CONFIG.debugLogsEnabled) {
            console.log('📊', label, data);
        }
    }
};

/**
 * Handle flv.js load error
 */
function showPlayerLoadError() {
    const statusElement = document.getElementById('streamStatus');
    const statusMessage = document.getElementById('statusMessage');

    if (statusElement && window.isLive) {
        statusElement.style.display = 'block';
        statusElement.className = 'alert alert-danger mt-2';
        statusMessage.innerHTML =
            '❌ Failed to load video player library (hls.js)<br/>' +
            '<small>' +
            '• Check your internet connection<br/>' +
            '• CDN might be blocked<br/>' +
            '• Try refreshing the page (Ctrl+F5)' +
            '</small>';
    }
}

/**
 * Initialize stream player
 */
function initializePlayer() {
    // Live stream player setup
    if (window.isLive) {
        const statusElement = document.getElementById('streamStatus');
        const statusMessage = document.getElementById('statusMessage');
        const videoElement = document.getElementById('streamPlayer');

        // Show loading status
        if (statusElement) {
            statusElement.style.display = 'block';
            statusElement.className = 'alert alert-info mt-2';
            statusMessage.textContent = '⏳ Connecting to stream...';
        }

        log.info('Initializing player...');
        log.debug('Video element:', videoElement);
        log.debug('Stream URL:', window.streamUrl);

        initializeHlsPlayer(videoElement, statusElement, statusMessage);
    }
}

/**
 * Initialize HLS.js player for .m3u8 streams
 */
function initializeHlsPlayer(videoElement, statusElement, statusMessage) {
    if (typeof Hls === 'undefined') {
        log.error('HLS.js library not loaded');
        if (statusElement) {
            statusElement.className = 'alert alert-danger mt-2';
            statusMessage.innerHTML = '❌ HLS player library failed to load<br/><small>Check your internet connection or try disabling ad-blocker.</small>';
        }
        return;
    }

    if (Hls.isSupported()) {
        log.info('Initializing HLS.js player...');
        playerType = 'hls';
        player = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90
        });

        player.loadSource(window.streamUrl);
        player.attachMedia(videoElement);

        player.on(Hls.Events.MANIFEST_PARSED, function () {
            log.success('HLS manifest loaded successfully');
            if (statusElement) {
                statusElement.className = 'alert alert-success mt-2';
                statusMessage.textContent = '✅ Stream connected! Loading video...';
            }

            // Try autoplay
            videoElement.play().then(() => {
                log.success('Autoplay started');
                setTimeout(() => {
                    if (statusElement) {
                        statusElement.style.display = 'none';
                    }
                }, 2000);
            }).catch(err => {
                log.warn('Autoplay failed (user interaction required):', err);
                if (statusElement) {
                    statusElement.className = 'alert alert-warning mt-2';
                    statusMessage.innerHTML = '▶️ Click play to start the stream<br/><small>Your browser requires user interaction to play video.</small>';
                }
            });
        });

        player.on(Hls.Events.ERROR, function (event, data) {
            log.error('════════════ HLS Player Error ════════════');
            log.error('Error type:', data.type);
            log.error('Error details:', data.details);
            log.error('Fatal:', data.fatal);
            log.error('════════════════════════════════════════');

            if (data.fatal) {
                if (statusElement) {
                    statusElement.style.display = 'block';
                    statusElement.className = 'alert alert-danger mt-2';

                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            statusMessage.innerHTML = '❌ Network error - cannot load stream<br/><small>The streamer might not be broadcasting.</small>';
                            // Try to recover
                            player.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            statusMessage.innerHTML = '❌ Media error - stream format issue<br/><small>Attempting to recover...</small>';
                            player.recoverMediaError();
                            break;
                        default:
                            statusMessage.innerHTML = '❌ Fatal error occurred<br/><small>Cannot play stream. Try refreshing the page.</small>';
                            player.destroy();
                            break;
                    }
                }
            }
        });

        // Setup cleanup
        setupCleanup(player);

        log.success('HLS player initialized');
    }
    // Native HLS support (Safari, iOS)
    else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        log.info('Using native HLS support (Safari/iOS)');
        playerType = 'native';
        videoElement.src = window.streamUrl;

        videoElement.addEventListener('loadedmetadata', function () {
            log.success('Stream metadata loaded');
            if (statusElement) {
                statusElement.className = 'alert alert-success mt-2';
                statusMessage.textContent = '✅ Stream connected!';
            }
        });

        videoElement.addEventListener('error', function () {
            log.error('Native player error');
            if (statusElement) {
                statusElement.className = 'alert alert-danger mt-2';
                statusMessage.innerHTML = '❌ Cannot play stream<br/><small>The streamer might not be broadcasting.</small>';
            }
        });

        videoElement.play().catch(err => {
            log.warn('Autoplay failed:', err);
        });
    }
    else {
        log.error('HLS not supported in this browser');
        if (statusElement) {
            statusElement.className = 'alert alert-danger mt-2';
            statusMessage.innerHTML = '❌ Your browser does not support HLS streaming<br/><small>Please try Chrome, Firefox, Safari, or Edge.</small>';
        }
    }
}

/**
// FLV support removed - project uses HLS only

// FLV support removed - no FLV event handlers

/**
 * Attempt autoplay
 */
function attemptAutoplay(player, statusElement, statusMessage) {
    // Additional safety check - make sure player is valid
    if (!player || typeof player.play !== 'function') {
        log.error('Cannot autoplay - player.play is not a function');
        log.error('Player object:', player);

        if (statusElement) {
            statusElement.style.display = 'block';
            statusElement.className = 'alert alert-danger mt-2';
            statusMessage.innerHTML =
                '❌ Player initialization failed<br/>' +
                '<small>Try refreshing the page (Ctrl+F5)</small>';
        }
        return;
    }

    try {
        const playPromise = player.play();

        if (playPromise && typeof playPromise.then === 'function') {
            playPromise.then(() => {
                log.success('Stream started playing automatically');
                if (statusElement) {
                    setTimeout(() => {
                        statusElement.style.display = 'none';
                    }, 2000);
                }
            }).catch(error => {
                log.warn('Autoplay failed:', error);
                if (statusElement) {
                    statusElement.style.display = 'block';
                    statusElement.className = 'alert alert-warning mt-2';
                    statusMessage.innerHTML =
                        '▶️ Click the play button to start watching<br/>' +
                        '<small>Browser autoplay policy prevented automatic start</small>';
                }
            });
        } else {
            log.warn('play() did not return a promise');
        }
    } catch (error) {
        log.error('Error calling player.play():', error);
        log.error('Error stack:', error.stack);

        if (statusElement) {
            statusElement.style.display = 'block';
            statusElement.className = 'alert alert-danger mt-2';
            statusMessage.innerHTML =
                '❌ Failed to start playback<br/>' +
                '<small>Error: ' + (error && error.message ? error.message : error) + '. Try clicking play button manually.</small>';
        }
    }
}

/**
 * Setup stream timeout detection
 */
function setupStreamTimeout(videoElement, statusElement, statusMessage) {
    setTimeout(() => {
        if (videoElement.readyState === 0) {
            log.error('Stream loading timeout - readyState is still 0');
            if (statusElement) {
                statusElement.style.display = 'block';
                statusElement.className = 'alert alert-danger mt-2';
                statusMessage.innerHTML =
                    '❌ Stream loading timeout<br/>' +
                    '<small>' +
                    '• Is RTMP server running? (<code>npm start</code>)<br/>' +
                    '• Is OBS streaming to the correct key?<br/>' +
                    '• Check URL: <code>' + window.streamUrl + '</code>' +
                    '</small>';
            }
        }
    }, STREAM_CONFIG.streamLoadingTimeout);
}

/**
 * Setup cleanup on page unload
 */
function setupCleanup(player) {
    window.addEventListener('beforeunload', () => {
        log.info('Cleaning up player...');
        try {
            if (playerType === 'hls' && player && player.destroy) {
                player.destroy();
            } else if (playerType === 'flv' && player) {
                player.pause();
                player.unload();
                player.detachMediaElement();
                player.destroy();
            }
        } catch (e) {
            log.error('Error during cleanup:', e);
        }
    });
}

/**
 * Setup debug logging
 */
function setupDebugLogging(videoElement) {
    debugInterval = setInterval(() => {
        log.debug('Player State:', {
            readyState: videoElement.readyState,
            paused: videoElement.paused,
            currentTime: videoElement.currentTime,
            buffered: videoElement.buffered.length > 0 ?
                videoElement.buffered.end(0) : 0
        });
    }, 1000);

    // Clear debug interval after timeout
    setTimeout(() => {
        if (debugInterval) {
            clearInterval(debugInterval);
            log.info('Debug logging stopped');
        }
    }, STREAM_CONFIG.debugLogsTimeout);
}

/**
 * Initialize everything when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    // Log debug info
    console.log('═══════════════════════════════════════════');
    console.log('🎥 Watch Page Debug Info');
    console.log('═══════════════════════════════════════════');
    console.log('IsLive:', window.isLive, '(type:', typeof window.isLive + ')');
    console.log('Stream URL:', window.streamUrl);
    console.log('HLS.js loaded:', typeof Hls !== 'undefined');

    // ⭐ НОВОЕ: Детальная диагностика IsLive
    if (window.isLive === false || window.isLive === 'false') {
        console.warn('⚠️ IsLive is FALSE!');
        console.warn('This means:');
        console.warn('  1. Streamer.IsLive = false on server');
        console.warn('  2. Or stream is not active in StreamerService');
        console.warn('');
        console.warn('🔍 To fix:');
        console.warn('  1. Make sure RTMP server is running (npm start)');
        console.warn('  2. Make sure OBS is streaming');
        console.warn('  3. Check RTMP server logs for [POST-PUBLISH]');
        console.warn('  4. Check API endpoint: http://localhost:5082/api/streaming/start');
        console.warn('  5. Verify Stream Key is correct');
        console.warn('═══════════════════════════════════════════');
    } else {
        console.log('✅ IsLive is TRUE - will use HLS player');
    }

    console.log('HLS.js support:', typeof Hls !== 'undefined' && Hls.isSupported ? Hls.isSupported() : false);

    console.log('═══════════════════════════════════════════');

    // Wait a short time for HLS.js to initialize (if needed)
    const initDelay = window.isLive ? 300 : 100; // 300ms for live streams
    console.log(`⏳ Waiting ${initDelay}ms for player libraries to initialize...`);

    setTimeout(() => {
        // Final check before initializing
        if (window.isLive && typeof Hls === 'undefined') {
            console.error('❌ HLS.js is undefined after waiting!');
            showPlayerLoadError();
            return;
        }

        initializePlayer();
        Chat.init();
        console.log('✅ Initialization complete');
    }, initDelay);
});

/**
 * Export for use in inline scripts if needed
 */
window.WatchPage = {
    initializePlayer,
    // legacy handler removed
    sendChatMessage: () => Chat.sendMessage()
};
