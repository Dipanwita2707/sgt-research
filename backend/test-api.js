// Test the user search API endpoint
const fetch = require('node-fetch');

async function testUserSearchAPI() {
  try {
    console.log('Testing API endpoint: /api/v1/users/search/STU123456789');
    
    // Make request without authentication first to see the error
    const response = await fetch('http://localhost:5000/api/v1/users/search/STU123456789', {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    const data = await response.text();
    console.log('Response body:', data);
    
  } catch (error) {
    console.error('Error testing API:', error.message);
  }
}

testUserSearchAPI();