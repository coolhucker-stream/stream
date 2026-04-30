document.addEventListener('DOMContentLoaded', function () {
    setTimeout(() => {
        window.Chat.init();
        window.SignalR.init();
        window.Player.init(window.streamUrl);
    }, 300);
});