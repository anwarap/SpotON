const User = require('../models/userModel');
const Products = require('../models/productModels');
const Addresses = require('../models/addressModels');
const Orders = require('../models/orderModels');
const Coupons = require('../models/couponModels')
const RazorPay = require('razorpay');
const crypto = require('crypto');
const {updateWallet}  =require('../helpers/helpersFunction');
var instance = new RazorPay({
    key_id:process.env.key_id,
    key_secret:process.env.key_secret
})

const getCheckout = async(req,res,next)=>{
    try {
        const userId = req.session.user._id;
        const userAddress = await Addresses.findOne({_id: userId});
        const userData = await User.findById({_id:userId}).populate('cart.productId');
        const cart  =userData.cart;

        if(!cart){
            return redirect('/shoppingCart');
        }
        const walletBalance = userData.wallet;
        const coupons  =await Coupons.findByIsCancelled(false);
        res.render('checkout',{isLoggedIn:true,userAddress,cart,userId,coupons,walletBalance})
    } catch (error) {
        next(error)
    }
}

const placeOrder = async(req,res,next)=>{
    try {

        const addressId = req.body.address;
        const paymentMethod = req.body.payment;
        const isWalletSelected = req.body.walletCheckBox;
        const userId = req.session.user._id;
        const userAddress = await Addresses.findOne({_id:userId});
        const address = userAddress.addresses.find(obj => obj._id.toString() === addressId);
        req.session.deliveryAddress  = address;
        const userData = await User.findById({_id:userId}).populate('cart.productId')
        const cart = userData.cart;
        const walletAmount = req.session.walletAmount = parseInt(userData.wallet);
        req.session.cart = cart;
        let products = [];
        
        cart.forEach((pdt)=>{
            let discountPrice;
            let totalDiscount;
            console.log(pdt.productId.offerPrice+'lll');
            console.log(pdt.productId.price+'gggg');
            if(pdt.productId.offerPrice){
                discountPrice = pdt.productId.price - pdt.productId.offerPrice;;
                totalDiscount = discountPrice*pdt.quantity;
            }else{
                totalDiscount=0
            }
            console.log(totalDiscount+'fhfh');
            const product = {
                productId: pdt.productId._id,
                productName: pdt.productId.name,
                productPrice: pdt.productPrice,
                discountPrice,
                quantity: pdt.quantity,
                totalPrice: pdt.quantity*pdt.productId.price,
                totalDiscount,
                status:'Order Confirmed'
            }
            products.push(product);
        })
        req.session.products = products;
 
        let totalPrice =0;
        if(cart.length){
      

             for(let i=0;i<products.length;i++){
               
                totalPrice += (products[i].totalPrice - products[i].totalDiscount)
             
                }
                
        
            let couponCode ='';
            let couponDiscount = 0;
            let couponDiscountType;
            if(req.session.coupon){
                const coupon = req.session.coupon
                couponCode = coupon.code;
                couponDiscount = coupon.discountAmount;
    
                if(coupon.discountType === 'Percentage'){
                    couponDiscountType = 'Percentage';
                    const reducePrice = totalPrice * (couponDiscount/100)
    
                    if(reducePrice >= coupon.maxDiscountAmount){
                        totalPrice =Math.round(totalPrice-coupon.maxDiscountAmount) 
                    }else{
                        totalPrice = Math.round(totalPrice -reducePrice)
                    }
                }else{
                    couponDiscountType = 'Fixed Amount';
                    totalPrice = totalPrice - couponDiscount
                }
            }
            req.session.isWalletSelected = isWalletSelected;
            req.session.totalPrice = totalPrice;
            if(paymentMethod ==='COD'){
    
                await new Orders({
                    userId,
                    deliveryAddress:address,
                    totalPrice,
                    products,
                    paymentMethod,
                    status:'Order Confirmed',
                    couponCode,
                    couponDiscount,
                    couponDiscountType
                }).save()
                
                            for(const {productId,quantity}of cart){
                                await Products.updateOne({_id:productId._id},{
                                    $inc:{quantity:-quantity}
                                })
                            }
                            if(req.session.coupon != null){
                                await Coupons.findByIdAndUpdate({_id:req.session.coupon._id},{
                                    $push:{usedUsers:userId}
                                })
                            }
                            await User.findByIdAndUpdate({_id:userId}, {
                                $set:{
                                    cart:[]
                                }
                            })
                            req.session.cartCount = 0;
                            res.json({status:'COD'})
        


        }else if(paymentMethod === 'Razorpay'){
            
            if(isWalletSelected){
                totalPrice = totalPrice-walletAmount;
            }
            console.log(totalPrice+'kkk');
            var options ={
                amount:totalPrice*100,
                currency:'INR',
                receipt:'hello'
            }
            instance.orders.create(options,(err,order)=>{
                if(err){
                    console.log(err);
                }else{
                    res.json({status:'Razorpay',order:order})
                }
            })
        }else if(paymentMethod == 'Wallet'){

            await new Orders({
                userId, 
                deliveryAddress: address,
                totalPrice,
                products, 
                paymentMethod,
                status: 'Order Confirmed',
                couponCode,
                couponDiscount,
                couponDiscountType
            }).save()


            for (const { productId, quantity } of cart) {
                await Products.updateOne(
                    { _id: productId._id },
                    { $inc: { quantity: -quantity } }
                );
            }

            await User.findByIdAndUpdate({_id:userId},{
                $set:{
                    cart:[]
                }
            });

            if(req.session.coupon !=null){
                await Coupons.findByIdAndUpdate(
                    {_id:req.session.coupon._id},{
                        $push:{
                            usedUsers:userId
                        }
                    }
                )
            }

            req.session.cartCount = 0;

            const walletHistory = {
                date:new Date(),
                amount:-totalPrice,
                message:'Product Purchase'
            }

            await User.findByIdAndUpdate({_id:userId},{
                $inc:{wallet:-totalPrice},
                $push:{walletHistory}
            });
            res.json({status:'Wallet'})
        }
    }else{
        res.redirect('/shop')
    }

    } catch (error) {
        next(error)
    }
}

