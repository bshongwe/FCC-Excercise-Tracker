const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');

// 1. Mongoose Setup
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// 2. Body Parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// 3. Route Handler
app.use(cors())
app.use(express.json())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// 4. Define Schema
// 4.1. User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

// 4.2. Exercise Schema
const exerciseSchema = new mongoose.Schema({
  userId: mongoose.Types.ObjectId,
  description: { type: String },
  duration: { type: Number },
  date: { type: Date, default: Date.now }
});

// 4.3 Schema Models
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Exercise Requirements
// 1. GET request to /api/users to get a list of all users
app.post('/api/users', (req, res) => {
  const { username } = req.body;
  const user = new User({ username });
  user.save((err, savedUser) => {
    if (err) {
      res.status(500).send('Error saving user');
    } else {
      res.json({ username: savedUser.username, _id: savedUser._id });
    }
  });
});

// 2. Add user to database
app.get('/api/users', (req, res) => {
  User.find({}, (err, users) => {
    if (err) {
      res.status(500).send('Error fetching users');
    } else {
      res.json(users);
    }
  });
});

// 3. POST to /api/users/:_id/exercises with form data description, duration, and date
app.post('/api/users/:_id/exercises', (req, res) => {
  const { description, duration } = req.body;
  const { _id } = req.params;
  const date = req.body.date ? new Date(req.body.date).toDateString() : new Date().toDateString();

// 4. Add exercise to user
  const exercise = new Exercise({userId: mongoose.Types.ObjectId(_id), description, duration: parseInt(duration), date });
  exercise.save((err, savedExercise) => {
    if (err) {
	console.log(err);
      res.status(500).send('Error saving exercise');
    } else {
      User.findById(_id, (err, user) => {
        if (err) {
          res.status(500).send('Error finding user');
        } else {
          res.json({
            username: user.username,
            description: savedExercise.description,
            duration: savedExercise.duration,
            date: savedExercise.date.toDateString(),
            _id: user._id
          });
        }
      });
    }
  });
});

// GET request to /api/users/:_id/logs to retrieve a full exercise log of any user
app.get('/api/users/:_id/logs', (req, res) => {
  const _id = req.params._id;
  const from = req.query.from || '1900-01-01';
  const to = req.query.to || '2023-03-31';
  const limit = req.query.limit || 0;
  let logs = [];

  // User Validation
  User.findById(_id, (err, userData) => {
    if (err) {
      res.status(400).send('Error retrieving user');
      return;
    }
    Exercise.find({ userId: _id }).select('-__v -_id').exec((err, exercises) => {

// Filter exercises
      console.log("exercises: ",exercises);
      if (from && to) {
        exercises = exercises.filter(exercise => {
          const exerciseDate = new Date(exercise.date);
          if (from && to) {
            const fromDate = new Date(from);
            const toDate = new Date(to);
            return exerciseDate >= fromDate && exerciseDate <= toDate;
          } else if (from) {
            const fromDate = new Date(from);
            return exerciseDate >= fromDate;
          } else if (to) {
            const toDate = new Date(to);
            return exerciseDate <= toDate;
          } else {
            return true;
          }
        });
      }

        logs = limit > 0 ? exercises.slice(0, limit): exercises;
    
      const updatedExercises = logs.map((exercise) => {
        console.log("updatedEx: ", new Date(exercise.date).toDateString());
        return {
          duration: exercise.duration,
          description: exercise.description,
          date: new Date(exercise.date).toDateString()
        }
      });


      res.json({
        username: userData.username,
        count: updatedExercises.length,
        _id: userData._id,
        log: updatedExercises
      });
    });
  });
});

// Server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
