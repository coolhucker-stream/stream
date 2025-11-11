/**
 * Watch Page - Stream Player & Chat
 * Handles FLV.js live streaming and chat functionality
 */

// Global configuration
const STREAM_CONFIG = {
    debugLogsEnabled: true,
    debugLogsTimeout: 30000, // 30 seconds
    streamLoadingTimeout: 10000, // 10 seconds
};

// Global state
let flvPlayer = null;
let flvJsLoadFailed = false;
let debugInterval = null;

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
                // TODO: Handle URL change if player is running
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
function handleFlvJsLoadError() {
    flvJsLoadFailed = true;
    log.error('Failed to load flv.js from CDN');
    showFlvJsLoadError();
}

/**
 * Show flv.js load error message
 */
function showFlvJsLoadError() {
    const statusElement = document.getElementById('streamStatus');
    const statusMessage = document.getElementById('statusMessage');
    
    if (statusElement && window.isLive) {
        statusElement.style.display = 'block';
        statusElement.className = 'alert alert-danger mt-2';
        statusMessage.innerHTML = 
            '❌ Failed to load video player library (flv.js)<br/>' +
            '<small>' +
            '• Check your internet connection<br/>' +
            '• CDN (cdn.jsdelivr.net) might be blocked<br/>' +
            '• Try refreshing the page (Ctrl+F5)<br/>' +
            '• Or use a VPN if CDN is blocked in your region' +
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

        // Check if flv.js loaded
        if (typeof flvjs === 'undefined' || flvJsLoadFailed) {
            log.error('Cannot initialize player - flvjs not loaded');
            showFlvJsLoadError();
            return;
        }

        // Check browser support
        if (!flvjs.isSupported()) {
            log.error('FLV.js is not supported in this browser');
            
            if (statusElement) {
                statusElement.style.display = 'block';
                statusElement.className = 'alert alert-danger mt-2';
                statusMessage.innerHTML = 
                    '❌ Your browser does not support live streaming<br/>' +
                    '<small>Please try Chrome, Firefox, or Edge browser.</small>';
            }
            return;
        }

        const videoElement = document.getElementById('streamPlayer');
        
        // Show loading status
        if (statusElement) {
            statusElement.style.display = 'block';
            statusElement.className = 'alert alert-info mt-2';
            statusMessage.textContent = '⏳ Connecting to stream...';
        }
        
        log.info('Initializing FLV player...');
        log.debug('Video element:', videoElement);
        log.debug('Stream URL:', window.streamUrl);
        
        // Check if Web Workers are supported (but we'll disable them anyway for stability)
        const workerSupported = typeof Worker !== 'undefined';
        log.debug('Web Worker supported:', workerSupported);
        
        try {
            // Create player configuration
            const mediaDataSource = {
                type: 'flv',
                url: window.streamUrl,
                isLive: true,
                hasAudio: true,
                hasVideo: true
            };
            
            const config = {
                enableWorker: false, // ⭐ Disabled to prevent "Class extends value undefined" error
                enableStashBuffer: false, // Reduce latency for live streams
                stashInitialSize: 128,
                autoCleanupSourceBuffer: true,
                lazyLoad: false,
                lazyLoadMaxDuration: 0,
                // Additional config for better compatibility
                fixAudioTimestampGap: false,
                accurateSeek: false
            };
            
            log.debug('Player config:', config);
            
            flvPlayer = flvjs.createPlayer(mediaDataSource, config);

            flvPlayer.attachMediaElement(videoElement);
            log.success('Player attached to video element');
            
            // Setup event handlers
            setupPlayerEvents(flvPlayer, statusElement, statusMessage);
            
            log.info('Loading stream...');
            flvPlayer.load();
            
            // Try autoplay
            attemptAutoplay(flvPlayer, statusElement, statusMessage);
            
            // Setup timeout detection
            setupStreamTimeout(videoElement, statusElement, statusMessage);
            
            // Setup cleanup
            setupCleanup(flvPlayer);
            
            // Setup debug logging
            if (STREAM_CONFIG.debugLogsEnabled) {
                setupDebugLogging(videoElement);
            }

        } catch (error) {
            log.error('Failed to initialize player:', error);
            log.error('Stack trace:', error.stack);
            
            // Check if it's the "Class extends value undefined" error from flv.js Worker
            if (error.message && error.message.includes('Class extends')) {
                log.error('═══════════════════════════════════════════');
                log.error('🔧 WORKER ERROR DETECTED');
                log.error('This is a known issue with flv.js Web Workers');
                log.error('Workaround: enableWorker is now set to false');
                log.error('═══════════════════════════════════════════');
                
                if (statusElement) {
                    statusElement.style.display = 'block';
                    statusElement.className = 'alert alert-danger mt-2';
                    statusMessage.innerHTML = 
                        '❌ FLV player initialization error<br/>' +
                        '<small>' +
                        'There was a compatibility issue with the video player.<br/>' +
                        'Try refreshing the page (Ctrl+F5).<br/>' +
                        'If the problem persists, try a different browser (Chrome or Firefox recommended).' +
                        '</small>';
                }
            } else {
                // Generic error handling
                if (statusElement) {
                    statusElement.style.display = 'block';
                    statusElement.className = 'alert alert-danger mt-2';
                    statusMessage.innerHTML = 
                        '❌ Failed to load stream player<br/>' +
                        '<small>' +
                        'Error: ' + error.message + '<br/>' +
                        'Please refresh the page and check console (F12)' +
                        '</small>';
                }
            }
        }
    } else {
        log.info('Not a live stream - using standard HTML5 video player');
    }
}