const verifyPayment = async(req,res,next)=>{
    try {
        const userId = req.session.user._id;
        const details = req.body;
       
        let hmac = crypto.createHmac('sha256',process.env.key_secret);
        hmac.update(details.response.razorpay_order_id+'|'+details.response.razorpay_payment_id)
        hmac = hmac.digest('hex');
    
        if(hmac === details.response.razorpay_signature){
            let totalPrice = req.session.totalPrice;

            const coupon = req.session.coupon;
            let couponCode ='';
            let couponDiscount =0;
            let couponDiscountType;
            if(coupon){
                couponCode = coupon.code;
                couponDiscount = coupon.discountAmount;
                couponDiscountType = coupon.discountType;
            }
           
            await new Orders({
                userId,
                deliveryAddress:req.session.deliveryAddress,
                totalPrice,
                products:req.session.products,
                paymentMethod:'RazorPay',
                status:'Order Confirmed',
                couponCode,
                couponDiscount,
                couponDiscountType

            }).save()

            if(req.session.isWalletSelected){
                const userData = await User.findById({_id:userId});
                userData.walletHistory.push({
                    date: new Date(),
                    amount:userData.wallet,
                    message:'Product Purchase'
                })
                userData.wallet =0;
                await userData.save();
            }

            const cart = req.session.cart;
            for(const {productId, quantity} of cart){
                await Products.updateOne({_id:productId._id},{
                    $inc:{quantity:-quantity}
                })
            }

            if(coupon != null){
                await Coupons.findByIdAndUpdate({_id:req.session.coupon._id},{
                    $push:{usedUsers:userId}
                })
            }

            await User.findByIdAndUpdate({_id:userId},{
                $set:{cart:[]}
            })
            req.session.cartCount = 0;
            res.json({status:true})
        }else{
            res.json({status:false})
        }

    } catch (error) {
        next(error)
    }
}

const getOrderSuccess = async(req,res,next)=>{
    try {
    const result = req.query.result;
    const isLoggedIn = Boolean(req.session.user._id);
    res.render('orderSuccess',{isLoggedIn,result})

    } catch (error) {
        next(error)
    }
}

const getMyOrder  =async(req,res,next)=>{
    try {
        const userId = req.session.user._id;
        const orderData = await Orders.find({userId}).populate('products.productId').sort({createdAt:-1});
        res.render('myOrders',{isLoggedIn: true, orderData: orderData});
    } catch (error) {
        next(error)
    }
}


