const User = require('../models/userModel');
const Products = require('../models/productModels');
const Addresses = require('../models/addressModels');
const Orders = require('../models/orderModels');
const { request } = require('../routes/userRoute');



const getCheckout = async(req,res)=>{
    try {
        const userId = req.session.user._id;
        const userAddress = await Addresses.findOne({_id: userId});
        const userData = await User.findById({_id:userId}).populate('cart.productId');
        const cart  =userData.cart;

        if(!cart){
            return redirect('/shoppingCart');
        }

        res.render('checkout',{isLoggedIn:true,userAddress,cart,userId})
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
        let totalPrice =0;
        for(let i=0;i<products.length;i++){
            totalPrice += products[i].totalPrice
        }

        req.session.products = products;
        if(paymentMethod ==='COD'){

            await new Orders({
                userId,
                deliveryAddress:address,
                totalPrice,
                products,
                paymentMethod,
                status:'Order Confirmed'
            }).save()

            for(const {productId,quantity}of cart){
                await Products.updateOne({_id:productId._id},{
                    $inc:{quantity:-quantity}
                })
            }

            await User.findByIdAndUpdate({_id:userId}, {
                $set:{
                    cart:[]
                }
            })
            req.session.cartCount = 0;
            res.json({status:'COD'})
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
        let limit = 8;
        if(req.query.limit){
            limit = parseInt(req.query.limit);
        }
        const orders = await Orders.find({}).populate('products.productId').populate('userId').sort({ date: -1 }).skip((pageNum - 1) * limit).limit(limit);
        const totalOrderCount = await Orders.find({}).count();
        let pageCount = Math.ceil(totalOrderCount/limit);

       
        res.render('ordersList',{orders,pageCount,pageNum,limit});
    } catch (error) {
        console.log(error.message);
    }
}

const getSingleOrderDetails = async(req,res)=>{
    try {
        const orderId = req.query.id;
        const order  =await Orders.findOne({_id:orderId}).populate('products.productId').populate('userId');
        res.render('singleorderDetails',{order})
    } catch (error) {
        console.log(error.message);
    }
}

const cancelOrder = async(req,res)=>{
    try {
        const orderId = req.params.orderId;
        
        const status = req.query.status;
        const orderData = await Orders.findById({_id:orderId});
        const userId = orderData.userId;
        

        await Orders.updateOne({_id:orderId},{$set:{status}});
        if(status.toString()==='Cancelled'){
            res.redirect(`/viewOrderDetails/${orderId}`)
        }else{
            res.redirect('/admin/orders')
        }
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
    getSingleOrderDetails
}