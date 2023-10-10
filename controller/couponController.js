const Coupons = require('../models/couponModels');
const User = require('../models/userModel');

const getCoupons = async(req,res,next)=>{
    try {
        const coupons = await Coupons.find();
        res.render('coupons',{coupons})
    } catch (error) {
        next(error)
    }
}

const getAddCoupon = async(req,res,next)=>{
    try {
        const couponTypes = Coupons.schema.path('discountType').enumValues;
        res.render('addCoupon',{couponTypes})
    } catch (error) {
        next(error)
    }
}

const postAddCoupon = async(req,res,next)=>{
    try {
        const {discountAmount,discountType,maxDiscountAmount,minPurchase,expiryDate,description}= req.body;
        const code = req.body.code.toUpperCase();

        let couponCount ;
        if(!req.body.couponCount){
            couponCount = undefined;

        }else{
            couponCount = parseInt(req.body.couponCount);
        }
        const isCodeExist = await Coupons.findOne({code});
        if(!isCodeExist){
            await new Coupons({
                code,discountAmount,discountType,maxDiscountAmount,minPurchase,expiryDate,description,couponCount
            }).save()
        }else{
            console.log('code already exists');
        }
        res.redirect('/admin/coupons');
    } catch (error) {
        next(error)
    }
}

const getEditCoupon = async(req,res,next)=>{
    try {
        const couponId = req.params.couponId;
        const couponData = await Coupons.findById({_id:couponId});
        const couponTypes = Coupons.schema.path('discountType').enumValues;

        res.render('editCoupon',{couponData,couponTypes});
    } catch (error) {
        next(error)
    }
}

const postEditCoupon = async(req,res,next)=>{
    try {
        const couponId = req.params.couponId;
        const {discountAmount,discountType,maxDiscountAmount,minPurchase,expiryDate,description,couponCount} = req.body;
        const code = req.body.code.toUpperCase();

        const isCodeExist  =await Coupons.findOne({code});
        if(!isCodeExist || isCodeExist._id == couponId) {
            await Coupons.findByIdAndUpdate({_id: couponId},{
                $set:{
                    code,discountAmount,discountType,maxDiscountAmount,minPurchase,expiryDate,description,couponCount
                }
            })
        }else{
            console.log('Code already exist, update expiry date if you want to add same code again');
        }
        res.redirect('/admin/coupons')
    } catch (error) {
        next(error)
    }
}

const cancelCoupon = async(req,res,next)=>{
    try {
        const couponId = req.params.couponId;
        const couponData = await Coupons.findById({_id: couponId});
        couponData.isCancelled =!couponData.isCancelled;
        await couponData.save();
        res.redirect('/admin/coupons');
    } catch (error) {
        next(error)
    }
}

const applyCoupon = async(req,res,next)=>{
    try {
        const userId = req.session.user._id;
        const code = req.body.code.toUpperCase();
        const couponData = await Coupons.findOne({code:code})
        const userData = await User.findById({_id:userId}).populate('cart.productId');
        let cart = userData.cart;
        let totalPrice = 0;
        let totalDiscountPrice =0;
        cart.forEach(pdt=>{
            totalPrice += pdt.productPrice*pdt.quantity;
            if(pdt.productId.offerPrice){
                totalDiscountPrice += (pdt.productPrice - pdt.productId.offerPrice)*pdt.quantity;
            }else{
                totalDiscountPrice +=0
            }
        })
        const cartAmount = totalPrice - totalDiscountPrice;
        if(couponData && !couponData.isCancelled){
            if(cartAmount >= couponData.minPurchase){
                if(couponData.expiryDate >= new Date()){
                    if(couponData.couponCount >= couponData.usedUsers.length){
                        const isCodeUsed = couponData.usedUsers.find((id) => id == userId);

                        if(!isCodeUsed){
                            req.session.coupon = couponData;
                            let payAmount;
                            if(couponData.discountType === 'Fixed Amount'){
                                payAmount = cartAmount - couponData.discountAmount
                            }else if(couponData.discountType === 'Percentage'){
                                const reducePrice = cartAmount*(couponData.discountAmount/100) ;
                                if(reducePrice >= couponData.maxDiscountAmount){
                                    payAmount =Math.round(cartAmount - couponData.maxDiscountAmount) 
                                }else{
                                    payAmount =Math.round(cartAmount - reducePrice) 
                                }
                            }
                            const couponDiscount =Math.round(cartAmount -payAmount);
                            let isWalletHasPayAmount = false;
                            if(userData.wallet >= payAmount){
                                isWalletHasPayAmount = true;
                            }
                            res.json({
                                status:true,
                                message: 'Success',
                                couponDiscount,
                                payAmount,
                                isWalletHasPayAmount
                            })
                            couponData.usedUsers.push(userId);
                            couponData.couponCount--;
                        }else{
                            res.json({status:false,message:'Coupon already Used'})
                        }
                    }else{
                        res.json({status:false,message:'Coupon Limit exceeded,try another One'})
                    }
                }else{
                    res.json({status:false,message:'Coupon expired'})
                }
            }else{
                res.json({status:false,message:`Min purchase should be greater than or equal to ${couponData.minPurchase}`})
            }
        }else{
            res.json({status:false,message:'coupon doesnot exist'})
        }
    } catch (error) {
        next(error)
    }
}

const removeCoupon = async(req,res,next)=>{
    try {
        req.session.coupon = null;
        res.json({status:true})
    } catch (error) {
        next(error);
    }
}

module.exports ={
    getCoupons,
    getAddCoupon,
    postAddCoupon,
    getEditCoupon,
    postEditCoupon,
    cancelCoupon,
    applyCoupon,
    removeCoupon

}