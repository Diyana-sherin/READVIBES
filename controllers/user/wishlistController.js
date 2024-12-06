const User = require('../../models/userSchema')
const Books = require('../../models/bookSchema')
const Category = require('../../models/categorySchema')
const Cart = require('../../models/cartSchema')
const Whishlist = require('../../models/wishlistSchema')
const Wishlist = require('../../models/wishlistSchema')
const Offer = require('../../models/offerSchema')



/*const addToWishlist = async (req, res) => {
    const bookId = req.params.bookId;
    const userId = req.session.user;

    if (!userId) {
        return res.status(401).json({ message: 'Please log in to add to wishlist.' });
    }

    try {
        const book = await Books.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: "Book not found." });
        }

        let wishlist = await Wishlist.findOne({ userId });
        
        
        if (!wishlist) {
            wishlist = new Wishlist({ userId, items: [] });
            await wishlist.save();
            await User.findByIdAndUpdate(userId, { $push: { wishlist: wishlist._id } });
            console.log('Created and added wishlist reference to user');
        }

       
        const wishlistItem = wishlist.items.find(item => item.bookId.toString() === bookId);
        
        if (!wishlistItem) {
            // Add the item to wishlist 
            wishlist.items.push({ bookId });
            await wishlist.save();
            console.log('Item added to wishlist');
        } else {
            console.log('Item already in wishlist');
        }

        res.json({ message: 'Added to Wishlist successfully!' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'An error occurred. Please try again later.' });
    }
};*/

const addToWishlist = async (req, res) => {
    const bookId = req.params.bookId;
    const userId = req.session.user;

    if (!userId) {
        return res.status(401).json({ message: 'Please log in to add to wishlist.' });
    }

    try {
        // Validate the book ID
        const book = await Books.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: "Book not found." });
        }

        // Find or create the wishlist
        let wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            wishlist = new Wishlist({ userId, items: [] });
            await User.findByIdAndUpdate(userId, { $push: { wishlist :wishlist._id } });
            console.log('Created and added whishlist reference to user');
        }

        // Check if the book is already in the wishlist
        const wishlistItem = wishlist.items.find(
            item => item.bookId.toString() === bookId
        );

        

        if (!wishlistItem) {
            wishlist.items.push({ bookId }); // Add the book to the wishlist
            await wishlist.save();          // Save the updated wishlist
            console.log('Item added to wishlist');
        } else {
            console.log('Item already in wishlist');
            return res.json({ message: 'Item already in wishlist' });
        }

        res.json({ message: 'Added to Wishlist successfully!' });
    } catch (error) {
        console.error('Error adding to wishlist:', error);

        // Handle specific errors like invalid ObjectId
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid book ID format.' });
        }

        res.status(500).json({ message: 'An error occurred. Please try again later.' });
    }
};


const loadWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ message: 'Please log in to view your cart.' });
        }


        // Populate all necessary fields
        const wishlist = await Wishlist.findOne({ userId })
            .populate({
                path: 'items.bookId',
                select: 'bookName authorName productImage salePrice quantity',
                populate: { path: 'category', select: 'name' }
            });


        if (!wishlist || !wishlist.items.length === 0) {
            return res.render('users/wishlist', {
                wishlistItems: [],
                messege: 'Your Wishlist is empty',
                breadcrumbs: [
                    { name: "Home", url: "/homelog" },
                    { name: "wishlist", url: "/wishlist" }
                ]
            });
        }
       

        const wishlistItems = wishlist.items.map(item => ({
            Id: item._id,
            id: item.bookId._id,
            bookName: item.bookId.bookName,
            category: item.bookId.category.name,
            authorName: item.bookId.authorName,
            productImage: item.bookId.productImage[0],
            salePrice: item.bookId.salePrice,
            stock: item.bookId.quantity,
        }));

        for (item of wishlistItems) {
            console.log(item.bookName)
            const catOffers = await Offer.find({ category: item.category })
            const bookOffers = await Offer.find({ bookName: item.bookName })
            catOffers.sort((a, b) => b.discount - a.discount)
            bookOffers.sort((a, b) => b.discount - a.discount)
            //console.log(catOffers)
            // console.log(bookOffers)
            if(!catOffers && !bookOffers)
            {
                console.log("ok")
                continue;
            }

            //check the offer Expired or not 
            function isExpired(offer) {
                const currentDate = new Date();
                const offerExpiredDate = new Date(offer.endDate);

                return offerExpiredDate < currentDate || offer.status === "Expired";

            }

            //Finding largest offers of books 
            let greatestDiscountbookOffer = null;
            for (let offer of bookOffers) {
                if (!isExpired(offer)) {
                    greatestDiscountbookOffer = offer;
                    break;
                }
            }
            //Finding largest offers of category
            let greatestDiscountcatOffer = null;
            for (let offer of catOffers) {
                if (!isExpired(offer)) {
                    greatestDiscountcatOffer = offer;
                    break;
                }
            }

            //console.log(greatestDiscountcatOffer)
            //console.log(greatestDiscountbookOffer)
            let offer ;

             if (!greatestDiscountcatOffer  && !greatestDiscountbookOffer ) 
             {
                 console.log(`No valid offers for ${item.bookName}. Moving to the next item.`);
                continue;
             }
             else if(!greatestDiscountcatOffer)
             {
                offer = greatestDiscountbookOffer;
             }
             else if (!greatestDiscountbookOffer)
             {
                offer = greatestDiscountcatOffer;
             }
             else
             {
                offer = greatestDiscountbookOffer.discount > greatestDiscountcatOffer.discount ? greatestDiscountbookOffer : greatestDiscountcatOffer
             }
             
            //console.log(offer)

            //item.offerPrice = item.salePrice * ((100 - offer.discount) / 100)
            item.offerName = offer.offerName
            item.discount = offer.discount;
          
            item.offerPrice = item.salePrice  * ((100 - offer.discount) / 100)


        }

       



        console.log(wishlistItems)
        



        res.render('users/wishlist', { wishlistItems,  breadcrumbs: [
            { name: "Home", url: "/homelog" },
            { name: "wishlist", url: "/wishlist" }
        ]});


    } catch (error) {
        console.error("Error fetching wishlist page:", error);
        res.status(500).json({ message: 'Error fetching wishlist page' });
    }
}

const deleteItems = async (req, res) => {
    try {
        const userId = req.session.user;
        const itemId = req.params.id;
        console.log(itemId)
        const wishlist = await Wishlist.findOne({ userId });
        const initialItemCount = wishlist.items.length;
        wishlist.items = wishlist.items.filter(item => item.bookId.toString() !== itemId);
        //Cart.deleteOne({ _id: itemId });


        await wishlist.save();
        res.json({ success: true, message: 'Item deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ success: false, message: 'Failed to delete item' });
    }
}


module.exports = {
    addToWishlist,
    loadWishlist,
    deleteItems,
}
