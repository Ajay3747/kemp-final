const testLogin = async () => {
  try {
    console.log('Testing Staff Login...');
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'test',
        password: 'test',
        userType: 'staff'
      })
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
  } catch (error) {
    console.log('✗ Error:', error.message);
  }
};

testLogin();
