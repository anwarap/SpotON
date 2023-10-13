
const Products = require('../models/productModels');
const Categories = require('../models/categoryModels');
const User = require('../models/userModel');
const Offers = require('../models/offerModels');

const fs =require('fs');
const path = require('path');
const { log } = require('console');
const { request } = require('http');


const loadProducts = async(req,res,next)=>{
    try {
        const pdtsData = await Products.find().populate('category').populate('offer');
        const offerData = await Offers.find({$or:[
            {status: 'Starting Soon'},
            {status: 'Available'}
        ]})
        res.render('products',{pdtsData,page:'Products',offerData});
    } catch (error) {
        next(error)
    }
}


const addProducts = async(req,res,next)=>{
    try {
        const categories = await Categories.find({isListed:true})
        res.render('addProducts',{categories,page:'Products'})
    } catch (error) {
        next(error)
    }
}

const addProductsDetails = async(req,res,next)=>{
    try {
        const {
            productName,category,
            quantity,price,description
        } = req.body;
        const brand = req.body.brand.toUpperCase();
        let image = [];
        for(let file of req.files){
            image.push(file.filename);
        }

        const catData  =await Categories.find({name:category});

        const pdtsData = await new Products({
            brand,name:productName,description,category:catData[0]._id,
            price,quantity,images:image,createdAt:new Date()
        }).save()
        res.redirect('/admin/products');
    } catch (error) {
        next(error)
    }
}

const getEditProduct = async(req,res,next)=>{
    try {
        const id = req.params.id;
        const pdtData = await Products.findById({_id:id}).populate('category');
        const catData = await Categories.find({isListed:true});
        res.render('editProduct',{pdtData,catData,page:'Products'})
    } catch (error) {
        next(error)
    }
}     

const postEditProduct = async(req,res,next)=>{
    try {
        const {
            id,productName,category,quantity,price,description
        } = req.body;

        const brand = req.body.brand.toUpperCase();
        
        if(req.files){
            let newImages = [];
            for(let file of req.files){
                newImages.push(file.filename);
            }
            await Products.findOneAndUpdate({_id:id},{$push:{images:{$each:newImages}}})
        }
        const catData = await Categories.findOne({name:category})
        await Products.findByIdAndUpdate({_id:id},
            {$set:{brand,name:productName,category:catData._id,quantity,description,price}});
            res.redirect('/admin/products')
    } catch (error) {
        next(error)
    }
}

const deleteProduct = async(req,res,next)=>{
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
        next(error)
    }
}

const deleteImage  =async(req,res,next)=>{
    try{
        const id = req.params.id;
        const imageURL = req.query.imageURL;   
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
        next(error)
    }
}


const getShop = async(req,res,next)=>{
    try {
        const isLoggedIn = Boolean(req.session.user)
        let page =1;
        if(req.query.page){
            page = req.query.page;
        }
        let limit = 9;

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
            sortValue = req.query.sortValue;
        }
        let pdtsData;
        if(sortValue == 1){
            pdtsData = await Products.find(query).populate('category').populate('offer').sort({createdAt:-1}).limit(limit*1).skip((page - 1)*limit);
            // console.log(pdtsData+'pdtsData');
        }else{
            pdtsData = await Products.find(query).populate('category').populate('offer');
            pdtsData.forEach((pdt)=>{
                // console.log(pdt.offerPrice+'pddd');
                if(pdt.offerPrice){
                    pdt.actualPrice = pdt.offerPrice
                }else{
                    pdt.actualPrice =pdt.price;
                }
            })
            if(sortValue == 2){
                pdtsData.sort((a,b)=>{
                    return a.actualPrice - b.actualPrice
                })
            }else if(sortValue ==3){
                pdtsData.sort((a,b)=>{
                    return b.actualPrice - a.actualPrice
                })
            }
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
        if(req.session.user._id){
            userData = await User.findById({_id:req.session.user._id});
            wishlist = userData.wishlist;
            cart = userData.cart.map(item => item.productId.toString());
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
        next(error)
    }
}


const getProductOverview = async(req,res,next)=>{
    try {
        const id = req.params.id;
        const user= req.session.user;
        const isLoggedIn = Boolean(req.session.user)
        const pdtData = await Products.findById({_id:id});

        let isPdtAWish = false;
        if(user) {
            const userData = await User.findById({_id:user._id});
            const wishlist = userData.wishlist;
            if(wishlist.find((productId)=>productId == id)){
                isPdtAWish = true;
            }
        }
        let currPrice =0;
        if(pdtData.offer){
            currPrice = pdtData.offerPrice;
        }else{
            currPrice = pdtData.price;
        }

        const discountPercentage = Math.floor( 100 - ( (currPrice*100) / pdtData.price ) )

        res.render('productOverview',{
            pdtData,
            page:'Product Overview',
            isPdtAWish,
            isLoggedIn,
            currPrice,
             discountPercentage
        })
    } catch(error){
        next(error)
    }
}

const applyOfferToProduct = async(req,res,next)=>{
    try {
        const {offerId,productId} = req.body;
        const product = await Products.findById({_id:productId});
        const offerData = await Offers.findById({_id:offerId});
        const actualPrice = product.price;
        // console.log(product+'products');
        // console.log(actualPrice+'acp');
        let offerPrice  =0;
        if(offerData.status == 'Available'){
            offerPrice =Math.round(actualPrice -((actualPrice*offerData.discount)/100));
            // console.log(offerPrice+'apply');
        }
        await Products.findByIdAndUpdate({_id:productId},{
            $set:{
                offerPrice:offerPrice,
                offerType:'Offers',
                offer:offerId,
                offerAppliedBy:'Product'
            }
        })
        res.redirect('/admin/products')
    } catch (error) {
        next(error)
    }
}

const removeProductOffer = async(req,res,next)=>{
   try {
    const {productId} = req.params
    await Products.findByIdAndUpdate({_id: productId},{
        $unset:{
            offer:'',
            offerType:'',
            offerPrice:'',
            offerAppliedBy:''
        }
    });
    res.redirect('/admin/products');
   } catch (error) {
    next(error)
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
    getProductOverview,
    applyOfferToProduct,
    removeProductOffer

}

