 const Addresses = require('../models/addressModels');
 const User = require('../models/userModel');

 const getAddAddress = async(req,res)=>{
    try {
        const user = req.session.user;
        const returnPage = req.query.returnPage;
        res.render('addAddress',{isLoggedIn:true,returnPage:returnPage});
    } catch (error) {
        console.log(error.message);
    }
 }

const postAddAddress = async(req,res)=>{
    try {
        const user = req.session.user;
        
        const {name,email,mobile,town,state,country,zip,address} =req.body;
        const returnPage  = req.params.returnPage;
        const newAddress = {userName:name,email,mobile,town,state,country,zip,address};
        const isUserHasAddress = await Addresses.findOne({_id:user._id});

        if(isUserHasAddress) {
            await Addresses.updateOne({_id:user._id},
                {$addToSet:{addresses:newAddress}})

                switch(returnPage){
                    case'profile':
                    res.redirect('/profile')
                    break;
                    case'checkout':
                    res.redirect('/shoppingCart/toCheckout');
                }
        }else{
            await new Addresses({
                _id: user._id,
                addresses:[newAddress]
            }).save()
            switch(returnPage){
                case'profile':
                res.redirect('/profile')
                break;
            }
        }

    } catch (error) {
        console.log(error.message);
    }
}

const getEditAddress = async(req,res)=>{
    try{
        const addressId = req.params.id;
        const userId = req.session.user._id;
        const {returnPage} = req.query;

        const addressData = await Addresses.findOne({_id:userId,'addresses._id':addressId});
        
        const address =  addressData.addresses.find(obj => obj._id.toString() === addressId);
        res.render('editAddress',{address,isLoggedIn:true,returnPage})
    } catch(error){
        console.log(error.message);
    }
}

const postEditAddress = async(req,res)=>{
    try {
        const addressId = req.params.id;
        const userId = req.session.user._id;
        const {name,email,mobile,town,state,country,zip,address} = req.body;
        const {returnPage} = req.query;
        await Addresses.updateOne({_id:userId,'addresses._id':addressId},
        {$set:{
            'addresses.$.userName':name,
            'addresses.$.email': email,
            'addresses.$.mobile': mobile,
            'addresses.$.town': town,
            'addresses.$.state': state,
            'addresses.$.country': country,
            'addresses.$.zip': zip,
            'addresses.$.address': address
        }})
        if(returnPage === 'profile'){
            res.redirect('/profile')
        }else if(returnPage === 'checkout'){
            res.redirect('/shoppingCart/toCheckout')
        }
    } catch (error) {
        console.log(error.message);
    }
}

const deleteAddress = async(req, res) => {
    try {
        const addressId = req.params.id;
        const userId = req.session.user._id;

        await Addresses.updateOne({_id:userId,'addresses._id':addressId},
        {
            $pull:{addresses:{_id:addressId}}
        })
        res.redirect('/profile')
    } catch (error) {
        console.log(error.message);
    }
}

 module.exports ={
    getAddAddress,
    postAddAddress,
    getEditAddress,
    postEditAddress,
    deleteAddress
 }