import User from '../models/userModel.js';
import sequelize from '../models/sequelize.js';

async function fixNullEmailUsers() {
  try {
    console.log('🔍 Checking for users with null email values...');
    
    // Find users with null or undefined email
    const usersWithNullEmail = await User.findAll({
      where: {
        [sequelize.Op.or]: [
          { email: null },
          { email: '' },
          { email: sequelize.literal('email IS NULL') }
        ]
      }
    });

    console.log(`Found ${usersWithNullEmail.length} users with null/empty email values`);

    if (usersWithNullEmail.length === 0) {
      console.log('✅ No users with null email values found');
      return;
    }

    // Fix each user
    for (const user of usersWithNullEmail) {
      console.log(`\n👤 User ID: ${user.id}, Username: ${user.username}`);
      console.log(`   Current email: ${user.email}`);
      
      // Generate a placeholder email if username exists
      if (user.username) {
        const placeholderEmail = `${user.username}@placeholder.com`;
        await user.update({ email: placeholderEmail });
        console.log(`   ✅ Updated email to: ${placeholderEmail}`);
      } else {
        // If no username either, generate a random email
        const randomEmail = `user_${user.id.substring(0, 8)}@placeholder.com`;
        await user.update({ email: randomEmail });
        console.log(`   ✅ Updated email to: ${randomEmail}`);
      }
    }

    console.log('\n🎉 All null email values have been fixed!');
    
  } catch (error) {
    console.error('❌ Error fixing null email users:', error);
  }
}

// Run the script
fixNullEmailUsers().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
}); 