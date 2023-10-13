const express = require('express');
const userController =require('../controller/userController');
const productController = require('../controller/productController');
const addressController = require('../controller/addressController');
const orderController = require('../controller/orderController');
const couponController = require('../controller/couponController');
const {isUserLoggedIn, isUserLoggedOut ,isUserBlocked} = require('../middleware/auth')
const router =express();

router.set('views','./views/user');

router.get('/',userController.loadHome);



router.get('/login', isUserLoggedOut,userController.loadLogin);
router.post('/login', isUserLoggedOut,userController.postLogin);
router.get('/forgotpassword',userController.getLoginForgetPassword);
router.post('/login-resetpassword',userController.postLoginForgetPassword);
router.post('/resetPassword-verifyotp',userController.postResentverifyOtp);
router.get('/resend-otp',userController.getResendOtp);


router.get('/logout',userController.loadLogout)

router.get('/signup', isUserLoggedOut,userController.loadSignup);
router.post('/signup', isUserLoggedOut,userController.postSignup);

router.post('/otpverify', isUserLoggedOut,userController.postOTPVerify);

router.get('/shop',productController.getShop);
router.get('/shop/productOverview/:id',productController.getProductOverview);

router.get('/profile',userController.getProfile);
router.post('/profile/editProfile',userController.postEditProfile);
router.get('/profile/addAddress',addressController.getAddAddress);
router.post('/profile/addAddress/:returnPage',addressController.postAddAddress);
router.get('/profile/editAddress/:id',addressController.getEditAddress);
router.post('/profile/editAdress/:id',addressController.postEditAddress);
router.get('/profile/deleteAddress/:id',addressController.deleteAddress);

router.get('/profile/changePassword',userController.getChangePassword);
router.post('/profile/changePassword',userController.postChangePassword);



router.get('/shoppingCart',userController.getShoppingCart);
router.get('/shop/addToCart/:id',userController.addToCart);
router.post('/shoppingCart/removeItems/:id',userController.removeCartItems);
router.put('/updateCart',userController.updateCart);
router.get('/shoppingCart/toCheckout',orderController.getCheckout);
router.post('/shoppingCart/placeOrder',orderController.placeOrder);
router.get('/orderSuccess',orderController.getOrderSuccess);
router.post('/verifyPayment',orderController.verifyPayment);

router.get('/wishlist',userController.getWishlist);
router.get('/addToWishlist/:productId',userController.addToWishlist);
router.get('/removeWishlist/:productId',userController.removeWishlist);

router.get('/profile/myOrder',orderController.getMyOrder);
router.get('/viewOrderDetails/:orderId',orderController.getOrderDetails)
router.get('/cancelOrder/:orderId',orderController.cancelOrder);
router.get('/cancelSinglePdt/:orderId/:pdtId',orderController.cancelSinglePdt);
router.post('/returnOrder/:orderId',orderController.returnOrder);
router.post('/returnSingleprdt/:orderId/:pdtId',orderController.returnSinglePdt);
router.get('/downloadInvoice/:orderId',orderController.getInvoice);

router.get('/profile/walletHistory',userController.getWalletHistory);
router.post('/profile/addMoneyTowallet',userController.addMoneyTowallet);
router.post('/verifyWalletPayment',userController.verifyWalletPayment);

router.post('/applyCoupon',couponController.applyCoupon);
router.get('/removeCoupon',couponController.removeCoupon);

module.exports = router;