const Offers = require('../models/offerModels');

const getOffer = async(req,res,next)=>{
    try {
        const offers  = await Offers.find({});
        res.render('offers',{offers});
    } catch (error) {
        next(error);
    }
}

const getAddOffer = async(req,res,next)=>{
    try {
        res.render('addOffer');
    } catch (error) {
        next(error);
    }
}

const getEditOffer = async(req,res,next)=>{
    try {
        const offerId = req.params.offerId;
        const offerData  =await Offers.findById({_id:offerId});
        res.render('editOffer',{offerData});
    } catch (error) {
        next(error);
    }
}

const postAddOffer  =async(req,res,next)=>{
    try {
        const {discount,startingDate,expiryDate}  = req.body;
        const name = req.body.name.toUpperCase();
        const  isOfferExists = await Offers.findOne({name});

        if(isOfferExists){
            return res.redirect('/admin/offers/addOffer')
        }
        if(new Date(startingDate)>= new Date(expiryDate) || new Date(expiryDate)< new Date()){
            return res.redirect('/admin/offers/addOffer')
        }
        let status;
        if(new Date(startingDate)<=new Date()){
            status = 'Available'
        }else if(new Date(startingDate)> new Date()){
            status = 'Starting Soon'
        }
        await new Offers({name , discount, startingDate,expiryDate, status}).save();
        res.redirect('/admin/offers');

    } catch (error) {
        next(error);
    }
}

const postEditOffer = async(req,res,next) => {
    try {
        const offerId = req.params.offerId;
        const {discount,startingDate,expiryDate} = req.body;
        const name = req.body.name.toUpperCase();
        const isOfferExists = await Offers.findOne({name});

        if(isOfferExists && isOfferExists._id !=offerId){
            return res.redirect(`/admin/editOffer/${offerId}`)
        }
        if(new Date(startingDate)>= new Date(expiryDate) || new Date(expiryDate) < new Date()){
            return res.redirect(`/admin/editOffer/${offerId}`)
        }

        let status;
        if(new Date(startingDate)<= new Date()){
            status = 'Available'
        }else if (new Date(startingDate)> new Date()){
            status = 'Starting Soon'
        }

        await Offers.findByIdAndUpdate({_id: offerId},{
            $set:{name,discount,startingDate,expiryDate,status}
        })
        res.redirect('/admin/offers')

    } catch (error) {
        next(error);
    }
}

const getCancelOffer = async(req,res,next)=>{
    try {
        const offerId = req.params.offerId;
        const offerData = await Offers.findById({_id: offerId});

        if(offerData.status === 'Cancelled'){
            const startingDate = offerData.startingDate;
            const expiryDate = offerData.expiryDate;

            if(new Date(expiryDate) < new Date()){
                return res.redirect('/admin/offers');
            }

            let status;
            if(new Date(startingDate) <= new Date()){
                status = 'Available';
            }else if(new Date(startingDate)> new Date()){
                status = 'Starting Soon';
            }

            await Offers.findByIdAndUpdate({_id:offerId},{
                $set:{status}
            })
        }else{
            await Offers.findByIdAndUpdate({_id:offerId},{
                $set:{status:'Cancelled'}
            })
        }
        res.redirect('/admin/offers')
    } catch (error) {
        next(error);
    }
}

module.exports ={
    getOffer,
    getAddOffer,
    getEditOffer,
    postAddOffer,
    postEditOffer,
    getCancelOffer
}