const http = require('http');

function testLogin() {
  const postData = JSON.stringify({
    username: 'papa_garcia',
    password: 'member'
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('=== TEST ENDPOINT LOGIN ===');
  console.log('URL:', `http://${options.hostname}:${options.port}${options.path}`);
  console.log('Method:', options.method);
  console.log('Headers:', options.headers);
  console.log('Body:', postData);

  const req = http.request(options, (res) => {
    console.log('\n=== RESPUESTA ===');
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('Response Body:', data);
      try {
        const jsonResponse = JSON.parse(data);
        console.log('Parsed Response:', JSON.stringify(jsonResponse, null, 2));
      } catch (e) {
        console.log('No se pudo parsear como JSON');
      }
    });
  });

  req.on('error', (e) => {
    console.error('Error en la petición:', e.message);
  });

  req.write(postData);
  req.end();
}

testLogin();