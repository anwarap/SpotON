const User=require('../models/userModel');
const Products = require('../models/productModels');
const Categories = require('../models/categoryModels');
const Addresses = require('../models/addressModels');
const bcrypt=require('bcrypt');
const dotenv = require('dotenv').config();
const crypto = require('crypto');
const {updateWallet} = require('../helpers/helpersFunction');
const referralCode = require('../helpers/generator')
const nodemailer = require('nodemailer');
const RazorPay = require('razorpay');


var instance = new RazorPay({
    key_id:process.env.key_id,
    key_secret:process.env.key_secret
})

const securePassword =async(password)=>{
    try {
        const passwordHash =await bcrypt.hash(password,10);
        return passwordHash;
    } catch (error) {
        console.log(error.message);
    }
}

const getOTP = () => Math.floor(Math.random() * 900000) + 100000;



const loadHome =async(req,res,next)=>{
    try {
       
        const isLoggedIn = Boolean(req.session.user)
        res.render('home',{ isLoggedIn })
        
    } catch (error) {
        next(error)
    }
}

const loadLogout = async(req,res,next)=>{
    try {

        req.session.destroy();
        res.redirect('/');

    } catch (error) {

        next(error)
    }
}


const loadLogin =async(req,res,next)=>{
    try {
        var loginErrorMessage = req.app.locals.specialContext;
        req.app.locals.specialContext = null;
        if(req.session.user){
            res.redirect('/');
        }else{

            res.render('login',{loginErrorMessage})
        }
    } catch (error) {
        next(error)
    }
}

const loadSignup = async(req,res,next)=>{
    try {
        var emailExistMessage = req.app.locals.specialContext;
        req.app.locals.specialContext = null;
        req.session.referral = '';
        if (req.query.referral) {
            req.session.referral = req.query.referral;
            //console.log(req.query.referral);
        }
        res.render('signup',{title:"SignUp",referral: req.session.referral,emailExistMessage});
    } catch (error) {
        next(error)
    }
}



const postLogin = async(req,res,next)=>{
    try {
        
       const email =req.body.email;
       const password = req.body.password;
       const userData = await User.findOne({email:email});
       if(userData){
           const passwordMatch = await bcrypt.compare(password,userData.password);
           if( userData.isBlocked === false){
               
               if(passwordMatch){  
                   req.session.user = userData;
                   req.session.cartCount = userData.cart.length;
                   req.session.wishCount = userData.wishlist.length
                    res.redirect('/');
              }else{
                req.app.locals.specialContext = 'password is not matching';
                  return res.redirect('/login');
                  
              }
           }else{
            req.app.locals.specialContext = 'Your account is blocked ';
                res.redirect('/login');
       
           }
       } else{
        req.app.locals.specialContext = 'Invalid Email, Please re-check your email'
        return res.redirect('/login');
       }
    } catch (error) {
        next(error)
    }
   }

   
   
const getLoginForgetPassword = async(req,res,next)=>{
    try {
        var passwordErrorMessage = req.app.locals.specialContext;
        req.app.locals.specialContext = null;
        res.render('loginForgetPassword',{ title: 'Forgot Password',passwordErrorMessage})
    } catch (error) {
        next(error)
    }
}

const postLoginForgetPassword = async(req,res,next)=>{
    try {
        const {newpassword,confirmpassword,email} = req.body;
        const userData = await User.findOne({email:email});
        if(userData){
            
             if(newpassword === confirmpassword){
                
                req.session.newpassword = newpassword;
                req.session.confirmpassword = confirmpassword;
                req.session.user = userData;
                var otpErrorMessage = req.app.locals.specialContext;
                req.app.locals.specialContext = null;
                res.render('forgetOtpPage',{title:'Resent password OTP Verification',email,otpErrorMessage});
                const OTP = getOTP();
                req.session.OTP = OTP;
                req.session.save();
                
                console.log(userData.fname)
                console.log(userData.lname)
                console.log(userData.email)
                
                sendVerifyMail(userData.fname, userData.lname, userData.email,OTP);
             }
        }else{
            req.app.locals.specialContext = 'Email not found';
            return res.redirect('/forgotpassword');
        }
    } catch (error) {
        next(error)
    }
}

