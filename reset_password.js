const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./server/models/user/User');
require('dotenv').config();

async function resetPassword() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        const email = 'rabbasi@qau.edu.pk';
        const newPassword = 'newpass123'; // You can change this to any password you want
        
        // Find the user
        const user = await User.findOne({ email });
        
        if (!user) {
            console.log(`❌ User not found: ${email}`);
            return;
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        // Update the user's password
        await User.updateOne(
            { email: email },
            { password: hashedPassword }
        );

        console.log(`✅ Password reset successful for: ${email}`);
        console.log(`🔑 New password: ${newPassword}`);
        console.log('\n💡 You can now log in with:');
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${newPassword}`);

        // Test the new password
        const testMatch = await bcrypt.compare(newPassword, hashedPassword);
        console.log(`🧪 Password verification: ${testMatch ? '✅ PASS' : '❌ FAIL'}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from database');
    }
}

resetPassword();
