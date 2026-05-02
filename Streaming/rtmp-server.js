const NodeMediaServer = require('node-media-server');
const axios = require('axios');
const https = require('https');

const config = {
    rtmp: {
        port: 1935,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60
    },
    http: {
        port: 8000,
        mediaroot: './media',
        allow_origin: '*'
    },
    trans: {
        ffmpeg: '/usr/bin/ffmpeg',
        tasks: [
            {
                app: 'live',
                hls: true,
                hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
                hlsKeep: true
            }
        ]
    }
};

const nms = new NodeMediaServer(config);

const API_URL = process.env.API_URL;

const axiosInstance = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false
    }),
    timeout: 5000
});

nms.on('prePublish', async (id, StreamPath, args) => {
    const streamKey = StreamPath.split('/').pop();
    const app = StreamPath.split('/')[1];

    try {
        const apiUrl = `${API_URL}/api/streaming/validate?streamKey=${streamKey}`;

        const response = await axiosInstance.post(
            apiUrl,
            {},
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.data.valid) {
            let session = nms.getSession(id);
            if (session) {
                session.reject();
            }
        }
    } catch (error) {
        let session = nms.getSession(id);
        if (session) {
            session.reject();
        }
    }
});

nms.on('postPublish', async (id, StreamPath, args) => {
    const streamKey = StreamPath.split('/').pop();

    try {
        const apiUrl = `${API_URL}/api/streaming/start?streamKey=${streamKey}`;

        await axiosInstance.post(
            apiUrl,
            {},
            {
                timeout: 3000,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    } catch (error) {
    }
});

nms.on('donePublish', async (id, StreamPath, args) => {
    const streamKey = StreamPath.split('/').pop();

    try {
        const apiUrl = `${API_URL}/api/streaming/end?streamKey=${streamKey}`;

        await axiosInstance.post(
            apiUrl,
            {},
            {
                timeout: 3000,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    } catch (error) {
    }
});

nms.on('error', (error) => {
});

nms.on('preConnect', (id, args) => {
});

nms.on('postConnect', (id, args) => {
});

nms.on('doneConnect', (id, args) => {
});

nms.run();
