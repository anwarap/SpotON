const Admin =require('../models/adminModels');
const User = require('../models/userModel');
const bcrypt = require('bcrypt');






const loadLogin = async (req,res)=>{
    try {
        res.render('login',{title:'Admin Login'});
        
    } catch (error) {
        console.log(error.message);
    }
}


const postLogin = async (req,res)=>{
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
        console.log(error.message);
    }
}

const loadDashboard = async(req,res)=>{
    try {
        res.render('dashboard',{page:'Dashboard'})
    } catch (error) {
        console.log(error.message);
    }
}


const loadUsers = async(req,res)=>{
    try {
        const userData = await User.find({});
        res.render('users',{userData, page:'Users'});
    } catch (error) {
        console.log(error.message);
    }
}

const blockUser = async(req,res)=>{
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
        console.log(error.message);
    }
}


const logoutAdmin = async(req,res)=>{
    try{
        req.session.destroy();       
        res.redirect('/admin');
    } catch(error){
        console.log(error.message);
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