const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const errorHandler = require('errorhandler');
const moment = require('moment');
require('dotenv').config();

// Basic configuration
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(errorHandler());

// Connect to database
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
// Set up mongoose models
const User = require('./models/user');

// Get all users
app.get('/api/users', async (req, res, next) => {
    try {
      const users = await User.find({}, {__v: 0});
      res.send(users);
    } catch (err) {
      next(err);
    }
});

// Create user
app.post('/api/users', async (req, res, next) => {
    const newUser = new User({
      username: req.body.username
    });
    try {
      const userSaved = await newUser.save();
      res.json({
        username: userSaved.username,
        _id: userSaved._id
      });
    } catch (err) {
      next(err);
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});