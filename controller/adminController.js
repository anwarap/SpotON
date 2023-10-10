const Admin =require('../models/adminModels');
const User = require('../models/userModel');
const bcrypt = require('bcrypt');






const loadLogin = async (req,res,next)=>{
    try {
        res.render('login',{title:'Admin Login'});
        
    } catch (error) {
        next(error)
    }
}


const postLogin = async (req,res,next)=>{
    try {
        const {email,password} = req.body;     
        const adminData = await Admin.findOne({email});

        if(adminData){
            const passwordMatch = await bcrypt.compare(password,adminData.password);
            if(passwordMatch){
                req.session.admin = adminData
                res.redirect('/admin/dashboard');
            }else{
                req.app.locals.message ='Incorrect password'
                res.redirect('/admin');
            }
        }else{
            req.app.locals.message ='Incorrect email'
            res.redirect('/admin');
        }
    } catch (error) {
        next(error)
    }
}

const loadDashboard = async(req,res,next)=>{
    try {
        res.render('dashboard',{page:'Dashboard'})
    } catch (error) {
        next(error)
    }
}


const loadUsers = async(req,res,next)=>{
    try {
        const userData = await User.find({});
        res.render('users',{userData, page:'Users'});
    } catch (error) {
        next(error)
    }
}

const blockUser = async(req,res,next)=>{
    try{
        const userid = req.params.id;
        const userData = await User.findById({_id:userid});

        if(userData){
            if(userData.status === true){
                await User.findByIdAndUpdate({_id:userid},{$set:{status:false}})
            }else{
                await User.findByIdAndUpdate({_id:userid},{$set:{status: true}})
            }
        }
        res.redirect('/admin/users');
    } catch(error){
        next(error)
    }
}


const logoutAdmin = async(req,res,next)=>{
    try{
        req.session.destroy();       
        res.redirect('/admin');
    } catch(error){
        next(error)
    }
}



module.exports={
    loadLogin,
    postLogin,
    loadUsers,
    loadDashboard,
    blockUser,
    logoutAdmin
}