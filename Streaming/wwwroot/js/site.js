// Please see documentation at https://learn.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Write your JavaScript code.

// StreamHub - Main JavaScript

// Shared SignalR connection state
const SignalR = {
    connection: null,
    connectionPromise: null,

    getConnection() {
        if (!this.connection) {
            this.connection = new signalR.HubConnectionBuilder()
                .withUrl("/streamHub")
                .withAutomaticReconnect()
                .build();

            // Store the connection promise to avoid multiple start attempts
            this.connectionPromise = this.connection.start()
                .then(() => {
                    console.log("SignalR Connected!");
                    return this.connection;
                })
                .catch(err => {
                    console.error("SignalR Connection Error: ", err);
                    this.connection = null;
                    this.connectionPromise = null;
                    throw err;
                });
        }

        return this.connectionPromise;
    }
};

// Global window property for other scripts
window.hubConnection = SignalR.connection;
window.getHubConnection = () => SignalR.getConnection();

// Write your JavaScript code.
document.addEventListener('DOMContentLoaded', function() {
    // Initialize SignalR connection
    SignalR.getConnection().then(connection => {
        // SignalR event handlers for main layout
        connection.on("StreamEnded", () => {
            console.log("Received StreamEnded notification");
            window.isLive = false;
            // Update UI to show OFFLINE
            const liveStatus = document.getElementById('liveStatus');
            if (liveStatus) {
                liveStatus.innerHTML = 'OFFLINE';
                liveStatus.className = 'badge bg-secondary';
            }
        });

        connection.on("UserLoggedIn", (data) => {
            console.log("Received UserLoggedIn:", data);
            // Update UI
            document.getElementById('user-info').style.display = 'block';
            const userName = data.firstName || data.username || 'User';
            document.getElementById('user-display-name').textContent = userName;
            window.userName = userName; // Update for chat
            document.getElementById('telegram-login').style.display = 'none';
        });

        connection.on("UserLoggedOut", () => {
            console.log("Received UserLoggedOut");
            // Update UI
            document.getElementById('user-info').style.display = 'none';
            document.getElementById('telegram-login').style.display = 'block';
            window.userName = null;
        });
    }).catch(err => {
        console.error("Error setting up SignalR handlers:", err);
    });

    // Add smooth animations to stream cards
    const streamCards = document.querySelectorAll('.stream-card');
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '0';
                entry.target.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    entry.target.style.transition = 'all 0.5s ease-out';
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, 100);
                
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    streamCards.forEach(card => {
        observer.observe(card);
    });
    
    // Update viewer counts with animation
    updateViewerCounts();
    setInterval(updateViewerCounts, 10000); // Update every 10 seconds

    // Check if user is authenticated
    fetch('/api/streaming/auth/status')
        .then(response => response.json())
        .then(data => {
            if (data.isAuthenticated) {
                document.getElementById('user-info').style.display = 'block';
                const userName = data.firstName || data.username || 'User';
                document.getElementById('user-display-name').textContent = userName;
                window.userName = userName;
            } else {
                document.getElementById('telegram-login').style.display = 'block';
            }
        })
        .catch(() => {
            document.getElementById('telegram-login').style.display = 'block';
        });
});

// Simulate viewer count changes
function updateViewerCounts() {
    const viewerElements = document.querySelectorAll('.viewer-count, .viewer-stat');
    
    viewerElements.forEach(element => {
        const currentText = element.textContent;
        const match = currentText.match(/[\d,]+/);
        
        if (match) {
            let currentCount = parseInt(match[0].replace(/,/g, ''));
            const change = 0;//Math.floor(Math.random() * 200) - 50; // Random change -50 to +150
            const newCount = Math.max(0, currentCount + change);
            
            // Animate the change
            animateValue(element, currentCount, newCount, 1000);
        }
    });
}

// Animate number changes
function animateValue(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    const isViewerStat = element.classList.contains('viewer-stat');
    
    const timer = setInterval(() => {
        current += increment;
        
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        
        const formattedNumber = Math.floor(current).toLocaleString();
        
        if (isViewerStat) {
            // Keep the SVG icon
            const svg = element.querySelector('svg');
            element.textContent = formattedNumber + ' viewers';
            if (svg) {
                element.insertBefore(svg, element.firstChild);
            }
        } else {
            // Keep the SVG icon for viewer-count
            const svg = element.querySelector('svg');
            element.textContent = formattedNumber;
            if (svg) {
                element.insertBefore(svg, element.firstChild);
            }
        }
    }, 16);
}

// Add loading state to buttons
document.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', function() {
        if (!this.classList.contains('no-loading')) {
            this.style.opacity = '0.7';
            this.style.pointerEvents = 'none';
            
            setTimeout(() => {
                this.style.opacity = '1';
                this.style.pointerEvents = 'auto';
            }, 500);
        }
    });
});

// Add hover sound effect (optional)
function playHoverSound() {
    // You can add sound effects here if needed
    // const audio = new Audio('/sounds/hover.mp3');
    // audio.volume = 0.2;
    // audio.play();
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Press 'F' for fullscreen on video pages
    if (e.key === 'f' || e.key === 'F') {
        const video = document.querySelector('video');
        if (video && document.activeElement.tagName !== 'INPUT') {
            if (!document.fullscreenElement) {
                video.requestFullscreen().catch(err => {
                    console.log('Fullscreen error:', err);
                });
            } else {
                document.exitFullscreen();
            }
        }
    }
    
    // Press 'Space' to play/pause video
    if (e.code === 'Space') {
        const video = document.querySelector('video');
        if (video && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            if (video.paused) {
                video.play();
            } else {
                video.pause();
            }
        }
    }
});

// Add ripple effect to cards
document.querySelectorAll('.stream-card, .category-card').forEach(card => {
    card.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');
        
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        
        this.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
});

// Add CSS for ripple effect
const style = document.createElement('style');
style.textContent = `
    .stream-card, .category-card {
        position: relative;
        overflow: hidden;
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: rippleAnimation 0.6s ease-out;
        pointer-events: none;
    }
    
    @keyframes rippleAnimation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Console welcome message
console.log('%c🎥 Welcome to StreamHub! ', 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 20px; padding: 10px 20px; border-radius: 8px;');
console.log('%cEnjoy watching live streams!', 'color: #9147ff; font-size: 14px;');