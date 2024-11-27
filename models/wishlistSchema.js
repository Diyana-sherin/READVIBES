const mongoose = require('mongoose')
const {Schema} = mongoose

const wishlistShema = new Schema ({
    userId : {
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    items:[{
        bookId:{
            type:Schema.Types.ObjectId,
            ref:"Books",
        },
    }]
},{timestamps:true});


const Wishlist = mongoose.model('Wishlist',wishlistShema);

module.exports = Wishlist;
