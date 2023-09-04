
const adminController = require('../controller/adminController');
const categoryController = require('../controller/categoryController');
const productController = require('../controller/productController');
const express = require('express');
const upload = require('../config/multer')
const router =express();

const {isAdminLoggeedIn,isAdminLoggedOut}= require('../middleware/auth')
const session = require('express-session');


router.set('views','./views/admin');




router.get('/',isAdminLoggedOut,adminController.loadLogin)
router.post('/login',isAdminLoggedOut,adminController.postLogin);

router.post('/logout',isAdminLoggeedIn ,adminController.logoutAdmin);

router.get('/dashboard',isAdminLoggeedIn,adminController.loadDashboard);

router.get('/users',isAdminLoggeedIn,adminController.loadUsers);
router.get('/users/status/:id',isAdminLoggeedIn ,adminController.blockUser);

router.get('/categories',isAdminLoggeedIn ,categoryController.loadCategories);
router.post('/categories',isAdminLoggeedIn ,categoryController.addCategories);
router.post('/categories/edit',isAdminLoggeedIn ,upload.single('categoryImage'),categoryController.editCategories);
router.get('/categories/status/:id',isAdminLoggeedIn ,categoryController.getCategoryStatus);

router.get('/products',isAdminLoggeedIn ,productController.loadProducts);
router.get('/products',isAdminLoggeedIn ,productController.loadProducts);
router.get('/products/addProducts',isAdminLoggeedIn ,productController.addProducts);
router.post('/products/addProducts',upload.array('productImage',3),isAdminLoggeedIn ,productController.addProductsDetails);   
router.get('/products/editProduct/:id',isAdminLoggeedIn ,productController.getEditProduct);
router.post('/products/editProduct',upload.array('productImage',3),isAdminLoggeedIn ,productController.postEditProduct);
router.get('/products/deleteProduct/:id',isAdminLoggeedIn ,productController.deleteProduct);

router.get('/products/imageDelete/:id',isAdminLoggeedIn ,productController.deleteImage);






module.exports=router