const postResentverifyOtp  =async(req,res,next)=>{
    try {
   
        const otp = Number(req.body.otp);
        const userData = req.session.user;
        console.log({userData:userData});
       
        const OTP = Number(req.session.OTP);
        const newpassword = req.session.newpassword;
        const confirmpassword = req.session.confirmpassword;
        if (OTP === otp) {
            if (newpassword !== confirmpassword) {
                req.app.locals.specialContext = 'Both passwords are not matching'
                return res.redirect(`/forgotpassword`);
            } else {
                const secPassword = await securePassword(newpassword);
              
                await User.findOneAndUpdate(
                    { _id: userData._id },
                    {
                        $set: {
                            password: secPassword
                        }
                    }
                    );
                    req.app.locals.specialContext = 'Password changed successfully';
                    req.session.destroy();
                
                    return res.redirect('/login');
                }
            } else {
                req.app.locals.specialContext = 'Invalid OTP entered';
                let otpErrorMessage=req.app.locals.specialContext
                
                return res.render('forgetOtpPage',{title:'Resent password OTP Verification',email:userData.email,otpErrorMessage});
        }
        
    } catch (error) {
        next(error)
    }
}
   



const postSignup = async(req,res,next)=>{
    try{
      const {fname,lname,email,mobile,password,cpassword} = req.body;
      
    if(password === cpassword){
        const userData = await User.findOne({email:email});
        if(userData){
            req.app.locals.specialContext = 'Email already exists';
            return res.redirect('/signup');
        }

        const OTP = req.session.OTP = getOTP();
        req.session.fname = fname;
        req.session.lname = lname;
        req.session.email = email; 
        req.session.mobile = mobile;
        req.session.password = password;
        console.log(OTP+'otp');
        sendVerifyMail(fname, lname, email, OTP);
        res.render('otpPage',{title:"OTP verify page",fname,lname,email,mobile,password,emailExistMessage:"please check your email"})

    }
    } catch (error) {
        next(error)
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
        let userName;
        if(fname===''||lname===''){
            userName ='user'
        }else{
            userName =fname+lname
        }

        const mailOptions = {
            from:'anwaraliap1122@gmail.com',
            to:email,
            subject: "Verify your account",
           html: `<h1>Hello, ${userName}</h1><h5>Your OTP for verification is,</h5><p>OTP: ${OTP}</p>`

    }
    transporter.sendMail(mailOptions,(error,info)=>{
        if(error){
            console.log(error)
        }else{
            console.log("Email send successfully",info.response);
        }
    })
    } catch(error){
        next(error)
    }
}


const postOTPVerify = async(req,res,next)=>{
    try {
        const enteredOtp = Number(req.body.otp);
        const sharedOtp = Number(req.session.OTP);  
        const {fname,lname,email,mobile,password,referral}  = req.session;
        console.log(sharedOtp+'otp');
       if(enteredOtp == sharedOtp){
           const secPassword = await securePassword(password);
           const newReferralCode = await referralCode()
        //    console.log(newReferralCode+'rrefferal,');
        let newUserData ;
           if(referral){
            const isReferrerExist = await User.findOne({referralCode:referral});
            let joiningBonus = 100;
            if(isReferrerExist){
                // console.log('lll');
                let refereredUserId = isReferrerExist._id;

                const walletHistory = {
                    date:new Date(),
                    amount:joiningBonus ,
                    message:'Joining Bonus'
                }
                newUserData = await  new User({fname,lname,email,mobile,password:secPassword,
                    referralCode: newReferralCode, referredBy: referral, isReferred: true, wallet: 100,walletHistory}).save();
                    // console.log(newUserData+'ddd');
                updateWallet(refereredUserId, 100, 'Referral Reward')

            }
           }else{
            newUserData = await  new User({fname,lname,email,mobile,password:secPassword, referralCode: newReferralCode, isReferred: false}).save();
           }
           
           req.session.userId = newUserData._id;
           return res.redirect('/login'); 
        }else{
            console.log('Incorrect OTP');
        res.render('otpPage',{fname,lname,email,mobile,password:password,message:"Invalid OTP"});
    }
} catch (error) {
    next(error)
}
}