/**
 * Setup player event handlers
 */
function setupPlayerEvents(player, statusElement, statusMessage) {
    // Loading complete
    player.on(flvjs.Events.LOADING_COMPLETE, () => {
        log.success('Stream loading complete');
    });

    // Media info received
    player.on(flvjs.Events.MEDIA_INFO, (mediaInfo) => {
        log.debug('Media Info:', mediaInfo);
        if (statusElement) {
            statusElement.className = 'alert alert-success mt-2';
            statusMessage.textContent = '✅ Stream connected! Loading video...';
        }
    });

    // Statistics
    player.on(flvjs.Events.STATISTICS_INFO, (stats) => {
        log.debug('Statistics:', stats);
    });

    // Error handling
    player.on(flvjs.Events.ERROR, (errorType, errorDetail, errorInfo) => {
        log.error('════════════ FLV Player Error ════════════');
        log.error('Error Type:', errorType);
        log.error('Error Detail:', errorDetail);
        log.error('Error Info:', errorInfo);
        log.error('════════════════════════════════════════');
        
        if (statusElement) {
            statusElement.style.display = 'block';
            statusElement.className = 'alert alert-danger mt-2';
            
            // Detailed error messages
            if (errorType === flvjs.ErrorTypes.NETWORK_ERROR) {
                if (errorDetail === flvjs.ErrorDetails.NETWORK_STATUS_CODE_INVALID) {
                    statusMessage.innerHTML = 
                        '❌ Stream not available (HTTP error).<br/>' +
                        '<small>The streamer might not be broadcasting. Check RTMP server logs.</small>';
                } else {
                    statusMessage.innerHTML = 
                        '❌ Network error occurred.<br/>' +
                        '<small>Cannot connect to: <code>' + window.streamUrl + '</code></small>';
                }
            } else if (errorType === flvjs.ErrorTypes.MEDIA_ERROR) {
                statusMessage.innerHTML = 
                    '❌ Media error.<br/>' +
                    '<small>The stream format might be incompatible.</small>';
            } else {
                statusMessage.innerHTML = 
                    '❌ Stream error: ' + errorType + '<br/>' +
                    '<small>Check browser console (F12) for details.</small>';
            }
        }
    });
}

/**
 * Attempt autoplay
 */
function attemptAutoplay(player, statusElement, statusMessage) {
    // Additional safety check - make sure player is valid
    if (!player || typeof player.play !== 'function') {
        log.error('Cannot autoplay - player.play is not a function');
        log.error('Player object:', player);
        log.error('typeof flvjs:', typeof flvjs);
        
        if (statusElement) {
            statusElement.style.display = 'block';
            statusElement.className = 'alert alert-danger mt-2';
            statusMessage.innerHTML = 
                '❌ Player initialization failed<br/>' +
                '<small>flv.js library might not be loaded correctly. Try refreshing (Ctrl+F5)</small>';
        }
        return;
    }

    try {
        const playPromise = player.play();
        
        // Some browsers don't return a promise from play()
        if (playPromise !== undefined && playPromise !== null) {
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
                '<small>Error: ' + error.message + '. Try clicking play button manually.</small>';
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
            player.pause();
            player.unload();
            player.detachMediaElement();
            player.destroy();
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
    console.log('flvjs object:', typeof flvjs);
    console.log('flvjs loaded:', typeof flvjs !== 'undefined');
    
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
        console.log('✅ IsLive is TRUE - will use FLV player');
    }
    
    if (typeof flvjs !== 'undefined') {
        console.log('flvjs.isSupported():', flvjs.isSupported());
        console.log('flvjs.version:', flvjs.version);
    } else {
        console.error('❌ flvjs is undefined - library failed to load!');
        if (!flvJsLoadFailed) {
            flvJsLoadFailed = true;
            showFlvJsLoadError();
        }
    }
    
    console.log('═══════════════════════════════════════════');
    
    // Wait longer for flv.js to fully initialize
    // Some browsers need more time to load and parse the library
    const initDelay = window.isLive ? 300 : 100; // 300ms for live streams
    
    console.log(`⏳ Waiting ${initDelay}ms for flv.js to initialize...`);
    
    setTimeout(() => {
        // Final check before initializing
        if (window.isLive && typeof flvjs === 'undefined') {
            console.error('❌ flvjs STILL undefined after waiting!');
            console.error('This usually means:');
            console.error('  1. CDN (cdn.jsdelivr.net) is blocked or slow');
            console.error('  2. No internet connection');
            console.error('  3. Browser extensions blocking the script');
            console.error('');
            console.error('🔧 Solutions:');
            console.error('  1. Check browser console (F12) Network tab');
            console.error('  2. Try refreshing with Ctrl+F5');
            console.error('  3. Disable browser extensions temporarily');
            console.error('  4. Use a VPN if CDN is blocked');
            
            showFlvJsLoadError();
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
    handleFlvJsLoadError,
    sendChatMessage: () => Chat.sendMessage()
};
