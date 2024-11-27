const mongoose = require('mongoose')
const {Schema} = mongoose

const cartSchema = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    items:[{
        bookId:{
            type:Schema.Types.ObjectId,
            ref:"Books",
        },
        quantity:{
            type:Number,
            require:true
        },
        price:{
            type:Number,
            require:true,
        },
        totalPrice:{
            type:Number,
            required:true
        }
    }]
},{timestamps:true});

const Cart = mongoose.model('Cart',cartSchema)

module.exports = Cart;