const getOrderDetails = async(req,res,next)=>{
    try {
      const orderId = req.params.orderId;
      const userId = req.session.user._id;
      
      const orderData = await Orders.findById({_id: orderId}).populate('products.productId');
    
      let status;
      switch(orderData.status){
        case 'Order Confirmed':status = 1;
        break;
        case 'Shipped':status = 2;
        break;
        case 'Out For Delivery':status = 3;
        break;
        case 'Delivered':status = 4;
        break;
        case 'Cancelled':status = 5;
        break;
        case 'Cancelled By Admin':status = 6;
        break;
        case 'Pending Return Approval':status = 7;
        break;
        case 'Returned':status = 8;
        break;
      }
    
      res.render('orderDetails',{isLoggedIn:true,orderData,status})
    } catch (error) {
        next(error)
    }
}

const getOrders = async(req,res,next)=>{
    try {
        let pageNum = 1
        if(req.query.pageNum){
            pageNum = parseInt(req.query.pageNum);
        }
        let limit = 10;
        if(req.query.limit){
            limit = parseInt(req.query.limit);
        }
        const orders = await Orders.find({}).populate('products.productId').populate('userId').skip((pageNum - 1) * limit).limit(limit).sort({ createdAt: -1 });
        const totalOrderCount = await Orders.find({}).count();
        let pageCount = Math.ceil(totalOrderCount/limit);

       
        res.render('ordersList',{orders,pageCount,pageNum,limit});
    } catch (error) {
        next(error)
    }
}

const getSingleOrderDetails = async(req,res,next)=>{
    try {
        const {orderId} = req.params
        const orderData  =await Orders.findOne({_id:orderId}).populate('products.productId').populate('userId')
        // console.log(orderData+'od');
        res.render('singleorderDetails',{orderData})
    } catch (error) {
        next(error)
    }
}


const getChangeOrderStatus  =async(req,res,next)=>{
    try {
        const orderId = req.body.orderId;
        const status = req.body.status;
        const orderData  = await Orders.findById({_id: orderId});
        for(const pdt of orderData.products){
            if(pdt.status !=='Delivered' &&
               pdt.status !== 'Pending Return Approval' &&
               pdt.status !== 'Cancelled' && 
               pdt.status !== 'Cancelled By Admin' && 
               pdt.status !== 'Returned'){
                pdt.status = status;
               }
        };
        await orderData.save();
        await updateOrderStatus(orderId,next);
        res.redirect('/admin/orders')
    } catch (error) {
        next(error)
    }
}

const updateOrderStatus = async (orderId,next)=>{
    try {
        let statusCounts = [];
        const orderData  =await Orders.findById({_id:orderId});
        orderData.products.forEach((pdt)=>{
            let eachSatusCount = {
                status: pdt.status,
                count:1 
            }
            let existingStatusIndex = statusCounts.findIndex((item)=>item.status === pdt.status);
            if(existingStatusIndex !== -1){
                statusCounts[existingStatusIndex].count +=1;

            }else{
                statusCounts.push(eachSatusCount)
            }
        });
        
        if(statusCounts.length === 1){
            orderData.status = statusCounts[0].status
            await orderData.save()
            return
        }

        let isOrderConfirmedExists = false;
        let isShippedExists = false;
        let isOutForDeliveryExists = false;
        let isDeliveredExists = false;
        let cancelledByUserCount; 
        let cancelledByAdminCount;
        let returnApprovalCount;
        let returnedCount;
        statusCounts.forEach((item) => {

            if(item.status === 'Order Confimed'){
                isOrderConfirmedExists = true
            }

            if(item.status === 'Shipped'){
                isShippedExists = true
            }

            if(item.status === 'Out For Delivery'){
                isOutForDeliveryExists = true
            }

            if(item.status === 'Delivered'){
                isDeliveredExists = true
            }

            if(item.status === 'Cancelled'){
                cancelledByUserCount = item.count
            }

            if(item.status === 'Cancelled By Admin'){
                cancelledByAdminCount = item.count
            }

            if(item.status === 'Pending Return Approval'){
                returnApprovalCount = item.count
            }

            if(item.status === 'Returned'){
                returnedCount = item.count
            }
            
        });


        if(isOrderConfirmedExists){
            orderData.status = 'Order Confirmed'
            await orderData.save()
            return
        }
        
        if(isShippedExists){
            orderData.status = 'Shipped'
            await orderData.save()
            return
        }

        if(isOutForDeliveryExists){
            orderData.status = 'Out For Delivery'
            await orderData.save()
            return
        }


        if(isDeliveredExists){
            orderData.status = 'Delivered'
            await orderData.save()
            return
        }

        let cancelledCount = 0;
        if(cancelledByUserCount){
            cancelledCount += cancelledByUserCount
        }
        if(cancelledByAdminCount){
            cancelledCount += cancelledByAdminCount
        }

        if(cancelledByUserCount === orderData.products.length || cancelledCount === orderData.products.length){
            orderData.status = 'Cancelled'
            await orderData.save()
            return;
        }
        
        if(cancelledByAdminCount === orderData.products.length){
            orderData.status = 'Cancelled By Admin'
            await orderData.save()
            return;
        }

        if( cancelledCount + returnApprovalCount + returnedCount === orderData.products.length){
            orderData.status = 'Pending Return Approval'
            await orderData.save()
            return;
        }

        if( cancelledCount + returnedCount === orderData.products.length){
            orderData.status = 'Returned'
            await orderData.save()
            return;
        }
    } catch (error) {
        next(error)
    }
}


