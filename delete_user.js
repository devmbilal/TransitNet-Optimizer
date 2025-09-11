const mongoose = require('mongoose');
const User = require('./server/models/user/User');
require('dotenv').config();

async function deleteUser() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        const emailToDelete = 'rabbasi@qau.edu.pk';
        
        // Find and delete the user
        const result = await User.deleteOne({ email: emailToDelete });
        
        if (result.deletedCount > 0) {
            console.log(`✅ Successfully deleted user: ${emailToDelete}`);
            console.log('💡 You can now recreate this user through the signup page with a new password.');
        } else {
            console.log(`❌ User not found: ${emailToDelete}`);
        }

        // Show remaining users
        const remainingUsers = await User.find({});
        console.log('\n📋 Remaining users in database:');
        remainingUsers.forEach((user, index) => {
            console.log(`${index + 1}. ${user.email} (${user.name})`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from database');
    }
}

deleteUser();
