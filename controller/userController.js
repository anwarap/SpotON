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
        res.render('home',{ isLoggedIn })
        
    } catch (error) {
        console.log(error.message);
    }
}

const loadLogout = async(req,res)=>{
    try {

        req.session.destroy();
        res.redirect('/');

    } catch (error) {

        console.log(error.message);
    }
}


const loadLogin =async(req,res)=>{
    try {
        
        if(req.session.user){
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
       if(userData){
           const passwordMatch = await bcrypt.compare(password,userData.password);
           if( userData.status === false){
               
               if(passwordMatch){  
                   req.session.user = userData;
                    res.redirect('/');
              }else{
                  req.app.locals.message = 'password is not matching';
                   res.render('login');
                  
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
        if(userData){
            req.app.locals.signUpMessage = 'Email already exists';
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
        const userAddress = await Addresses.findOne({_id:user._id})

        res.render('userProfile',{user:userData,userAddress:userAddress,isLoggedIn:true,page:'Profile'})
    } catch (error) {
        console.log(error.message);
    }
}




const postEditProfile = async(req,res)=>{
    try{

        const {fname,lname,email,mobile}= req.body;

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

const getShoppingCart  =async(req,res)=>{
    try{

        const user = req.session.user;
        const userData = await User.findById({_id: user._id}).populate('cart.productId');
        const cartItems = userData.cart;
        
        res.render('shoppingCart',{isLoggedIn:true,userData,cartItems})
    } catch(error){
        console.log(error.message);
    }
}

const addToCart = async(req,res)=>{
    try {
        const pdtId = req.params.id;
        const user = req.session.user;
        
    const userData  =await User.findById({_id:user._id});
    const pdtData = await Products.findById({_id:pdtId});

    if(pdtData.quantity){

        const isproductExist = userData.cart.findIndex((pdt)=>pdt.productId ==pdtId);
        if(isproductExist === -1){
            const cartItem = {
                productId:pdtId,
                quantity:1,
                productPrice:pdtData.price,

            }
            await User.findByIdAndUpdate({_id:user._id},{
                $push:{
                    cart:cartItem
                }
            })
            req.session.cartCount++;
        }else {
          
            await User.updateOne({_id:user._id,'cart.productId':pdtId},{
                $inc:{
                    "cart.$.quantity":1
                }
            })
        }
    } 
    res.redirect('/shoppingCart')
    } catch (error) {
        console.log(error.message);
    }
}

const removeCartItems = async(req,res)=>{
    try {
        const pdtId = req.params.id;
        const user = req.session.user;
        const userData = await User.findOneAndUpdate(
            {_id:user._id,'cart.productId':pdtId},
            {$pull:{
                cart:{productId:pdtId}
            }}
        )
        req.session.cartCount--;
        res.redirect('/shoppingCart');
    } catch (error) {
        console.log(error.message);
    }
}

const updateCart = async(req,res)=>{
    try{
        const userId = req.session.user._id;
        const quantity = parseInt(req.body.amt);
        const prodId = req.body.prodId;
        const pdtData = await Products.findById({_id: prodId});

        const stock = pdtData.quantity;

        let totalSingle = quantity*pdtData.price;
        
        if(stock>=quantity){
            await User.updateOne({_id:userId,'cart.productId':prodId}, {
                $set:{'cart.$.quantity':quantity}
            })
            
            const userData = await User.findById({_id:userId}).populate('cart.productId');
            let totalPrice  =0;
            
            userData.cart.forEach(pdt =>{
                totalPrice += pdt.productPrice*pdt.quantity;
            })
            
            res.json({
                status:true,
                data:{totalPrice,totalSingle}
            })
        }else{
            res.json({status:false,
                data:'producut stock has been exceeded'})
        }
        
    } catch(error){
        console.log(error.message);
    }
}

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
    getShoppingCart,
    addToCart,
    removeCartItems,
    updateCart,

}