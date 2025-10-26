require('dotenv').config();
const db = require('./lib/database');

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...\n');
    
    const users = await db.getAllUsers();
    
    if (users.length === 0) {
      console.log('❌ No users found in database!\n');
      console.log('Please add your team members in Supabase:');
      console.log('1. Go to Supabase Dashboard → SQL Editor');
      console.log('2. Run this SQL:\n');
      console.log(`INSERT INTO users (name, email, github_username, github_url) VALUES
  ('Team Member 1', 'member1@example.com', 'github1', 'https://github.com/github1'),
  ('Team Member 2', 'member2@example.com', 'github2', 'https://github.com/github2'),
  ('Team Member 3', 'member3@example.com', 'github3', 'https://github.com/github3');
`);
      console.log('\n(Replace with your actual team info!)');
    } else {
      console.log(`✅ Found ${users.length} user(s):\n`);
      users.forEach((user, idx) => {
        console.log(`${idx + 1}. ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   ID: ${user.id}`);
        if (user.github_username) {
          console.log(`   GitHub: ${user.github_username}`);
        }
        console.log('');
      });
      
      console.log('✅ Users are ready! You can now test chat history.\n');
      console.log('Run: node test-database.js');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUsers();

