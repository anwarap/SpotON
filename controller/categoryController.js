const Categories = require('../models/categoryModels');
const Products = require('../models/productModels');
const Offers = require('../models/offerModels');


const loadCategories = async(req,res,next)=>{
    try{
        var categoryMessage = req.app.locals.specialContext;
        req.app.locals.specialContext = null; 
        const categories = await Categories.find({}).populate('offer')
        const offerData = await Offers.find({$or:[
            {status:'Starting Soon'},
            {status:'Available'}
        ]})
        req.session.save();
        res.render('categories',{categories,title:'Categories',page:'Categories',categoryMessage,offerData})
    } catch(error){
        next(error)
    }
}

const addCategories = async(req,res,next)=>{
    try {
        const categoryName = req.body.categoryName.toUpperCase();
        if(categoryName){
            const isExistCategory = await Categories.findOne({name:categoryName});
            
            if(isExistCategory){
                console.log('category already exists');
                req.app.locals.specialContext = 'Category already exists';
                res.redirect('/admin/categories');
            }else{
                await new Categories({name:categoryName}).save();
                req.app.locals.specialContext = 'Category added successfully';
                res.redirect('/admin/categories');
            }
        }else{
            console.log('enter category name');
            req.app.locals.specialContext = 'Not entered any Category Name'
            res.redirect('/admin/categories')
        }
    } catch (error) {
        next(error)
    }
}

const editCategories = async(req,res,next)=>{
    try {
       const id = req.body.categoryId;
       const newName = req.body.categoryName.toUpperCase();

       const isCategoryExist = await Categories.findOne({name:newName});

       if(req.file){
        const image= req.file.filename;
        if(!isCategoryExist || isCategoryExist._id === id){
            await Categories.findByIdAndUpdate({_id:id},{$set:{name:newName,image:image}})
        }
       }else{
        if(!isCategoryExist){
            await Categories.findByIdAndUpdate({_id:id},{$set:{name:newName}})
        }
    }
    res.redirect('/admin/categories')
    }catch (error) {
        next(error)
    }

}


const getCategoryStatus = async(req,res,next)=>{
    try {
        const id = req.params.id;
        const categoryData  = await Categories.findById({_id:id});

        if(categoryData){
            if(categoryData.isListed === true){

                await Categories.findByIdAndUpdate({_id: id},{$set:{isListed:false}})

            }else{
                await Categories.findByIdAndUpdate({_id: id},{$set:{isListed:true}})
            }
            res.redirect('/admin/categories')
        }
    } catch (error) {
        next(error)
    }
}

const applyOfferToCategory = async(req,res,next) =>{
    try {
        const {offerId, categoryId ,override} = req.body;

        await Categories.findByIdAndUpdate({_id:categoryId},{
            $set:{offer:offerId}
        })
        const offerData = await Offers.findById({_id:offerId});
        const products = await Products.find({category:categoryId});

        for(const pdt of products){
            const actualPrice = pdt.price;
            // console.log(actualPrice+'actualPrice');
            let offerPrice = 0;
            if(offerData.status == 'Available'){
                offerPrice = Math.round(actualPrice - ((actualPrice*offerData.discount)/100))
            }
            if(override){
                await Products.updateOne({_id:pdt._id},{
                    $set:{
                        offerPrice,
                        offertype: 'Offers',
                        offer:offerId,
                        offerAppliedBy:'Category'
                    }
                })
            }else{
                await Products.updateOne({_id:pdt._id,offer:{$exists:false}},{
                    $set:{
                        offerPrice,
                        offerType: 'Offers',
                        offer:offerId,
                        offerAppliedBy:'Category'
                    }
                })
            }
        }
        res.redirect('/admin/categories')
    } catch (error) {
        next(error)
    }
}

const removeCategoryOffer = async(req,res,next)=>{
    try {
        const {catId} = req.params;
        await Categories.findByIdAndUpdate({_id: catId},{
            $unset:{offer:''}
        });
        await Products.updateMany({
            category:catId,
            offerAppliedBy:'Category'
        },{
            $unset:{
                offer:'',
                offerType:'',
                offerPrice:'',
                offerAppliedBy:''
            }
        });
        res.redirect('/admin/Categories')
    } catch (error) {
        next(error)
    }
}


module.exports ={
    loadCategories,
    addCategories,
    getCategoryStatus,
    editCategories,
    applyOfferToCategory,
    removeCategoryOffer
}