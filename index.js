require("dotenv").config();
const express =require('express')
const path = require('path');
const mongoose =require('mongoose');
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true, w: 'majority' })
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((err) => {
        console.error('Error during connecting to MongoDB', err);
    });
const userRoute = require('./routes/userRoute');
const adminRoute = require('./routes/adminRoute');
const {randomUUID} = require('crypto');
const nocache = require('nocache');
const { err404, err500 } = require('./middleware/errorHandler')
const app = express();
app.set('view engine','ejs');
app.use(express.json());
app.use(express.urlencoded({ extended:true }));

const session = require('express-session');

app.use(session({
    secret:randomUUID(),
    resave:false,
    saveUninitialized:true
}))
 
app.use(nocache());

app.use('/static',express.static(path.join(__dirname,'public')));
app.use('/assets',express.static(path.join(__dirname,'public/assets')));

app.use('/',userRoute);

app.use('/admin',adminRoute);

app.set('views','./views/errors');

app.use(err404)
app.use(err500)


app.listen(3000,()=>{
    console.log('server is on http://localhost:3000/login');
})

