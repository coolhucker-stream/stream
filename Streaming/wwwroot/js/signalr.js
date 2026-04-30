window.SignalR = {
    connection: null,

    init() {
        if (!this.connection) {
            this.connection = new signalR.HubConnectionBuilder()
                .withUrl("/streamHub")
                .withAutomaticReconnect()
                .build();

            this.connection.start()
                .then(() => {
                    this.connection.on("StreamEnded", () => {
                        window.Player.stop();
                    });

                    this.connection.on("ViewerCountChanged", function (count) {
                        const viewerElements = document.querySelectorAll('.player-viewer-stat, .chat-viewer-count');
                        viewerElements.forEach(element => {
                            element.textContent = count + ' online'
                        });
                    });

                    this.connection.on("StreamStarted", (streamUrl) => {
                        window.Player.start(streamUrl);
                    });

                    this.connection.on("ReceiveMessage", (userName, message) => {
                        window.Chat.addMessage(userName, message);
                    });
                })
                .catch(err => {
                    console.error("SignalR Connection Error: ", err);
                    this.connection = null;
                    throw err;
                });
        }
    }
};