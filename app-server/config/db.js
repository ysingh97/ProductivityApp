const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
  try {
    console.log(process.env.MONGO_URI)
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    //console.log('MongoDB Connected');
  } catch (err) {
    console.error('MongoDB Connection Failed:', err.message);
    process.exit(1); // Exit with failure
  }
};

module.exports = connectDB;