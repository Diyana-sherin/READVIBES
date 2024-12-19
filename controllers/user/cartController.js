const User = require('../../models/userSchema')
const Books = require('../../models/bookSchema')
const Category = require('../../models/categorySchema')
const Cart = require('../../models/cartSchema')
const Offer = require('../../models/offerSchema')



const addToCart = async (req, res) => {
    const bookId = req.params.bookId;
    const userId = req.session.user;
    //console.log(bookId)
    //console.log(userId)
    if (!userId) {
        //return res.status(401).json({ message: 'Please log in to add to cart.' });
        return  res.json({ success : false, message: 'please login to add to cart  ' });
    }
    try {
        const book = await Books.findById(bookId);
        if (!book) {
            return res.status(404).json({ messege: "Book not found." })
        }
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, items: [] })
            await cart.save();
            console.log('Created')
            await User.findByIdAndUpdate(userId, { $push: { cart: cart._id } });
            console.log('Created and added cart reference to user');
        }
        if(cart.items.length === 0)
        {
            await User.findByIdAndUpdate(userId, { $set: { cart: cart._id } });
        }
        const cartItem = cart.items.find(item => item.bookId.toString() === bookId);
        console.log(cartItem)
        if (cartItem) {
            cartItem.quantity += 1;
            cartItem.totalPrice = cartItem.quantity * book.salePrice;
        } else {
            //add  books into cart (at first q=1)
            cart.items.push({
                bookId: bookId,
                quantity: 1,
                price: book.salePrice,
                totalPrice: book.salePrice,
            });
        }
        await cart.save();
        res.json({ success: true , message: 'Added to cart successfully!' });
        console.log('Success')

    } catch (error) {
        console.log('error', error)
    }
}

const loadCart = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ message: 'Please log in to view your cart.' });
        }


        // Populate all necessary fields
        const cart = await Cart.findOne({ userId })
            .populate({
                path: 'items.bookId',
                select: 'bookName authorName  productImage salePrice quantity price',
                populate: { path: 'category', select: 'name' }
            });


        if (!cart || !cart.items.length === 0) {
            return res.render('users/cart', {
                cartItems: [],
                subtotal: 0,
                messege: 'Your cart is empty',
                breadcrumbs: [
                    { name: "Home", url: "/homelog" },
                    { name: "cart", url: "/cart" }
                ],
            });
        }


        /*const subtotal = cart.items.reduce((total, item) =>
            total + item.totalPrice, 0);*/

        const cartItems = cart.items.map(item => ({
            Id: item._id,
            id: item.bookId._id,
            category: item.bookId.category.name,
            bookName: item.bookId.bookName,
            authorName: item.bookId.authorName,
            productImage: item.bookId.productImage[0],
            salePrice: item.bookId.salePrice,
            stock: item.bookId.quantity,
            price: item.price,
            quantity: item.quantity,
            totalPrice: item.totalPrice,
            proceedStatus: (item.bookId.quantity >= item.quantity),
            
           

        }));

        for (item of cartItems) {
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
             
            console.log(offer)

            //item.offerPrice = item.salePrice * ((100 - offer.discount) / 100)
            item.offerName = offer.offerName
            item.discount = offer.discount;
            item.salePrice = item.salePrice * ((100 - offer.discount) / 100)
            item.totalPrice = item.totalPrice  * ((100 - offer.discount) / 100)


        }

        const subtotal = cartItems.reduce((total, item) =>
            total + item.totalPrice, 0);


        console.log(cartItems)
        let checkout = true;
        console.log(checkout)
        for (const items of cartItems) {
            if (!items.proceedStatus) {
                checkout = false;
                break;
            }
        }
        console.log(checkout)





        res.render('users/cart', { cartItems, subtotal, checkout, breadcrumbs: [
            { name: "Home", url: "/homelog" },
            { name: "cart", url: "/cart" }
        ] });


    } catch (error) {
        console.error("Error fetching cart page:", error);
        res.status(500).json({ message: 'Error fetching cart page' });
    }
}




// Route to increase quantity
const increaseQuantity = async (req, res) => {
    try {
        const userId = req.session.user;
        const itemId = req.params.id;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const item = cart.items.find(item => item.bookId.toString() === itemId);

        if (item) {
            item.quantity += 1;
            item.totalPrice = item.quantity * item.price;
            await cart.save();
            res.json({ success: true, item });
        } else {
            res.status(404).json({ success: false, message: 'Item not found' });
        }
    } catch (error) {
        console.error('Error increasing quantity:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Route to decrease quantity
const decreaseQuantity = async (req, res) => {
    try {
        const userId = req.session.user;
        const itemId = req.params.id;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }


        const item = cart.items.find(item => item.bookId.toString() === itemId);

        if (item) {
            if (item.quantity > 1) {
                item.quantity -= 1;
                item.totalPrice = item.quantity * item.price;
                await cart.save();
                res.json({ success: true, item });
            } else {
                res.json({ success: false, message: 'Quantity cannot be less than 1' });
            }
        } else {
            res.status(404).json({ success: false, message: 'Item not found' });
        }
    } catch (error) {
        console.error('Error decreasing quantity:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const deleteItems = async (req, res) => {
    try {
        const userId = req.session.user;
        const itemId = req.params.id;
        console.log(itemId)
        const cart = await Cart.findOne({ userId });
        const initialItemCount = cart.items.length;
        cart.items = cart.items.filter(item => item.bookId.toString() !== itemId);
        //Cart.deleteOne({ _id: itemId });


        await cart.save();

         if (cart.items.length === 0) {
            console.log('cart is empty. Retaining the reference in the user document.');
        }


        res.json({ success: true, message: 'Item deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ success: false, message: 'Failed to delete item' });
    }
}





module.exports = { 
    addToCart, 
    loadCart, 
    increaseQuantity, 
    decreaseQuantity, 
    deleteItems 
}