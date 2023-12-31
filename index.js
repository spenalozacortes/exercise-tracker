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
const Exercise = require('./models/exercise');
const Log = require('./models/log');

// Attach _id and username to request object
app.param('_id', async (req, res, next, id) => {
    try {
      req.id = id;
      const { username } = await User.findOne({ _id: id });
      req.username = username;
      next();
    } catch (err) {
      next(err);
    }
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html')
});

// Get all users
app.get('/api/users', async (req, res, next) => {
    try {
      const users = await User.find({}, {__v: 0});
      res.send(users);
    } catch (err) {
      next(err);
    }
});

// Get user logs
app.get('/api/users/:_id/logs', async (req, res, next) => {
    const { from, to, limit } = req.query;
    const unixFrom = new Date(from).getTime();
    const unixTo = new Date(to).getTime();
    try {
      const logs = await Log.findOne({ username: req.username }, { __v: 0 });
      let arr = [];
      // If query, filter the log array
      if (from && to) {
        arr = logs.log.filter(log => {
          const unixDate = new Date(log.date).getTime();
          return unixDate >= unixFrom && unixDate <= unixTo; 
        });    
      } else if (from) {
        arr = logs.log.filter(log => {
          const unixDate = new Date(log.date).getTime();
          return unixDate >= unixFrom;
        });
      } else if (to) {
        arr = logs.log.filter(log => {
          const unixDate = new Date(log.date).getTime();
          return unixDate <= unixTo;
        });
      } else {
        arr = logs.log;
      }
      if (limit) {
        arr = arr.slice(0, Number(limit));
      }
      res.json({
          username: logs.username,  
          count: logs.count,
          _id: logs._id,
          log: arr
      });
    } catch (err) {
      next(err);
    }
});

// Create user
app.post('/api/users', async (req, res, next) => {
    const username = req.body.username;
    const newUser = new User({
      username: username
    });
    const newLog = new Log({
      username: username
    });
    try {
      const userSaved = await newUser.save();
      await newLog.save();
      res.json({
        username: userSaved.username,
        _id: userSaved._id
      });
    } catch (err) {
      next(err);
    }
});

// Create exercise
app.post('/api/users/:_id/exercises', async (req, res, next) => {
    const { description, duration, date } = req.body;
    const dateFormatted = date ? new Date(date).toDateString() : new Date().toDateString();
    try {
      const newExercise = new Exercise({
        username: req.username,
        description: description,
        duration: duration,
        date: dateFormatted
      });
      const savedExercise = await newExercise.save();
      // Update user log with new exercise
      await Log.updateOne(
        { username: req.username },
        { $push: { log: savedExercise },
          $inc: { count: 1 }});
      res.json({
        _id: req.id,
        username: req.username,
        date: savedExercise.date,
        duration: savedExercise.duration,
        description: savedExercise.description 
      });
    } catch (err) {
      next(err);
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});