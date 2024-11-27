const mongoose = require("mongoose");
const {Schema} = mongoose;
const {v4:uuidv4} = require('uuid');

const orderSchema = new Schema({
   
    orderId : {
        type:String,
        default:()=>uuidv4(),
        unique:true
    },
    userId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    orderedItems:[{

        book:{
            type:Schema.Types.ObjectId,
            ref:'Books',
            required:true
        },
        bookName:{
            type:String,
            require:true,
        },
        quantity:{
            type:Number,
            required:true
        },
        price:{
            type:Number,
            default:0
        },
        perOfferDiscount : {
            type:Number,
            default:0
        },
        offerDiscount : {
            type:Number,
            default:0
        }

    }],
    totalPrice:{
        type:Number,
        required:true
    },
    couponDiscount:{
        type:Number,
        default:0
    },
    perCouponDiscount:{
        type:Number,
        default:0
    },
    
   
    finalAmount:{
        type:Number,
        required:true
    },
    orderAddress : [{
        name:{
            type:String,
            required:true,
        },
        houseName:{
            type:String,
            required:true,
        },
        city:{
            type:String,
            required:true,
        },
        landMark:{
            type:String,
            required:true,
        },
        state : {
            type:String,
            required:true
        },
        pincode:{
            type:String,
            required:true
        },
        phone:{
            type:Number,
            required : true,
        },
        altPhone : {
            type:Number,
        }
}],
    invoiceDate:{
        type:Date
    },
    status:{
        type:String,
        required:true,
        enum:['Pending','Processing','Shipped','Delivered','Cancel Request','Cancelled','Return Request','Returned']
    },
    reason:{
        type:String,
    },
    razorpayOrderId: {  
        type: String,
        default: null
    },
    paymentMethod:{
        type:String,
        required:true,
    },
    expectedDeliveryDate: {
        type: Date,
       
      },
},{timestamps : true});

const Order = mongoose.model("Order",orderSchema);
module.exports = Order;