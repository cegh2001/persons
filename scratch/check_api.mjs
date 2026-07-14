import http from 'http';

http.get('http://localhost:3000/api/stats', (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    try {
      const stats = JSON.parse(data);
      console.log("API active! Sector list from API:");
      console.log(stats.byLocation.map(l => l.location));
    } catch (e) {
      console.log("API returned invalid JSON:", data);
    }
  });
}).on('error', (err) => {
  console.log("API not running on port 3000:", err.message);
});
