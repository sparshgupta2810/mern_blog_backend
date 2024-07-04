const express = require('express');
const path = require('path');
const cors = require('cors');
const { connect } = require('mongoose');
const upload = require('express-fileupload');
require('dotenv').config();

const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: (origin, callback) => {
    callback(null, true);  // Allow all origins
  },
  credentials: true  // Allow credentials
}));
app.use(upload());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

app.use(notFound);
app.use(errorHandler);

connect(process.env.MONGO_URL)
  .then(() => {
    console.log('Connected to MongoDB'); // Log on successful connection
    app.listen(5000, () => {
      console.log("Server is running on port 5000");
    });
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error.message);
  });







