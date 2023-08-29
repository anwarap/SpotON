
const adminController = require('../controller/adminController');
const categoryController = require('../controller/categoryController');
const productController = require('../controller/productController');
const express = require('express');
const upload = require('../config/multer')
const router =express();


const session = require('express-session');
const {randomUUID}=require('crypto');

router.use(express.json());
router.use(express.urlencoded({extended: true}));

router.set('view engine','ejs');
router.set('views','./views/admin');

router.use(session({
    secret:randomUUID(),
    resave:false,
    saveUninitialized:true
}))


router.get('/login',adminController.loadLogin)
router.post('/login',adminController.postLogin);

router.post('/logout',adminController.logoutAdmin);

router.get('/dashboard',adminController.loadDashboard);

router.get('/users',adminController.loadUsers);
router.get('/users/status/:id',adminController.blockUser);

router.get('/categories',categoryController.loadCategories);
router.post('/categories',categoryController.addCategories);
router.post('/categories/edit',upload.single('categoryImage'),categoryController.editCategories);
router.get('/categories/status/:id',categoryController.getCategoryStatus);

router.get('/products',productController.loadProducts);
router.get('/products/addProducts',productController.addProducts);
router.post('/products/addProducts',upload.array('productImage',3),productController.addProductsDetails);   
router.get('/products/editProduct/:id',productController.getEditProduct);
router.post('/products/editProduct',upload.array('productImage',3),productController.postEditProduct);
router.get('/products/deleteProduct/:id',productController.deleteProduct);

router.get('/products/imageDelete/:id',productController.deleteImage);






module.exports=router