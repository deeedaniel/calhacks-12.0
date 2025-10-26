/**
 * Test script for database functionality
 * Run with: node test-database.js
 */

require('dotenv').config();
const db = require('./lib/database');

async function testDatabase() {
  console.log('🧪 Testing Database Integration\n');
  console.log('='.repeat(50));
  
  try {
    // Test 1: Get all users
    console.log('\n📋 Test 1: Get all users');
    const users = await db.getAllUsers();
    console.log(`✅ Found ${users.length} users`);
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.email})`);
      if (user.github_username) {
        console.log(`     GitHub: ${user.github_username}`);
      }
    });
    
    if (users.length === 0) {
      console.log('\n⚠️  No users found! Make sure you created users in Supabase.');
      console.log('   Go to Supabase SQL Editor and run:');
      console.log('   INSERT INTO users (name, email, github_username) VALUES');
      console.log('   (\'Your Name\', \'email@example.com\', \'yourgithub\');');
      process.exit(1);
    }
    
    const testUser = users[0];
    console.log(`\n📝 Using ${testUser.name} for tests...`);
    
    // Test 2: Create a conversation
    console.log('\n📋 Test 2: Create a conversation');
    const conversation = await db.createConversation(
      testUser.id, 
      'Test Conversation'
    );
    console.log(`✅ Created conversation: ${conversation.id}`);
    console.log(`   Title: ${conversation.title}`);
    
    // Test 3: Add messages
    console.log('\n📋 Test 3: Add messages to conversation');
    await db.createMessage(
      conversation.id,
      testUser.id,
      'user',
      'Hello! Can you help me with my project?'
    );
    console.log('✅ Added user message');
    
    await db.createMessage(
      conversation.id,
      testUser.id,
      'assistant',
      'Of course! I\'d be happy to help. What do you need assistance with?'
    );
    console.log('✅ Added assistant message');
    
    await db.createMessage(
      conversation.id,
      testUser.id,
      'user',
      'I need help setting up a database for my chat app.'
    );
    console.log('✅ Added another user message');
    
    await db.createMessage(
      conversation.id,
      testUser.id,
      'assistant',
      'Great! I can help you set up a database. We\'ll use Supabase with PostgreSQL...'
    );
    console.log('✅ Added another assistant message');
    
    // Test 4: Retrieve conversation with messages
    console.log('\n📋 Test 4: Retrieve conversation with messages');
    const fullConversation = await db.getConversation(conversation.id);
    console.log(`✅ Retrieved conversation: ${fullConversation.title}`);
    console.log(`   Messages: ${fullConversation.messages.length}`);
    fullConversation.messages.forEach((msg, idx) => {
      const preview = msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '');
      console.log(`   ${idx + 1}. [${msg.role}] ${preview}`);
    });
    
    // Test 5: Get conversation history (Gemini format)
    console.log('\n📋 Test 5: Get conversation history (Gemini format)');
    const history = await db.getConversationHistory(conversation.id);
    console.log(`✅ Retrieved ${history.length} messages in Gemini format`);
    history.forEach((msg, idx) => {
      console.log(`   ${idx + 1}. ${msg.role}: ${msg.parts[0].text.substring(0, 40)}...`);
    });
    
    // Test 6: Get user's conversations
    console.log('\n📋 Test 6: Get user\'s conversations');
    const userConversations = await db.getUserConversations(testUser.id);
    console.log(`✅ User has ${userConversations.length} conversation(s)`);
    userConversations.forEach(conv => {
      console.log(`   - ${conv.title} (${conv.messageCount} messages)`);
      if (conv.lastMessage) {
        const preview = conv.lastMessage.content.substring(0, 40);
        console.log(`     Last: ${preview}...`);
      }
    });
    
    // Test 7: Get user statistics
    console.log('\n📋 Test 7: Get user statistics');
    const stats = await db.getUserStats(testUser.id);
    console.log(`✅ User stats:`);
    console.log(`   Total conversations: ${stats.totalConversations}`);
    console.log(`   Total messages: ${stats.totalMessages}`);
    
    // Test 8: Update conversation title
    console.log('\n📋 Test 8: Update conversation title');
    const updatedConv = await db.updateConversation(
      conversation.id,
      { title: 'Database Setup Help' }
    );
    console.log(`✅ Updated title to: ${updatedConv.title}`);
    
    // Test 9: Create another conversation (for testing list)
    console.log('\n📋 Test 9: Create second conversation');
    const conversation2 = await db.createConversation(
      testUser.id,
      'Another Test Chat'
    );
    await db.createMessage(
      conversation2.id,
      testUser.id,
      'user',
      'This is a second conversation'
    );
    console.log(`✅ Created second conversation: ${conversation2.id}`);
    
    // Test 10: Clean up (delete test conversations)
    console.log('\n📋 Test 10: Clean up test data');
    await db.deleteConversation(conversation.id);
    console.log('✅ Deleted first test conversation');
    await db.deleteConversation(conversation2.id);
    console.log('✅ Deleted second test conversation');
    
    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log('🎉 All tests passed successfully!\n');
    console.log('Your database is ready to use. Next steps:');
    console.log('1. Make sure SUPABASE_URL and SUPABASE_ANON_KEY are in your .env');
    console.log('2. Start your server: npm run dev');
    console.log('3. Test the API endpoints with your frontend\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nFull error:', error);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure you ran the database-setup.sql in Supabase');
    console.log('2. Check that SUPABASE_URL and SUPABASE_ANON_KEY are set in .env');
    console.log('3. Verify the users table has data');
    console.log('4. Check your Supabase project is active\n');
    process.exit(1);
  }
}

// Run tests
console.log('Starting database tests...\n');
testDatabase();

