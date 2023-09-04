const express =require('express')
const path = require('path');
const mongoose =require('mongoose');
mongoose.connect("mongodb://127.0.0.1:27017/spoton")
const userRoute = require('./routes/userRoute');
const adminRoute = require('./routes/adminRoute');
const {randomUUID} = require('crypto');
const nocache = require('nocache');
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


app.listen(3003,()=>{
    console.log('server is on http://localhost:3003/login');
})

