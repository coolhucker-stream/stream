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
  }
};

const nms = new NodeMediaServer(config);

// ????? ?????????? - ????????? ????????? (???? API ??????????)
const DEVELOPMENT_MODE = process.env.DEV_MODE === 'true';
const API_URL = process.env.API_URL || 'http://localhost:5082'; // ?????????? HTTP ????

// ????????? axios ??? ????????????? self-signed ???????????? (?????? ??? ??????????!)
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  }),
  timeout: 5000
});

console.log('==========================================');
console.log('?? RTMP Server Configuration');
console.log('==========================================');
console.log('?? RTMP Port: 1935');
console.log('?? HTTP Port: 8000');
console.log('?? Development Mode:', DEVELOPMENT_MODE ? 'ON (No validation)' : 'OFF (Strict validation)');
console.log('?? API URL:', API_URL);
console.log('??  SSL Verification: Disabled (Development only)');
console.log('==========================================');
console.log('');

nms.on('prePublish', async (id, StreamPath, args) => {
  console.log('');
  console.log('?? [PRE-PUBLISH EVENT] New connection attempt');
  console.log('?? Session ID:', id);
  console.log('?? Stream Path:', StreamPath);
  console.log('?? Arguments:', JSON.stringify(args));
  
  const streamKey = StreamPath.split('/').pop();
  console.log('?? Extracted Stream Key:', streamKey);
  console.log('?? Stream Key Length:', streamKey.length);
  
  if (DEVELOPMENT_MODE) {
    console.log('??  [DEV MODE] Skipping validation - accepting all streams');
    console.log('? [ACCEPT] Stream allowed in development mode');
    return;
  }
  
  try {
    const apiUrl = `${API_URL}/api/streaming/validate?key=${streamKey}`;
    console.log('?? [VALIDATING] Sending POST request to:', apiUrl);
    console.log('?? Request headers:', { 'Content-Type': 'application/json' });
    
    const response = await axiosInstance.post(
      apiUrl,
      {},
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('?? [API RESPONSE]', response.status, JSON.stringify(response.data));
    
    if (!response.data.valid) {
      console.log('? [REJECT] Invalid stream key');
      let session = nms.getSession(id);
      if (session) {
        session.reject();
      }
    } else {
      console.log('? [ACCEPT] Valid stream key');
      console.log('?? Username:', response.data.username);
      console.log('?? Streamer ID:', response.data.streamerId);
    }
  } catch (error) {
    console.error('');
    console.error('? [ERROR] Validation failed!');
    console.error('Error Type:', error.code || error.name);
    console.error('Error Message:', error.message);
    
    if (error.response) {
      console.error('HTTP Status:', error.response.status);
      console.error('Response Headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 400 && error.response.data.errors) {
        console.error('');
        console.error('?? [VALIDATION ERRORS]:');
        for (const [field, messages] of Object.entries(error.response.data.errors)) {
          console.error(`   Field "${field}":`, messages.join(', '));
        }
        console.error('');
        console.error('?? API expects required parameters that are missing');
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.error('??  API Server is not running!');
      console.error('?? Solution: Start your web app with "dotnet run"');
      console.error('?? Or use DEV_MODE=true to skip validation');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('??  API Server timeout - too slow response');
    } else if (error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT' || error.message.includes('certificate')) {
      console.error('??  SSL Certificate error - using self-signed certificate');
      console.error('?? This should be handled automatically, but check API_URL');
    }
    
    let session = nms.getSession(id);
    if (session) {
      session.reject();
    }
  }
});

nms.on('postPublish', async (id, StreamPath, args) => {
  console.log('');
  console.log('?? [POST-PUBLISH] Stream STARTED successfully!');
  const streamKey = StreamPath.split('/').pop();
  console.log('?? Stream Key:', streamKey);
  
  if (DEVELOPMENT_MODE) {
    console.log('??  [DEV MODE] Skipping start notification');
    return;
  }
  
  try {
    const apiUrl = `${API_URL}/api/streaming/start?key=${streamKey}`;
    console.log('?? [NOTIFYING] Sending start notification to:', apiUrl);
    
    const response = await axiosInstance.post(
      apiUrl,
      {},
      {
        timeout: 3000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('? Start notification sent to API');
    console.log('?? Response:', response.status, JSON.stringify(response.data));
  } catch (error) {
    console.error('');
    console.error('??  [WARNING] Start notification failed!');
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('HTTP Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 400 && error.response.data.errors) {
        console.error('');
        console.error('?? [VALIDATION ERRORS]:');
        for (const [field, messages] of Object.entries(error.response.data.errors)) {
          console.error(`   Field "${field}":`, messages.join(', '));
        }
        console.error('?? API validation failed - check required parameters');
      }
    }
    
    console.error('?? Stream will continue anyway (notification is optional)');
    console.error('');
  }
  console.log('');
});

nms.on('donePublish', async (id, StreamPath, args) => {
  console.log('');
  console.log('?? [DONE-PUBLISH] Stream ENDED');
  const streamKey = StreamPath.split('/').pop();
  console.log('?? Stream Key:', streamKey);
  
  if (DEVELOPMENT_MODE) {
    console.log('??  [DEV MODE] Skipping end notification');
    return;
  }
  
  try {
    const apiUrl = `${API_URL}/api/streaming/end?key=${streamKey}`;
    console.log('?? [NOTIFYING] Sending end notification to:', apiUrl);
    
    const response = await axiosInstance.post(
      apiUrl,
      {}, // ?????? ????
      {
        timeout: 3000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('? End notification sent to API');
    console.log('?? Response:', response.status, JSON.stringify(response.data));
  } catch (error) {
    console.error('');
    console.error('??  [WARNING] End notification failed!');
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('HTTP Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 400 && error.response.data.errors) {
        console.error('');
        console.error('?? [VALIDATION ERRORS]:');
        for (const [field, messages] of Object.entries(error.response.data.errors)) {
          console.error(`   Field "${field}":`, messages.join(', '));
        }
        console.error('');
        console.error('?? This is likely a model binding issue in ASP.NET Core');
        console.error('?? The "name" parameter might be marked as [Required]');
      }
    } else if (error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT' || error.message.includes('certificate')) {
      console.error('?? SSL Certificate issue - this is normal in development');
    }
    
    console.error('?? Stream ended anyway (notification is optional)');
    console.error('');
  }
  console.log('');
});

nms.on('error', (error) => {
  console.error('');
  console.error('??? [RTMP SERVER ERROR] ???');
  console.error(error);
  console.error('');
});

nms.on('preConnect', (id, args) => {
  console.log('?? [PRE-CONNECT] Client connecting...', id);
});

nms.on('postConnect', (id, args) => {
  console.log('? [POST-CONNECT] Client connected:', id);
});

nms.on('doneConnect', (id, args) => {
  console.log('?? [DONE-CONNECT] Client disconnected:', id);
});

nms.run();

console.log('');
console.log('==========================================');
console.log('?? RTMP Server is RUNNING!');
console.log('==========================================');
console.log('?? Stream to: rtmp://localhost/live/{YOUR_STREAM_KEY}');
console.log('??  Playback: http://localhost:8000/live/{YOUR_STREAM_KEY}.flv');
console.log('');
console.log('? Ready for OBS streaming!');
console.log('?? Dashboard: https://localhost:7099/Dashboard');
console.log('?? API Test: http://localhost:5082/api/streaming/test');
console.log('');
console.log('?? TIP: If API is not running, start in DEV mode:');
console.log('   Windows: SET DEV_MODE=true && npm start');
console.log('   Linux/Mac: DEV_MODE=true npm start');
console.log('   Or: npm run dev');
console.log('');
console.log('??  NOTE: SSL certificate verification is disabled for development');
console.log('   This allows self-signed certificates to work locally');
console.log('');
console.log('==========================================');
console.log('Waiting for connections...');
console.log('==========================================');
console.log('');
