const fetch = require('node-fetch');

async function getInvidiousAudioUrl(videoId) {
  const instancesToTry = [
    'https://invidious.nerdvpn.de',
    'https://inv.tux.pizza',
    'https://invidious.jing.rocks',
    'https://invidious.flokinet.to',
    'https://invidious.privacydev.net'
  ];

  for (const instance of instancesToTry) {
    try {
      console.log(`Trying instance: ${instance}`);
      const res = await fetch(`${instance}/api/v1/videos/${videoId}`);
      if (!res.ok) {
        console.log(`Instance ${instance} returned ${res.status}`);
        continue;
      }
      const data = await res.json();
      console.log(`Success from ${instance}`);
      
      const audioStreams = [
        ...(data.formatStreams || []),
        ...(data.adaptiveFormats || [])
      ].filter((f) => 
        (f.type && f.type.startsWith('audio/')) || 
        f.container === 'm4a' || 
        f.container === 'webm'
      );

      if (audioStreams.length > 0) {
         console.log('Found', audioStreams.length, 'streams');
         return audioStreams[0].url;
      } else {
         console.log('No audio streams found in response');
      }
    } catch (e) {
      console.log(`Instance ${instance} failed: ${e.message}`);
      continue;
    }
  }
  throw new Error("All instances failed");
}

getInvidiousAudioUrl('HrnrqYxYrbk').then(url => console.log('URL:', url)).catch(err => console.error(err));
