const fs = require('fs');
const path = require('path');
const Banners = require('../models/bannerModels');

const loadBannerList = async(req, res, next) => {
    try {

        const bannerLimit = 3;
        const banners = await Banners.find({})
        res.render('banner',{page:'Banners', banners, bannerLimit})
    } catch (error) {
        next(error)
    }
}

const addBanner = async(req, res, next) => {
    try {
        const { heading, url } = req.body;
        const image = req.file.filename

        await new Banners({
            heading, url, image
        }).save();

        res.redirect('/admin/banners')
        
    } catch (error) {
        next(error)
    }
}

const UpdateBanner = async(req, res, next) => {
    try {

        const bannerId = req.params.bannerId
        const { heading, url } = req.body;

        let image = false;
        if(req.file){
            image = req.file.filename
        }

        if(image){

            const bannerData = await Banners.findById({_id: bannerId})

            fs.unlink(path.join(__dirname,'../public/assets/images/bannerImages/', bannerData.image), (err) => {
                if(err){
                    console.log('Error during unlinking banner',err);
                    next(err);
                }
            });

            console.log('unlinked');

            await Banners.findByIdAndUpdate(
                {_id: bannerId},
                {
                    $set:{
                        heading, image , url
                    }
                }    
            );

        }else{
            
            await Banners.findByIdAndUpdate(
                {_id: bannerId},
                {
                    $set:{
                        heading, url
                    }
                }    
            );
        }

        res.redirect('/admin/banners');

    } catch (error) {
        next(error)
    }
}






module.exports = {
    loadBannerList,
    addBanner,
    UpdateBanner,
    
}