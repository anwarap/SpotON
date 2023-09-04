const User=require('../models/userModel');
const Products = require('../models/productModels');
const Categories = require('../models/categoryModels');
const Addresses = require('../models/addressModels');
const bcrypt=require('bcrypt');
const dotenv = require('dotenv').config();
// const { request } = require('../routes/userRoute');
const nodemailer = require('nodemailer');
const { request, response } = require('../routes/userRoute');

const securePassword =async(password)=>{
    try {
        const passwordHash =await bcrypt.hash(password,10);
        return passwordHash;
    } catch (error) {
        console.log(error.message);
    }
}
let getOTP =()=>Math.floor(Math.random()*1000000);



const loadHome =async(req,res)=>{
    try {
       
        const isLoggedIn = Boolean(req.session.user)
        // console.log(req.session.user);
        
        res.render('home',{ isLoggedIn })
        // res.render('home')
        
    } catch (error) {
        console.log(error.message);
        console.log("fss");
    }
}

const loadLogout = async(req,res)=>{
    try {
        // console.log(req.session.name);

        req.session.destroy();
        res.redirect('/');

    } catch (error) {
        console.log(error.message);
    }
}


const loadLogin =async(req,res)=>{
    try {
        if(req.session.user){
            // console.log('dddd');
            res.redirect('/');
        }else{

            res.render('login')
        }
    } catch (error) {
        console.log(error.message);
    }
}

const loadSignup = async(req,res)=>{
    try {
        // var emailExistMessage = req.app.locals.specialContext;
        // req.app.locals.specialContext =null;
        res.render('signup',{title:"SignUp"});
    } catch (error) {
        console.log(error.message);
    }
}



const postLogin = async(req,res)=>{
    try {
       const email =req.body.email;
       const password = req.body.password;
       const userData = await User.findOne({email:email});
    //    console.log(email);
   
    //    console.log(userData);
   
    //    console.log(password);
       if(userData){
           const passwordMatch = await bcrypt.compare(password,userData.password);
           if( userData.status === false){
               
               if(passwordMatch){
   
                   req.session.user = userData;
                   // req.session.userId = userData._id;
                   // res.render('home',{user:userData, title:'Home',})
                    res.redirect('/');
               
               
              }else{
                  req.app.locals.message = 'password is not matching';
                   res.render('login');
               //    console.log("ddd");
                  
              }
           }else{
               req.app.locals.message = 'Your account is blocked ';
                res.redirect('/login');
       
           }
       }
    } catch (error) {
       console.log(error.message);
    }
   }
   
   
   

const postSignup = async(req,res)=>{
    try{
      const {fname,lname,email,mobile,password,cpassword} = req.body;
    if(password === cpassword){
        const userData = await User.findOne({email:email});
        // console.log(userData);
        if(userData){
            req.app.locals.signUpMessage = 'Email already exists';
            // console.log('sss');
             res.redirect('/signup');
        }

        const OTP = req.session.OTP = getOTP();
        req.session.fname = fname;
        req.session.lname = lname;
        req.session.email = email; 
        req.session.mobile = mobile;
        req.session.password = password;
        console.log(req.session.OTP);
        sendVerifyMail(fname, lname, email, OTP);
        res.render('otpPage',{title:"OTP verify page",fname,lname,email,mobile,password,signUpMessage:"please check your email"})

    }else{
        req.app.locals.signUpMessage = 'Passwords do not match';
         res.redirect('/signup');
    }
    } catch (error) {
        console.log(error.message);
    }
}

const sendVerifyMail = async(fname,lname,email,OTP)=>{
    try{
        const transporter =nodemailer.createTransport({
            host:'smtp.gmail.com',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:'anwaraliap1122@gmail.com',
                pass:process.env.PASS
            }
        });

        const mailOptions = {
            from:'anwaraliap1122@gmail.com',
            to:email,
            subject: "Verify your account",
            // text:OTP +'give it to me '
           html: `<h1>Hello, ${fname} ${lname}</h1><h5>Your OTP for verification is,</h5><p>OTP: ${OTP}</p>`

    }
    transporter.sendMail(mailOptions,(err,info)=>{
        if(err){
            console.log(err);
        }else{
            console.log("OTP send successfully",info.response);
        }
    })
    } catch(error){
        console.log(error.message);
    }
}


const postOTPVerify = async(req,res)=>{
    try {
        const enteredOtp = Number(req.body.otp);
        const sharedOtp = Number(req.session.OTP);
        
        const {fname,lname,email,mobile,password}  = req.session;
    //     console.log(sharedOtp+"aa");
    //    console.log(enteredOtp+"dd");
       if(enteredOtp == sharedOtp){
           const secPassword = await securePassword(password);
           const user = new User({fname,lname,email,mobile,password:secPassword});
           const newUserData = await user.save();
           req.session.userId = newUserData._id;
           return res.redirect('/login'); 
        }else{
            console.log('Incorrect OTP');
        res.render('otpPage',{fname,lname,email,mobile,password:password,message:"Invalid OTP"});
    }
} catch (error) {
    console.log(error.message);
}
}


const getProfile = async(req,res)=>{
    try {
        const user = req.session.user;
        const userData = await User.findById({_id:user._id});
        const userAddress = await Addresses.findOne({userId:user._id})

        res.render('userProfile',{user:userData,userAddress,isLoggedIn:true,page:'Profile'})
    } catch (error) {
        console.log(error.message);
    }
}




const postEditProfile = async(req,res)=>{
    try{

        const {fname,lname,email,mobile}= req.body;
        // console.log(req.body);
         await User.findByIdAndUpdate({_id:req.session.user._id},{
            $set:{fname:req.body.fname,lname:req.body.lname,email:req.body.email,mobile:req.body.mobile}
        })
        res.redirect('/profile');
    } catch (error) {
        console.log(error.message);
    }
}

const getChangePassword = async(req,res)=>{
    try{
        const user = req.session.user;
        const userData = await User.findById({_id:user._id});
        res.render('changePass',{user:userData,isLoggedIn:true})
    } catch(error){
        console.log(error.message);
    }
}

const postChangePassword = async(req,res)=>{
    try{
        const user = req.session.user;
        const {oldpassword,newpassword,confirmpassword} = req.body;
        if(newpassword !== confirmpassword){
            return res.redirect('/profile/changePassword');
        }
        const userData = await User.findById({_id: user._id});
        console.log(oldpassword);
        
        const passwordMatch = await bcrypt.compare(oldpassword,userData.password);
        if(passwordMatch){
            const sPassword = await securePassword(newpassword);
            await User.findByIdAndUpdate({_id: user._id},{
                $set:{password: sPassword}
            })
            return res.redirect('/profile')
        }else{
            req.app.locals.oldpass = 'old password not match'
            return res.redirect('/profile/changePassword')
        }
    } catch(error){
        console.log(error.message);
    }
}

// const getShoppingCart  =async(req,res)=>{
//     const user = req.session.user;
//     const userData = await User.findById({_id: user._id});
    
// }


module.exports ={
    loadSignup,
    loadLogin,
    loadHome,
    loadLogout,
    postLogin,
    postSignup,
    postOTPVerify,
    getProfile,
    postEditProfile,
    getChangePassword,
    postChangePassword,
}