const cancelOrder = async(req,res,next)=>{
    try {
        const orderId = req.params.orderId;
        const cancelledBy = req.query.cancelledBy;
        const orderData = await Orders.findById({_id:orderId});
        const userId = orderData.userId;
        
        let refundAmount  = 0;
        if(cancelledBy =='user'){
            
            for (const pdt of orderData.products){

                if(pdt.status !== 'Delivered' && 
                    pdt.status !== 'Pending Return Approval' &&
                    pdt.status !== 'Cancelled' && 
                    pdt.status !== 'Cancelled By Admin' && 
                    pdt.status !== 'Returned'
                ){
                    pdt.status = 'Cancelled';
                    refundAmount = refundAmount +(pdt.totalPrice - pdt.totalDiscount)

                    await Products.findByIdAndUpdate(
                        {_id:pdt.productId},{
                            $inc:{quantity:pdt.quantity}
                        }
                    )
                }
            
           }
           await orderData.save();
           await updateOrderStatus(orderId,next)

        }else if(cancelledBy =='admin'){

            for (const pdt of orderData.products){

                if(pdt.status !== 'Delivered' && 
                    pdt.status !== 'Pending Return Approval' &&
                    pdt.status !== 'Cancelled' && 
                    pdt.status !== 'Cancelled By Admin' && 
                    pdt.status !== 'Returned'
                ){
                    pdt.status = 'Cancelled By Admin';
                    refundAmount = refundAmount+(pdt.totalPrice - pdt.totalDiscount);

                    await Products.findByIdAndUpdate(
                        {_id: pdt.productId},{
                            $inc:{quantity:pdt.quantity}
                        }
                    )
                }
        }
    }
    await orderData.save();
    await updateOrderStatus(orderId,next);

    if(orderData.paymentMethod !== 'COD'){
        await updateWallet(userId,refundAmount,'Refund Of Order Cancellation')
    }

    if(cancelledBy == 'user'){
        res.redirect(`/viewOrderDetails/${orderId}`)
    }else if(cancelledBy == 'admin'){
        res.redirect('/admin/orders')
    }
    } catch (error) {
        next(error)
    }
}

const cancelSinglePdt = async(req,res,next)=>{
    try {
      const {orderId,pdtId} = req.params;
      const {cancelledBy}= req.query;
      const orderData = await Orders.findById({_id:orderId});
      const userId = orderData.userId;

      let refundAmount;
      for(const pdt of orderData.products){
        if(pdt._id == pdtId){
            if(cancelledBy == 'admin'){
                pdt.status = 'Cancelled By Admin';

            }else if(cancelledBy == 'user'){
                pdt.status = 'Cancelled';
            }
            refundAmount = pdt.totalPrice - pdt.totalDiscount;

            await Products.findByIdAndUpdate({_id: pdt.productId},{
                $inc:{quantity:pdt.quantity}
            })
            break;
        }
      }
      await orderData.save();
      await updateOrderStatus(orderId,next);
      await updateWallet(userId,refundAmount,'Refund of Order Cancellation')

      if(cancelledBy =='admin'){
        res.redirect('/admin/order');

      }else if(cancelledBy =='user'){
        res.redirect(`/viewOrderDetails/${orderId}`)
      }
    } catch (error) {
        next(error)
    }
}

