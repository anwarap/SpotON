const  User = require('../models/userModel');

const isUserLoggedIn = async(req,res,next)=>{
    try{
        if(req.session.user){
            next()
        }else{
            
            return res.redirect('/login');
        }
    } catch(error){
        next(error);
    }
}

const isUserLoggedOut = async(req,res,next)=>{
    try{
        if(req.session.user){
            return res.redirect('/');
        }
        next();
    } catch(error){
        next(error);
    }
}


const isUserBlocked = async(req,res,next)=>{
    try{
        if(req.session.user._id){
            const userData  = await User.findById({_id:req.session.userId});
            let isUserBlocked = userData.isBlocked
            if(isUserBlocked){
                req.session.destroy();
                
                return res.redirect('/login');
            }
        }
        next();
    } catch(error){
        next(error);
    }
}


const isAdminLoggeedIn = async(req,res,next)=>{
    try{
        if(req.session.admin){
            next();
        }else{

            return res.redirect('/admin');
        }
    } catch(error){
        next(error);
    }
}

const isAdminLoggedOut = async(req,res,next)=>{
    try {
        if(req.session.admin){
            
            return res.redirect('/admin/dashboard');
        }
        
        next();
    } catch (error) {
        next(error);
    }
}


module.exports ={
    isUserLoggedIn,
    isAdminLoggeedIn,
    isUserBlocked,
    isUserLoggedOut,
    isAdminLoggedOut
}