const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/admin/users',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('\n=== API RESPONSE ===');
      console.log(`Total users: ${json.length}`);
      
      if (json.length > 0) {
        const user = json[0];
        console.log(`\nUser 1: ${user.username}`);
        console.log(`Has idCardUrl: ${!!user.idCardUrl}`);
        console.log(`IdCardUrl length: ${user.idCardUrl ? user.idCardUrl.length : 0}`);
        console.log(`First 100 chars: ${user.idCardUrl ? user.idCardUrl.substring(0, 100) : 'NONE'}`);
        
        // Check if it's base64
        if (user.idCardUrl && user.idCardUrl.startsWith('data:')) {
          console.log('✓ SUCCESS: Image is base64 encoded!');
        } else {
          console.log('✗ FAILED: Image is NOT base64');
        }
      }
    } catch (e) {
      console.error('Parse error:', e.message);
      console.log('Response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();