const getResendOtp = async(req,res,next)=>{
    try {
        const email = req.query.id
        const resendedOTP = getOTP()
        req.session.OTP = resendedOTP
        sendVerifyMail(req.session.fname, req.session.lname, email, resendedOTP);
        res.render('otpPage', { title: 'Verification Page', fname: req.session.fname, lname: req.session.lname, email: req.session.email, mobno: req.session.mobile, password: req.session.password, message: 'OTP resended successfully,Please check your email' });
    } catch (error) {
        next(error)
    }
}

const getForgotResendOTP = async(req,res,next)=>{
    try {
        const email = req.query.id;
        console.log(email+'ee');
        const resendedOTP = getOTP()
        req.session.OTP = resendedOTP;
       console.log( req.session.fname+'lll')
        sendVerifyMail('', '', email, resendedOTP);
        res.render('forgetOtpPage', { title: 'Verification Page',email,  message: 'OTP resended successfully,Please check your email' });
    } catch (error) {
        next(error)
    }
}




const getProfile = async(req,res,next)=>{
    try {
        const user = req.session.user;
        const userData = await User.findById({_id:user._id});
        const userAddress = await Addresses.findOne({_id:user._id})

        res.render('userProfile',{user:userData,userAddress:userAddress,isLoggedIn:true,page:'Profile'})
    } catch (error) {
        next(error)
    }
}






const postEditProfile = async(req,res,next)=>{
    try{

        const {fname,lname,email,mobile}= req.body;

         await User.findByIdAndUpdate({_id:req.session.user._id},{
            $set:{fname:req.body.fname,lname:req.body.lname,email:req.body.email,mobile:req.body.mobile}
        })
        res.redirect('/profile');
    } catch (error) {
        next(error)
    }
}

const getChangePassword = async(req,res,next)=>{
    try{
        var changePasswordMessage = req.app.locals.specialContext;
        req.app.locals.specialContext = null;
        const user = req.session.user;
        const userData = await User.findById({_id:user._id});
        res.render('changePass',{user:userData,isLoggedIn:true,changePasswordMessage })
    } catch(error){
        next(error) 
    }
}

const postChangePassword = async(req,res,next)=>{
    try{
        const user = req.session.user;
        const {oldPassword,newPassword,confirmPassword} = req.body;
        console.log(oldPassword,newPassword,confirmPassword);
        console.log(oldPassword)

        if(newPassword !== confirmPassword){
            return res.redirect('/profile/changePassword');
        }

        const userData = await User.findById({_id: user._id});
        const passwordMatch = await bcrypt.compare(oldPassword,userData.password);

        if(passwordMatch){
            const sPassword = await securePassword(newPassword);
            await User.findByIdAndUpdate({_id: user._id},{
                $set:{password: sPassword}
            })
            return res.redirect('/profile')
        }else{
           req.app.locals.specialContext = 'Old password not match';
            return res.redirect('/profile/changePassword')
        }
    } catch(error){
        next(error)
    }
}

const getShoppingCart  =async(req,res,next)=>{
    try{

        const userId = req.session.user._id;
        const userData = await User.findById({_id: userId}).populate('cart.productId').populate('cart.productId.offer');
        const cartItems = userData.cart;

        for(const { productId } of cartItems ){
        
            await User.updateOne(
                { _id: userId, 'cart.productId': productId._id },
                {
                    $set: {
                        'cart.$.productPrice': productId.price
                        
                    }
                }
            )
        }
       
        
        res.render('shoppingCart',{isLoggedIn:true,userData,cartItems})
    } catch(error){
        next(error)
      
    }
}

const addToCart = async(req,res,next)=>{
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
        next(error)
    }
}

const removeCartItems = async(req,res,next)=>{
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
        next(error)
    }
}

const updateCart = async(req,res,next)=>{
    try{
        const userId = req.session.user._id;
        const quantity = parseInt(req.body.amt);
        const prodId = req.body.prodId;
        const pdtData = await Products.findById({_id: prodId});
        
        const stock = pdtData.quantity;
        let totalSingle;
        if(pdtData.offerPrice){

            totalSingle = quantity*pdtData.price;

        }else{

            totalSingle = quantity*pdtData.price;
        }
        
        if(stock>=quantity){
            await User.updateOne({_id:userId,'cart.productId':prodId}, {
                $set:{'cart.$.quantity':quantity}
            })
            
            const userData = await User.findById({_id:userId}).populate('cart.productId');
            let totalPrice  =0;
            let totalDiscount=0;

           let cartItems = userData.cart

            for(let i=0;i<cartItems.length;i++){

                totalPrice += cartItems[i].productId.price*cartItems[i].quantity;                                         
                if(cartItems[i].productId.offerPrice){
             totalDiscount += (cartItems[i].productId.price - cartItems[i].productId.offerPrice)*cartItems[i].quantity;
          
            }else{
                totalDiscount += 0
            }
            }
 
            res.json({
                status:true,
                data:{totalPrice,totalSingle,totalDiscount}
            })
        }else{
            res.json({status:false,
                data:'producut stock has been exceeded'})
        }
        
    } catch(error){
        next(error)
    }
}

