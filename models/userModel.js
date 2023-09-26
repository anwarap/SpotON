const mongoose =require('mongoose')


const userSchema=new mongoose.Schema({
    fname:{
        type:String,
        required:true
    },
    lname:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    mobile:{
        type:Number,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    status:{
        type:Boolean,
        default:false
    },
    cart:[{
        productId:{
            type:mongoose.Schema.ObjectId,
            ref:'Products'
        },
        quantity:{
            type:Number,
            default:1
        },
        productPrice:{
            type:Number,
            required:true
        }
    }],
    wishlist:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Products'
    }],
    wallet:{
        type:Number,
        default:0
    },
    walletHistory:[{
        date:{
            type:Date
        },
        amount:{
            type:Number
        },
        message:{
            type:String
        }
    }]
},{
    timestamps:true,
})


module.exports = mongoose.model("User",userSchema)