const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./server/config/db");
const routes = require("./server/routes/routes");
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const flash = require('connect-flash');
const fileUpload = require('express-fileupload');


dotenv.config();
connectDB();

const app = express();

// setup flash
app.use(
  flash({ sessionKeyName: 'express-flash-message'}));

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } 
}));

// Static Fields 
app.use(express.static('public'));

// File Upload Middleware
app.use(fileUpload({ limits: { fileSize: 50 * 1024 * 1024 } })); // 50MB limit

// Templating Engine   
app.use(expressLayouts);
app.set('layout', './layouts/main');
app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/", routes);

// Handle 404
app.get('*', (req, res) => {  
    res.render('pages/error/404');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
