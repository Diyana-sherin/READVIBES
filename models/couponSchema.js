const mongoose = require('mongoose')
const {Schema} = mongoose


const couponSchema = new Schema({
  couponCode: {
        type: String,
        required: true,
        unique: true
      },
      discount: {
        type: Number,
        required: true,
        min: 0,
        max: 100
      },
      minimumPurchase: {
        type: Number,
        required: true,
        min: 0
      },
      usagePerUser: {
        type: Number,
        required: true,
        min: 1
      },
      maxTotalUsers: {
        type: Number,
        required: true,
        min: 1
      },
      totalUses: {
        type: Number,
        default: 0 
      }
    ,
    userUsage: {
        type: Map,
        of: Number, 
        default: {}
      }
},{ timestamps: true });
    
   const Coupon = mongoose.model('Coupon', couponSchema);

    module.exports = Coupon;