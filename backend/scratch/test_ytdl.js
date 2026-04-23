const ytdl = require('@distube/ytdl-core');

async function test() {
  try {
    const videoId = 'GVhmynWOPoM';
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`Testing ytdl-core for: ${videoId}`);
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { filter: 'audioonly', quality: 'highestaudio' });
    console.log('Success! URL:', format.url.substring(0, 50) + '...');
    process.exit(0);
  } catch (e) {
    console.error('Failed:', e.message);
    process.exit(1);
  }
}

test();
