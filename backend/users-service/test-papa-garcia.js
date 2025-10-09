async function testPapaGarciaLogin() {
    try {
        console.log('🔍 Probando login de papa_garcia...');
        
        const response = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'papa_garcia',
                password: 'member'
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Login exitoso para papa_garcia');
            console.log('Status:', response.status);
            console.log('Respuesta:', JSON.stringify(data, null, 2));
            
            if (data.user) {
                console.log(`👤 Usuario: ${data.user.username}`);
                console.log(`📧 Email: ${data.user.email}`);
                console.log(`🏠 Rol: ${data.user.role}`);
                console.log(`👨‍👩‍👧‍👦 Nombre: ${data.user.firstName} ${data.user.lastName}`);
            }
        } else {
            console.log('❌ Error en login de papa_garcia');
            console.log('Status:', response.status);
            console.log('Error:', data);
        }

    } catch (error) {
        console.log('❌ Error en login de papa_garcia');
        console.log('Error:', error.message);
    }
}

testPapaGarciaLogin();