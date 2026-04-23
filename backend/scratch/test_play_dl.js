const play = require('play-dl');

async function test() {
  try {
    const videoId = 'GVhmynWOPoM';
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`Testing play-dl for: ${videoId}`);
    const source = await play.stream(url, { quality: 1 });
    console.log('Success! URL:', source.url.substring(0, 50) + '...');
    process.exit(0);
  } catch (e) {
    console.error('Failed:', e.message);
    process.exit(1);
  }
}

test();
