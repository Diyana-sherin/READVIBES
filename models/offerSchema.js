const mongoose = require('mongoose')
const {Schema} = mongoose


const offerSchema = new Schema({
  offerName: {
        type: String,
        required: true,
      },
      discount: {
        type: Number,
        required: true,
        min: 0,
        max: 100
      },
      category: {
        type: String,
      },
      bookName: {
        type: String,
      },
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
      status : {
        type: String,
        enum: ['Active', 'Expired'],
        default: 'Active'
      }
    
},{ timestamps: true });
    
   const Offer = mongoose.model('Offer', offerSchema);

    module.exports = Offer;