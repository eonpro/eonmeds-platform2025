// This will help verify what password format works
const password = process.env.DB_PASSWORD;
console.log('Password length:', password ? password.length : 0);
console.log('First 5 chars:', password ? password.substring(0, 5) + '...' : 'NOT SET');
console.log('Contains special chars:', /[[\]!@#$%^&*()]/.test(password));
