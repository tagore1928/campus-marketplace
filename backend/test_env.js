const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
console.log('Value exists:', !!serviceAccountJson);
if (serviceAccountJson) {
  console.log('Starts with {:', serviceAccountJson.trim().startsWith('{'));
  try {
    const parsed = JSON.parse(serviceAccountJson);
    console.log('Parsed successfully! Project ID:', parsed.project_id);
  } catch (e) {
    console.error('Failed to parse JSON:', e.message);
  }
}
