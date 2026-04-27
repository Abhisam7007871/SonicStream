const ytStream = require('yt-stream');

async function test() {
  try {
    const videoId = 'GVhmynWOPoM';
    console.log(`Testing yt-stream for: ${videoId}`);
    const stream = await ytStream.stream(videoId, { quality: 'high', type: 'audio' });
    console.log('Success! URL:', stream.url.substring(0, 50) + '...');
    process.exit(0);
  } catch (e) {
    console.error('Failed:', e.message);
    process.exit(1);
  }
}

test();