const returnOrder = async(req,res,next)=>{
    try {
        const orderId = req.params.orderId;
        const orderData = await Orders.findById({_id: orderId});

        for(const pdt of orderData.products){
            if(pdt.status ==='Delivered'){
                pdt.status ='Pending Return Approval';
            }
        };
        await orderData.save();
        await updateOrderStatus(orderId,next);

        res.redirect(`/viewOrderDetails/${orderId}`)
    } catch (error) {
        next(error)
    }
}

const returnSinglePdt = async(req,res,next)=>{
    try {
       const {orderId,pdtId} = req.params;
       const orderData = await Orders.findById({_id: orderId});
       for(const pdt of orderData.products){
        if(pdt._id == pdtId){
            pdt.status = 'Pending Return Approval'
            break;
        }
       }
       await orderData.save();
       await updateOrderStatus(orderId,next);
       res.redirect(`/viewOrderDetails/${orderId}`);
    } catch (error) {
        next(error)
    }
}

const approveReturn = async(req,res,next)=>{
    try {
       const orderId = req.params.orderId;
       const orderData = await Orders.findById({_id: orderId}) ;
       let refundAmount = 0;
       console.log(orderData+'ooooo');
       for(const pdt of orderData.products){
        if(pdt.status === 'Pending Return Approval'){
            pdt.status = 'Returned'
            if(pdt.totalDiscount){

                refundAmount = pdt.totalPrice - pdt.totalDiscount;
            }else{
                refundAmount = pdt.totalPrice ;
                
            }
           

            await Products.findByIdAndUpdate({_id:pdt.productId},{
                $inc:{quantity: pdt.quantity}
            })
        }
       }
       await orderData.save();
       await updateOrderStatus(orderId,next) ;

       const userId = orderData.userId ;

       await updateWallet(userId,refundAmount,'Refund of Returned Order')

       res.redirect('/admin/orders')
    } catch (error) {
        next(error) 
    }
}

const approveReturnSinglepdt = async(req,res,next)=>{
    try {
        const {orderId,pdtId} = req.params;
        const orderData = await Orders.findById({_id: orderId});
        const userId = orderData.userId;
        let refundAmount;
      

        for(const pdt of orderData.products){
            if(pdt._id == pdtId){
                pdt.status = 'Returned';
                if(pdt.totalDiscount){

                    refundAmount = pdt.totalPrice - pdt.totalDiscount;
                }else{
                    refundAmount = pdt.totalPrice ;
                    
                }
         

                await Products.findByIdAndUpdate({_id: pdt.productId},{
                    $inc:{quantity: pdt.quantity}
                })
                break;
            }
        }
        await orderData.save();
        await updateOrderStatus(orderId,next);
        await updateWallet(userId,refundAmount,'Refund of Returned Product')
        res.redirect('/admin/orders');
    } catch (error) {
        next(error)
    }
}

const getInvoice = async(req,res,next)=>{
    try {
        const orderId = req.params.orderId;
        const isLoggedIn = Boolean(req.session.user._id);
        const order = await Orders.findById({_id:orderId});
        // console.log(order+'oo');
        let discount;
        if(order.couponCode){
            for(const pdt of order.products){
                // console.log(pdt.productPrice+'aa');

                discount = Math.floor((pdt.productPrice*pdt.quantity)-order.totalPrice)
            }
        }
        res.render('invoice',{order,isLoggedIn,discount});
    } catch (error) {
        next(error)
    }
}

module.exports ={
    getCheckout,
    placeOrder,
    getOrderSuccess,
    getMyOrder,
    getOrderDetails,
    getOrders,
    cancelOrder,
    getSingleOrderDetails,
    getChangeOrderStatus,
    cancelSinglePdt,
    verifyPayment,
    returnOrder,
    returnSinglePdt,
    approveReturn,
    approveReturnSinglepdt,
    getInvoice
}