const express = require('express');
const userController =require('../controller/userController');
const productController = require('../controller/productController');
const addressController = require('../controller/addressController');

const router =express();
// const path =require('path');


// const session = require('express-session');
// const {randomUUID} = require('crypto');

// router.use(session(
//     {secret:randomUUID(),
//     resave:false,
//     saveUninitialized:false}
// ));


// router.set('view engine', 'ejs');
router.set('views','./views/user');

router.get('/',userController.loadHome);



router.get('/login',userController.loadLogin);
router.post('/login',userController.postLogin);

router.get('/logout',userController.loadLogout)

router.get('/signup',userController.loadSignup);
router.post('/signup',userController.postSignup);

router.post('/otpverify',userController.postOTPVerify);

router.get('/shop',productController.getShop);
router.get('/shop/productOverview/:id',productController.getProductOverview);

router.get('/profile',userController.getProfile);

router.post('/profile/editProfile',userController.postEditProfile);

router.get('/profile/changePassword',userController.getChangePassword);
router.post('/profile/changePassword',userController.postChangePassword);

// router.get('/shoppingCart',userController.getShoppingCart);

module.exports = router;