
const Products = require('../models/productModels');
const Categories = require('../models/categoryModels');
const User = require('../models/userModel');

const fs =require('fs');
const path = require('path');
const { log } = require('console');
const { request } = require('http');


const loadProducts = async(req,res)=>{
    try {
        const pdtsData = await Products.find().populate('category')
        // console.log(pdtsData);
        res.render('products',{pdtsData,page:'Products'})
    } catch (error) {
        console.log(error.message);
    }
}


const addProducts = async(req,res)=>{
    try {
        const categories = await Categories.find({isListed:true})
        res.render('addProducts',{categories,page:'Products'})
    } catch (error) {
        console.log(error.message);
    }
}

const addProductsDetails = async(req,res)=>{
    try {
        const {
            brand,productName,category,
            quantity,price,description
        } = req.body;

        let image = [];
        // console.log(req.files);
        for(let file of req.files){
            image.push(file.filename);
        }

        const catData  =await Categories.find({name:category});

        console.log(catData);

        const pdtsData = await new Products({
            brand,name:productName,description,category:catData[0]._id,
            price,quantity,images:image,createdAt:new Date()
        }).save()
        res.redirect('/admin/products');
    } catch (error) {
        console.log(error.message);
    }
}

const getEditProduct = async(req,res)=>{
    try {
        const id = req.params.id;
        // console.log(id);
        const pdtData = await Products.findById({_id:id}).populate('category');
        const catData = await Categories.find({isListed:true});
        // console.log(pdtData);
        res.render('editProduct',{pdtData,catData,page:'Products'})
    } catch (error) {
        console.log(error.message);
    }
}     

const postEditProduct = async(req,res)=>{
    try {
        const {
            id,productName,category,quantity,price,description
        } = req.body;
        console.log('category  ' + category);

        const brand = req.body.brand.toUpperCase();
        
        if(req.files){
            let newImages = [];
            for(let file of req.files){
                newImages.push(file.filename);
            }
            await Products.findOneAndUpdate({_id:id},{$push:{images:{$each:newImages}}})
        }
        console.log(category);
        const catData = await Categories.findOne({name:category})
        // console.log(`id: ${id}`);
        // console.log(catData);
        await Products.findByIdAndUpdate({_id:id},
            {$set:{brand,name:productName,category:catData._id,quantity,description,price}});
            // console.log('aaaa');
            res.redirect('/admin/products')
    } catch (error) {
        console.log(error.message);
    }
}

const deleteProduct = async(req,res)=>{
    try{
        const id = req.params.id;
        const prodData = await Products.findById({_id:id});
        if(prodData.isListed){
            await Products.findByIdAndUpdate({_id:id},{$set:{isListed:false}});

        }else{
            await Products.findByIdAndUpdate({_id:id},{$set:{isListed:true}});
        }
        res.redirect('/admin/products');
    } catch(error) {
        console.log(error.message);
    }
}

const deleteImage  =async(req,res)=>{
    try{
        const id = req.params.id;
        const imageURL = req.query.imageURL;   
        // console.log(imageURL);

        await Products.findOneAndUpdate({_id:id},{$pull:{images:imageURL}});

        const imgFolder = path.join(__dirname,'../public/assets/images/productImages');
        const files =fs.readdirSync(imgFolder);

        for(const file of files){
            if(file === imageURL){
                const filePath = path.join(imgFolder,file);
                fs.unlinkSync(filePath);
                break;

            }
        }
        res.redirect(`/admin/products/editProduct/${id}`)
    } catch (error){
        console.log(error.message);
    }
}


const getShop = async(req,res)=>{
    try {
        const isLoggedIn = Boolean(req.session.userId);
        let page =1;
        if(req.query.page){
            page = req.query.page;
        }
        let limit = 6;

        let minPrice =1;
        let maxPrice  =Number.MAX_VALUE;

        if(req.query.minPrice && parseInt(req.query.minPrice)){
            minPrice  =parseInt(req.query.minPrice);
        }
        if(req.query.maxPrice && parseInt(req.query.maxPrice)){
            maxPrice  =parseInt(req.query.maxPrice);
        }

        let search = '';
        if(req.query.search){
            search  = req.query.search;
        }

        async function getcategoryIds(search){
            const categories = await Categories.find(
                {
                    name:{
                        $regex:'.*' +search+'.*',
                        $options:'i'
                    }
                }
            );
            return categories.map(category =>category._id)
        }

        const query = {
            isListed:true,
            $or:[
                {
                    name:{
                        $regex:'.*' +search+'.*',
                        $options:'i'
                    }
                },
                {
                    brand:{
                        $regex:'.*' +search+'.*',
                        $options:'i'
                    }
                }
            ],
            price:{
                $gte:minPrice,
                $lte:maxPrice
            }
        }

        if(req.query.search){
            search = req.query.search;
            query.$or.push({
                'category':{
                    $in:await getcategoryIds(search)
                }
            })
        };

        if(req.query.category){
            query.category = req.query.category;
        }

        if(req.query.brand){
            query.brand = req.query.brand;
        };

        let sortValue  =1;
        if(req.query.sortValue){

        }
        let pdtsData;
        if(sortValue == 1){
            pdtsData = await Products.find(query).populate('category').sort({createdAt:-1}).limit(limit*1).skip((page - 1)*limit);

        }else{
            pdtsData = await Products.find(query).poppulate('category');

            pdtsData = pdtsData.slice((page - 1)*limit,page *limit);
        }

        const categoryNames = await Categories.find({});
        const brands = await Products.aggregate([{
            $group:{
                _id :'$brand'
            }
        }]);

        let totalProductsCount = await Products.find(query).count()
        let pageCount = Math.ceil(totalProductsCount / limit);

        let removeFilter  ='false'
        if(req.query && !req.query.page){
            removeFilter  ='true'
        };

        let userData;
        let wishlist;
        let cart;
        if(req.session.userId){
            userData = await User.findById({_id:req.session.userId});
            wishlist = userData.wishlist;
            cart = userData.cart.map(item => item.produstId.toString());
        }
        res.render('shop',{
            pdtsData,
            userId:req.session.userId,
            categoryNames,
            brands,
            pageCount,
            currentPage: page,
            sortValue,
            category: req.query.category,
            minPrice:req.query.minPrice,
            maxPrice:req.query.maxPrice,
            brand:req.query.brand,
            search:req.query.search,
            removeFilter,
            wishlist,
            cart,
            isLoggedIn,
            page:'Shop'
        })
    } catch (error) {
        console.log(error.message);
    }
}


const getProductOverview = async(req,res)=>{
    try {
        const id = req.params.id;
        const userId = req.session.userId;
        const pdtData = await Products.findById({_id:id});
// console.log(pdtData.images);
        if(userId) {
            const userData = await User.findById({_id:userId});
        }
        res.render('productOverview',{
            pdtData,
            page:'Product Overview'
        })
    } catch(error){
        console.log(error.message);
    }
}


module.exports = {
    loadProducts,
    addProducts,
    addProductsDetails,
    getEditProduct,
    postEditProduct,
    deleteProduct,
    deleteImage,
    getShop,
    getProductOverview

}

