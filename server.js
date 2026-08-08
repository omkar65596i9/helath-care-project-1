const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();

// ==========================================
// 1. MIDDLEWARES
// ==========================================
app.use(express.json());
app.use(cors());

const JWT_SECRET = 'mysecretkey123';
const PORT = 5000;

// ==========================================
// 2. MONGOOSE SCHEMA & MODELS
// ==========================================
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' }
});

const User = mongoose.model('User', userSchema);

// ==========================================
// 3. DATABASE CONNECTION & SEEDING
// ==========================================
mongoose.connect('mongodb://localhost:27017/medicare')
    .then(() => {
        console.log('✅ Connected to MongoDB Database!');
        seedUsers();
    })
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

async function seedUsers() {
    try {
        // Clear old seeded data just in case
        await User.deleteMany({});

        const adminPassword = await bcrypt.hash('admin123', 10);
        const userPassword = await bcrypt.hash('user123', 10);

        await User.create([
            { email: 'admin@medicare.com', password: adminPassword, role: 'admin' },
            { email: 'user@medicare.com', password: userPassword, role: 'user' }
        ]);

        console.log('🔑 Default Users Re-created Successfully!');
        console.log('   Admin -> admin@medicare.com | admin123');
        console.log('   User  -> user@medicare.com  | user123');
    } catch (err) {
        console.error('Error seeding users:', err);
    }
}
// ==========================================
// 4. AUTH MIDDLEWARES
// ==========================================
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access Denied!' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid Token' });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ error: 'Admin Access Required!' });
    }
};

// ==========================================
// 5. API ROUTES
// ==========================================

// LOGIN ROUTE
app.post('/api/login', async (req, res) => {
    try {
        let { email, password } = req.body;
        email = email ? email.toLowerCase().trim() : '';

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Invalid Email or Password' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid Email or Password' });

        const token = jwt.sign(
            { userId: user._id, role: user.role, email: user.email },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Login successful',
            token: token,
            role: user.role,
            email: user.email
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET ALL ADMINS LIST
app.get('/api/admin/list', verifyToken, isAdmin, async (req, res) => {
    try {
        const admins = await User.find({ role: 'admin' }, 'email role createdAt');
        res.json(admins);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ADD / PROMOTE NEW ADMIN (Multiple Admin Access Management)
app.post('/api/admin/add-admin', verifyToken, isAdmin, async (req, res) => {
    try {
        let { email, password } = req.body;
        email = email ? email.toLowerCase().trim() : '';

        if (!email) return res.status(400).json({ error: 'Email is required' });

        let user = await User.findOne({ email });

        if (user) {
            // Agar user exist karta hai toh use Admin bana do
            user.role = 'admin';
            await user.save();
            return res.json({ message: `${email} is now promoted to Admin!` });
        } else {
            // Naya Admin account create kar do
            if (!password) password = 'admin123'; // Default password
            const hashedPassword = await bcrypt.hash(password, 10);
            await User.create({ email, password: hashedPassword, role: 'admin' });
            return res.json({ message: `New Admin Account Created for ${email}` });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Express Backend: Remove Admin API Route
app.delete('/api/admin/remove-admin', async (req, res) => {
    try {
        const { id, email } = req.body;

        // Note: Yahan aap apne Database (MongoDB/MySQL) se delete karne ka code likhenge.
        // Example (MongoDB Mongoose):
        // await User.findOneAndDelete({ $or: [{ _id: id }, { email: email }] });

        return res.status(200).json({ 
            success: true, 
            message: 'Admin access removed successfully!' 
        });
    } catch (error) {
        console.error('Remove admin error:', error);
        return res.status(500).json({ 
            error: 'Failed to remove admin access' 
        });
    }
});

// SERVER LISTEN
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});