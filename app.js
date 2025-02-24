require('dotenv').config();

const express = require('express');
const connectDB = require('./server/config/db');


const app = express();
const port = process.env.PORT || 5000;
connectDB();


//Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
 

// Routes
app.use('/', require('./server/routes/routes'));


app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});