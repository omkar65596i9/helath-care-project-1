const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/medicare')
    .then(async () => {
        console.log('✅ Connected to MongoDB Database!');
        
        // Users collection ko drop / delete karna
        await mongoose.connection.db.dropCollection('users')
            .then(() => console.log('🗑️  Old users collection deleted successfully!'))
            .catch(err => console.log('⚠️  Collection already empty or does not exist.'));

        console.log('🎉 Reset Complete! Ab aap server.js start kar sakte hain.');
        process.exit();
    })
    .catch(err => {
        console.error('❌ Connection Error:', err);
        process.exit(1);
    });