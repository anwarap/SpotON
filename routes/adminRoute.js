
const adminController = require('../controller/adminController');
const categoryController = require('../controller/categoryController');
const productController = require('../controller/productController');
const orderController = require('../controller/orderController');
const coupanController = require('../controller/couponController');
const offerController = require('../controller/offerController');
const express = require('express');
const upload = require('../config/multer')
const router =express();

const {isAdminLoggeedIn,isAdminLoggedOut}= require('../middleware/auth')
const session = require('express-session');


router.set('views','./views/admin');




router.get('/',isAdminLoggedOut,adminController.loadLogin)
router.post('/login',isAdminLoggedOut,adminController.postLogin);

router.post('/logout',adminController.logoutAdmin);

router.get('/dashboard',adminController.loadDashboard);

router.get('/users',adminController.loadUsers);
router.get('/users/status/:id',adminController.blockUser);

router.get('/categories',categoryController.loadCategories);
router.post('/categories',categoryController.addCategories);
router.post('/categories/edit',upload.single('categoryImage'),categoryController.editCategories);
router.get('/categories/status/:id',categoryController.getCategoryStatus);

router.get('/products',productController.loadProducts);
router.get('/products',productController.loadProducts);
router.get('/products/addProducts',productController.addProducts);
router.post('/products/addProducts',upload.array('productImage',3),productController.addProductsDetails);   
router.get('/products/editProduct/:id',productController.getEditProduct);
router.post('/products/editProduct',upload.array('productImage',3),productController.postEditProduct);
router.get('/products/deleteProduct/:id',productController.deleteProduct);
router.get('/products/imageDelete/:id',productController.deleteImage);

router.get('/orders',orderController.getOrders);
router.get('/ordersDetails/:orderId',orderController.getSingleOrderDetails);
router.post('/changeOrderStatus',orderController.getChangeOrderStatus);
router.get('/cancelOrder/:orderId',orderController.cancelOrder);
router.get('/cancelSinglePdt/:orderId/:pdtId',orderController.cancelSinglePdt);
router.get('/approveReturn/:orderId',orderController.approveReturn);
router.get('/approveReturnSinglePrdt/:orderId/:pdtId',orderController.approveReturnSinglepdt);

router.get('/coupons',coupanController.getCoupons);
router.get('/coupons/addCoupon',coupanController.getAddCoupon);
router.post('/coupons/addCoupon',coupanController.postAddCoupon);
router.get('/coupons/editCoupon/:couponId',coupanController.getEditCoupon);
router.post('/coupons/editCoupon/:couponId',coupanController.postEditCoupon);
router.get('/coupons/cancelCoupon/:couponId',coupanController.cancelCoupon);

router.get('/offers',offerController.getOffer);
router.get('/offers/addOffer',offerController.getAddOffer);
router.get('/offers/editOffer/:offerId',offerController.getEditOffer);
router.post('/offers/addOffer',offerController.postAddOffer);
router.post('/offers/editOffer/:offerId',offerController.postEditOffer);
router.get('/offers/cancelOffer/:offerId',offerController.getCancelOffer);
router.post('/applyOfferToCategory',categoryController.applyOfferToCategory);
router.post('/removeCategoryOffer/:catId',categoryController.removeCategoryOffer);
router.post('/applyOfferToProduct',productController.applyOfferToProduct);
router.post('/removeProductOffer/:productId',productController.removeProductOffer);

module.exports=router