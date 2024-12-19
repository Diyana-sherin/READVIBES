const { create } = require('hbs');
const Offer = require('../../models/offerSchema')
const Books = require('../../models/bookSchema')
const Category = require('../../models/categorySchema')



const offerInfo = async (req,res)=>{
    try {
        const page = parseInt(req.query.page || 1)
        const limit = 4;
        const skip= (page-1)*limit;

        const offerData = await Offer.find()
        .skip(skip)
        .limit(limit)
        .sort({createdAt : -1})


        const totalOffers = await Offer.countDocuments();


        const totalPages = Math.ceil(totalOffers / limit)

        const prevPage = page >1 ? page-1 : null;
        const nextPage = page <totalPages ? page+1 : null;


        const offers = offerData.map(item => ({
            ...item.toObject(),
            endDate : item.endDate.toISOString().split('T')[0],
            startDate : item.startDate.toISOString().split('T')[0],

          }));
        

        res.render("admin/offer",{
            offers,
            currentPage: page,
            totalPages: Array.from({ length: totalPages }, (_, i) => i + 1),
            prevPage,
            nextPage
        })
    } catch (error) {
        console.log(error)
    }
}


const loadAddOffers = async (req,res)=>{
    try {
        const category = await Category.find({ status: "listed" })
        const book = await Books.find({isBlocked:false})
        res.render('admin/addOffers',{book,categories:category})
    } catch (error) {
        console.error("Error : ",error)
    }
}


const addOffers = async (req, res) => {
    try {
        const { offerName, discount, bookName, category, startDate, endDate } = req.body;
        console.log(req.body)

        
        const offerExistsForBook = await Offer.findOne({bookName:bookName});

       const offerExistsForCategory = await Offer.findOne({category:category});

        const categories = await Category.find({ status: "listed" })
        const book = await Books.find({isBlocked:false})

        if (offerExistsForBook ) {
            return res.render('admin/addOffers', {book,categories, message: "Offer already exists for this book " });
        }
        if ( offerExistsForCategory) {
            return res.render('admin/addOffers', {book,categories, message: "Offer already exists for this category " });
        }

        const newOffer = new Offer({
            offerName,
            discount,
            bookName,
            category,
            startDate,
            endDate,
        });

        await newOffer.save();
        res.redirect('/admin/offers');

    } catch (error) {

       
        console.error("Error:", error);
        res.status(500).send("An error occurred while creating the offer");
    }
};


const loadEditOffer = async (req,res)=>{
    try {
        const offerId = req.params.id;
        const offer = await Offer.findOne({_id:offerId})
        const categories = await Category.find({ status: "listed" })
        const book = await Books.find({isBlocked:false})
        res.render('admin/editOffer', { offer, categories, book  });
    } catch (error) {
        res.status(500).send("Error fetching offer details");
        console.error("Error",error)
    }
}


const editOffer = async (req,res)=>{
    try {
        const { offerName, discount, category, bookName, startDate, endDate } = req.body;
        await Offer.findByIdAndUpdate(req.params.id, {
          offerName,
          discount,
          category,
          bookName,
          startDate,
          endDate
        });
        res.redirect('/admin/offers'); 
      } catch (err) {
        res.render('edit-offer', { message: "Failed to update offer", offer: req.body });
      }
}


const deleteOffer = async (req,res)=>{
    try {
        const offerId = req.params.id;
        const deletedOffer = await Offer.findByIdAndDelete(offerId);

        if (deletedOffer) {
            res.status(200).json({ success: true, message: "Offer deleted successfully." });
        } else {
            res.status(404).json({ success: false, message: "Offer not found." });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}

const updateStatus = async(req,res)=>{
    const offerId = req.params.id;
    const {status} = req.body;
    try {
       
        const offer = await Offer.findOne({_id:offerId})

        offer.status = status;

        await offer.save();
        res.json({ success: true, message: 'Status updated successfully' });
        
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: 'Failed to update status' });
    }
}

module.exports = {
    offerInfo, 
    loadAddOffers,
    addOffers,
    loadEditOffer,
    editOffer,
    deleteOffer,
    updateStatus,
}