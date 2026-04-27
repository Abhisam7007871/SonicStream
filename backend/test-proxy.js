const fetch = require('node-fetch');

async function test() {
  const videoId = 'HrnrqYxYrbk';
  const url = `http://127.0.0.1:4000/api/youtube/stream?id=${videoId}`;
  
  try {
    console.log('Fetching', url);
    const res = await fetch(url, { redirect: 'manual' });
    console.log('Status:', res.status);
    console.log('Location:', res.headers.get('location'));
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
