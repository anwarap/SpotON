const Coupons = require('../models/couponModels');
const User = require('../models/userModel');

const getCoupons = async(req,res)=>{
    try {
        const coupons = await Coupons.find();
        res.render('coupons',{coupons})
    } catch (error) {
        console.log(error.message);
    }
}

const getAddCoupon = async(req,res)=>{
    try {
        const couponTypes = Coupons.schema.path('discountType').enumValues;
        res.render('addCoupon',{couponTypes})
    } catch (error) {
        console.log(error.message);
    }
}

const postAddCoupon = async(req,res)=>{
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
        console.log(error.message);
    }
}

const getEditCoupon = async(req,res)=>{
    try {
        const couponId = req.params.couponId;
        const couponData = await Coupons.findById({_id:couponId});
        const couponTypes = Coupons.schema.path('discountType').enumValues;

        res.render('editCoupon',{couponData,couponTypes});
    } catch (error) {
        
    }
}

const postEditCoupon = async(req,res)=>{
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
        console.log(error.message);
    }
}

const cancelCoupon = async(req,res)=>{
    try {
        const couponId = req.params.couponId;
        const couponData = await Coupons.findById({_id: couponId});
        couponData.isCancelled =!couponData.isCancelled;
        await couponData.save();
        res.redirect('/admin/coupons');
    } catch (error) {
        console.log(error.message);
    }
}

const applyCoupon = async(req,res)=>{
    try {
        const userId = req.session.user._id;
        const code = req.body.code.toUpperCase();
        const couponData = await Coupons.findOne({code})
        const userData = await User.findById({_id:userId}).populate('cart.productId');
        let cart = userData.cart;
        let totalPrice = 0;
        cart.forEach(pdt=>{
            totalPrice += pdt.productPrice*pdt.quantity;
        })
        const cartAmount = totalPrice;
        if(couponData && !couponData.isCancelled){
            if(cartAmount >= couponData.minPurchase){
                if(couponData.expiryDate >= new Date()){
                    if(couponData.couponCount >= couponData.usedUsers.length){
                        const isCodeUsed = couponData.usedUsers.find(id => id == userId);
                        console.log(couponData+'ca');
                        console.log(isCodeUsed);
                        if(!isCodeUsed){
                            req.session.coupon = couponData;
                            let payAmount;
                            if(couponData.discountType === 'Fixed Amount'){
                                payAmount = cartAmount - couponData.discountAmount
                            }else if(couponData.discountType === 'Percentage'){
                                const reducePrice = cartAmount*(couponData.discountAmount/100) ;
                                if(reducePrice >= couponData.maxDiscountAmount){
                                    payAmount = cartAmount - couponData.maxDiscountAmount
                                }else{
                                    payAmount = cartAmount - reducePrice
                                }
                            }
                            const couponDiscount = cartAmount -payAmount;
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
        console.log(error.message);
    }
}

const removeCoupon = async(req,res)=>{
    try {
        req.session.couponData = null;
        res.json({status:true})
    } catch (error) {
        console.log(error.message);
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