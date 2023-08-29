const Categories = require('../models/categoryModels');

const loadCategories = async(req,res)=>{
    try{

        const categories = await Categories.find({});
        req.session.save();
        res.render('categories',{categories,title:'Categories',page:'Categories'})
    } catch(error){
        console.log(error.message);
    }
}

const addCategories = async(req,res)=>{
    try {
        const categoryName = req.body.categoryName.toUpperCase();
        if(categoryName){
            const isExistCategory = await Categories.findOne({name:categoryName});
            
            if(isExistCategory){
                console.log('category already exists');
                res.redirect('/admin/categories');
            }else{
                await new Categories({name:categoryName}).save();
                res.redirect('/admin/categories');
            }
        }else{
            console.log('enter category name');
            res.redirect('/admin/categories')
        }
    } catch (error) {
        console.log(error.message);
    }
}

const editCategories = async(req,res)=>{
    try {
       const id = req.body.categoryId;
       const newName = req.body.categoryName.toUpperCase();
    
        console.log(newName);

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
        console.log(error.messsage);
    }

}


const getCategoryStatus = async(req,res)=>{
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
        console.log(error.message);
    }
}


module.exports ={
    loadCategories,
    addCategories,
    getCategoryStatus,
    editCategories
}