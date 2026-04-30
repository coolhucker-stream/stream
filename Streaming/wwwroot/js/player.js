window.Player = {

    player: null,

    stop() {
        this.onStoped();
    },

    onStoped() {
        const offlineStatus = document.getElementById('offlineStatus');
        offlineStatus.style.display = 'block';
        const onlineStatus = document.getElementById('onlineStatus');
        onlineStatus.style.display = 'none';
        const playerElement = document.getElementById('streamPlayer');
        playerElement.style.display = 'none';

        this.displaySuccess('❌ Stream stopped!');
    },

    start(streamUrl) {
        const playerElement = document.getElementById('streamPlayer');

        this.player.loadSource(streamUrl);
        this.player.attachMedia(playerElement);
    },

    play() {
        const playerElement = document.getElementById('streamPlayer');
        playerElement.play().then(() => { }).catch(err => {
            this.displayError('▶️ Click play to start the stream<br/><small>Your browser requires user interaction to play video.</small>');
        });
    },

    onStarted() {
        const offlineStatus = document.getElementById('offlineStatus');
        offlineStatus.style.display = 'none';
        const onlineStatus = document.getElementById('onlineStatus');
        onlineStatus.style.display = 'block';
        const playerElement = document.getElementById('streamPlayer');
        playerElement.style.display = 'block';

        this.displaySuccess('✅ Stream connected! Loading video...');

    },

    displaySuccess(success) {
        console.log(error);

        const statusElement = document.getElementById('streamStatus');
        const statusMessage = document.getElementById('statusMessage');

        statusElement.style.display = 'block';
        statusElement.className = 'alert alert-success mt-2';
        statusMessage.innerHTML = error;

        setTimeout(() => {
            statusElement.style.display = 'none';
            statusMessage.textContent = '';
        }, 2000);
    },

    displayError(error) {
        console.error(error);

        const statusElement = document.getElementById('streamStatus');
        const statusMessage = document.getElementById('statusMessage');

        statusElement.style.display = 'block';
        statusElement.className = 'alert alert-danger mt-2';
        statusMessage.innerHTML = error;

        setTimeout(() => {
            statusElement.style.display = 'none';
            statusMessage.textContent = '';
        }, 5000);
    },

    init(streamUrl) {
        const playerElement = document.getElementById('streamPlayer');

        if (typeof Hls === 'undefined') {
            this.displayError('❌ HLS player library failed to load<br/><small>Check your internet connection or try disabling ad-blocker.</small>')
            return;
        }

        if (!Hls.isSupported()) {
            this.displayError('❌ Your browser does not support HLS streaming<br/><small>Please try Chrome, Firefox, Safari, or Edge.</small>')
            return;
        }

        this.player = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90
        });

        this.start(streamUrl);

        this.player.on(Hls.Events.MANIFEST_PARSED, () => {

            this.onStarted();
            this.play();
        });

        this.player.on(Hls.Events.ERROR, (event, data) => {
            console.log('════════════ HLS Player Error ════════════');
            console.log('Error type:', data.type);
            console.log('Error details:', data.details);
            console.log('Fatal:', data.fatal);
            console.log('════════════════════════════════════════');

            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        this.displayError('❌ Network error - cannot load stream<br/><small>The streamer might not be broadcasting.</small>')
                        this.player.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        this.displayError('❌ Media error - stream format issue<br/><small>Attempting to recover...</small>')
                        this.player.recoverMediaError();
                        break;
                    default:
                        this.displayError('❌ Fatal error occurred<br/><small>Cannot play stream. Try refreshing the page.</small>')
                        this.player.destroy();
                        break;
                }
            }
        });

        window.addEventListener('beforeunload', () => {
            console.log('Cleaning up player...');
            try {
                if (this.player && this.player.destroy) {
                    this.player.destroy();
                }
            } catch (e) {
                console.log('Error during cleanup:', e);
            }
        });
    }
};