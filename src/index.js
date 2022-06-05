const express = require('express');
const bodyParser = require('body-parser');
const route = require('./routes/route.js');
const mongoose  = require('mongoose');
const app = express();
const multer = require("multer")

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(multer().any())

try{
     mongoose.connect("mongodb+srv://FunctionUp-Uranium:qmseBYMLCGiI917G@cluster0.je95k.mongodb.net/Saloniproject5", {useNewUrlParser: true})
     console.log("MongoDb is connected successfully...")
    } 
catch (error) { 
     console.log(error) 
    }


app.use('/', route)

app.listen(3000, console.log('Express App is Running on port 3000'))