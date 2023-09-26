const User = require('../models/userModel');
const Products = require('../models/productModels');
const Addresses = require('../models/addressModels');
const Orders = require('../models/orderModels');
const Coupons = require('../models/couponModels')
const RazorPay = require('razorpay');

var instance = new RazorPay({
    key_id:process.env.key_id,
    key_secret:process.env.key_secret
})

const getCheckout = async(req,res)=>{
    try {
        const userId = req.session.user._id;
        const userAddress = await Addresses.findOne({_id: userId});
        const userData = await User.findById({_id:userId}).populate('cart.productId');
        const cart  =userData.cart;

        if(!cart){
            return redirect('/shoppingCart');
        }
        const coupons  =await Coupons.findByIsCancelled(false);
        res.render('checkout',{isLoggedIn:true,userAddress,cart,userId,coupons})
    } catch (error) {
        console.log(error.message);
    }
}

const placeOrder = async(req,res)=>{
    try {

        const addressId = req.body.address;
        const paymentMethod = req.body.payment;
        const userId = req.session.user._id;
        const userAddress = await Addresses.findOne({_id:userId});
        const address = userAddress.addresses.find(obj => obj._id.toString() === addressId);
        req.session.deliveryAddress  = address;
        const userData = await User.findById({_id:userId}).populate('cart.productId')
        const cart = userData.cart;
        req.session.cart = cart;
        let products = [];
        
        cart.forEach((pdt)=>{
            const product = {
                productId: pdt.productId._id,
                productName: pdt.productId.name,
                productPrice: pdt.productPrice,
                quantity: pdt.quantity,
                totalPrice: pdt.quantity*pdt.productId.price,
                status:'Order Confirmed'
            }
            products.push(product);
        })
        req.session.products = products;
        
        let totalPrice =0;
        for(let i=0;i<products.length;i++){
            totalPrice += products[i].totalPrice
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
                    totalPrice -= coupon.maxDiscountAmount
                }else{
                    totalPrice -= reducePrice
                }
            }else{
                couponDiscountType = 'Fixed Amount';
                totalPrice = totalPrice - couponDiscount
            }
        }
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
                    $push:{userUsers:userId}
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
        }

    } catch (error) {
        console.log(error.message);
    }
}

const verifyPayment = async(req,res)=>{
    try {
        const userId = req.session.user._id;
        const details = req.body;
        const crypto = require('crypto');
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

            const cart = req.session.cart;
            for(const {productId, quantity} of cart){
                await Products.updateOne({_id:productId._id},{
                    $inc:{quantity:-quantity}
                })
            }

            if(coupon != null){
                await Coupons.findByIdAndUpdate({_id:req.session.coupon._id},{
                    $push:{userUsers:userId}
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
        console.log(error.message);
    }
}

const getOrderSuccess = async(req,res)=>{
    try {
    const result = req.query.result;
    const isLoggedIn = Boolean(req.session.user._id);
    res.render('orderSuccess',{isLoggedIn,result})

    } catch (error) {
        console.log(error.message);
    }
}

const getMyOrder  =async(req,res)=>{
    try {
        const userId = req.session.user._id;
        const orderData = await Orders.find({userId}).populate('products.productId').sort({createdAt:-1});
        res.render('myOrders',{isLoggedIn: true, orderData: orderData});
    } catch (error) {
        console.log(error.message);
    }
}


const getOrderDetails = async(req,res)=>{
    try {
      const orderId = req.params.orderId;
      const userId = req.session.user._id;
      
      const orderData = await Orders.findById({_id: orderId}).populate('products.productId');
    //   console.log(orderData.products[0].productId);
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
        console.log(error.message);
    }
}

const getOrders = async(req,res)=>{
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
        console.log(error.message);
    }
}

const getSingleOrderDetails = async(req,res)=>{
    try {
        const {orderId} = req.params
        const orderData  =await Orders.findOne({_id:orderId}).populate('products.productId').populate('userId');

        res.render('singleorderDetails',{orderData})
    } catch (error) {
        console.log(error.message);
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
        console.log(error.message);
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
        console.log(error.messaage);
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
                    refundAmount = pdt.totalPrice;

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
                    refundAmount = pdt.totalPrice;

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
        // await updateWallet(userId, refundAmount, 'Refund of Order Cancellation' )
    }

    if(cancelledBy == 'user'){
        res.redirect(`/viewOrderDetails/${orderId}`)
    }else if(cancelledBy == 'admin'){
        res.redirect('/admin/orders')
    }
    } catch (error) {
        console.log(error.message);
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
            refundAmount = pdt.totalPrice;

            await Products.findByIdAndUpdate({_id: pdt.productId},{
                $inc:{quantity:pdt.quantity}
            })
            break;
        }
      }
      await orderData.save();
      await updateOrderStatus(orderId,next);
    //   await updateWallet(userId,refundAmount,'Refund of Order Cancellation');

      if(cancelledBy =='admin'){
        res.redirect('/admin/order');

      }else if(cancelledBy =='user'){
        res.redirect(`/viewOrderDetails/${orderId}`)
      }
    } catch (error) {
        console.log(error.message);
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
        console.log(error.message);
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
        console.log(error.message);
    }
}

const approveReturn = async(req,res,next)=>{
    try {
       const orderId = req.params.orderId;
       const orderData = await Orders.findById({_id: orderId}) ;
       let refundAmount = 0;
       for(const pdt of orderData.products){
        if(pdt.status === 'Pending Return Approval'){
            pdt.status = 'Returned'
            refundAmount += pdt.totalPrice;

            await Products.findByIdAndUpdate({_id:pdt.productId},{
                $inc:{quantity: pdt.quantity}
            })
        }
       }
       await orderData.save();
       await updateOrderStatus(orderId,next) ;

       const userId = orderData.userId ;
    //    await updateWallet(userId,refundAmount,'Refund of Returned Order')
       res.redirect('/admin/orders')
    } catch (error) {
       console.log(error.message); 
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
                refundAmount = pdt.totalPrice;

                await Products.findByIdAndUpdate({_id: pdt.productId},{
                    $inc:{quantity: pdt.quantity}
                })
                break;
            }
        }
        await orderData.save();
        await updateOrderStatus(orderId,next);
        // await updateWalletStatus(userId,refundAmount,'Refund of Returned Product');
        res.redirect('/admin/orders');
    } catch (error) {
        console.log(error.message);
    }
}

const getInvoice = async(req,res)=>{
    try {
        const orderId = req.params.orderId;
        // console.log(orderId+'od');
        const isLoggedIn = Boolean(req.session.user._id);
        const order = await Orders.findById({_id:orderId});
        let discount;
        if(order.coupon){
            discount = Math.floor(order.totalPrice/(1-(order.couponDiscount/100)))
        }
        res.render('invoice',{order,isLoggedIn,discount});
    } catch (error) {
        console.log(error.message);
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