const getWishlist = async(req,res,next)=>{
    try {
        
        const userId = req.session.user._id;
        const isLoggedIn = Boolean(req.session.user._id);
        const userData = await User.findById({_id:userId}).populate('wishlist');
        const wishlist = userData.wishlist;

        res.render('wishlist',{isLoggedIn,wishlist});
    } catch (error) {
        next(error)
    }

}


const addToWishlist = async(req,res,next)=>{
    try {
        const {productId} = req.params;
        const userId= req.session.user._id;
        
        const userData = await User.findById({_id: userId});
        
         if(!userData.wishlist.includes(productId)){
             userData.wishlist.push(productId);
             await userData.save();
             req.session.wishCount++;
         }
        let {returnPage} = req.query;
        if(returnPage=='shop'){
            res.redirect('/shop');
        }else if(returnPage=='productOverview'){
            res.redirect(`/shop/productOverview/${productId}`);
        }
    } catch (error) {
        next(error)
    }
}

const removeWishlist = async(req,res,next)=>{
    try {
        const {productId} = req.params;
        const userId = req.session.user._id;
        await User.findByIdAndUpdate({_id: userId},{
            $pull:{
                wishlist:productId
            }
        });
        req.session.wishCount--;
        const {returnPage} = req.query
        if(returnPage =='shop'){
            res.redirect('/shop');
        }else if(returnPage =='productOverview'){
            res.redirect(`/shop/productOverview/${productId}`);
        }else if(returnPage =='wishlist'){
            res.redirect('/wishlist');
        }
    } catch (error) {
        next(error)
    }
}

const getWalletHistory = async(req,res,next)=>{
    try {
        const userId = req.session.user._id;
        const userData  = await User.findById({_id: userId});
        const walletHistory = userData.walletHistory.reverse();
        res.render('walletHistory', {isLoggedIn:true,userData,walletHistory});
    } catch (error) {
        next(error)
    }
}

const addMoneyTowallet = async(req,res,next)=>{
    try {
        const amount = req.body.amount;
  
        const id = crypto.randomBytes(8).toString('hex');

        var options = {
            amount: amount*100,
            currency:'INR',
            receipt :"hello"+id
        }


        instance.orders.create(options,(err,order)=>{
            if(err){
            
                res.json({status:false})
            }else{
              
                res.json({status:true,order})
            }
        });
    } catch (error) {
        next(error);
    }
}

const verifyWalletPayment = async(req,res,next)=>{
    try {
        const userId = req.session.user._id;
        const details = req.body;
        const amount = parseInt(details.order.amount)/100;

        
        let hmac = crypto.createHmac('sha256',process.env.key_secret);
        hmac.update(details.response.razorpay_order_id+'|'+details.response.razorpay_payment_id)
        hmac = hmac.digest('hex');
    
        if(hmac === details.response.razorpay_signature){
            const walletHistory = {
                date:new Date(),
                amount,
                message:'Deposited via Razorpay'
            }
            await User.findByIdAndUpdate({_id:userId},{
                $inc:{wallet:amount},
                $push:{walletHistory}
            });
            res.json({status:true})
        }else{
            res.json({status:false})
        }
    } catch (error) {
        next(error)
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
    getShoppingCart,
    addToCart,
    removeCartItems,
    updateCart,
    getWishlist,
    addToWishlist,
    removeWishlist,
    getWalletHistory,
    getLoginForgetPassword,
    postLoginForgetPassword,
    postResentverifyOtp,
    addMoneyTowallet,
    verifyWalletPayment,
    getResendOtp,
    getForgotResendOTP,
    getChangePassword,
    postChangePassword
}