const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
    userId:{
        
       type: mongoose.Schema.Types.ObjectId,
       ref:'User',
       required: true
    },
    deliveryAddress:{
        type:Object,
        required: true
    },
    totalPrice:{
        type:Number,
        required: true
    },
    products:[{
        productId:{
            type:mongoose.Schema.Types.ObjectId,
            required: true,
            ref:'Products'
        },
        productPrice:{
            type:Number,
            required: true
        },
        quantity:{
            type:Number,
            required: true
        },
        totalPrice:{
            type:String,
            required: true
        },
        status:{
            type:String,
            enum:['Order Confirmed','Shipped','Out For Delivery','Delivered','Cancelled',
                    'Cancelled By Admin','Pending Return Approval','Returned']
        }
    }],
    paymentMethod:{
        type:String,
        enum:['COD'],
        required:true
    },
    status:{
        type:String,
        enum:['Order Confirmed','Shipped','Out For Delivery',
                'Delivered','Cancelled','Cancelled By Admin',
                'Pending Return Approval','Returned'],
        required:true
    }
   
  },
  {
    timestamps:true,
  }
  )


module.exports =mongoose.model('Orders',orderSchema);