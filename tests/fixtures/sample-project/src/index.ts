// Sample source file with various issues for testing

const API_KEY = 'sk-test1234567890abcdef';

async function fetchData() {
  try {
    const response = await fetch('http://localhost:3000/api');
    return response.json();
  } catch (e) {
    console.log(e);
  }
}

const config = {
  port: 8080,
  host: '192.168.1.1',
};

export { fetchData, config };
