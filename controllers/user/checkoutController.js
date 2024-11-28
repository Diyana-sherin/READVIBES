const User = require('../../models/userSchema')
const Books = require('../../models/bookSchema')
const Category = require('../../models/categorySchema')
const Cart = require('../../models/cartSchema')
const Address = require('../../models/addressSchema')
const Order = require('../../models/orderSchema')
const Coupon = require('../../models/couponSchema')
const Wallet = require('../../models/walletSchema')
const Offer = require('../../models/offerSchema')
const Razorpay = require('razorpay');
const crypto = require('crypto');
const env = require('dotenv').config()





const loadCheckout = async (req, res) => {
    try {
        const userId = req.session.user;
        const bookId = req.params.id;
        let cartTotal = 0;
        let items = [];
        let book = null;
        let offer;
        const userAddressData = await Address.findOne({ userId });
        const addresses = userAddressData && userAddressData.addresses.length > 0
            ? userAddressData.addresses.map(address => ({
                id: address._id,
                name: address.name,
                houseName: address.houseName,
                city: address.city,
                landMark: address.landMark,
                state: address.state,
                pincode: address.pincode,
                phone: address.phone,
                altPhone: address.altPhone
            }))
            : [];

        if (bookId) {
            // Single checkout
            book = await Books.findById(bookId)
                .populate("category")


            if (!book) {
                return res.status(404).send("Product not found");
            }

            cartTotal = book.salePrice;
            const catOffers = await Offer.find({ category: book.category.name })
            const bookOffers = await Offer.find({ bookName: book.bookName })

            catOffers.sort((a, b) => b.discount - a.discount)
            bookOffers.sort((a, b) => b.discount - a.discount)

            if (!catOffers && !bookOffers) {
                console.log("nothing")
            }
            //check the offer Expired or not 
            function isExpired(offer) {
                const currentDate = new Date();
                const offerExpiredDate = new Date(offer.endDate);

                return offerExpiredDate < currentDate || offer.status === "Expired";

            }

            //Finding largest offers of category
            let greatestDiscountcatOffer = null;
            for (let offer of catOffers) {
                if (!isExpired(offer)) {
                    greatestDiscountcatOffer = offer;
                    break;
                }
            }

            //Finding largest offers of books 
            let greatestDiscountbookOffer = null;
            for (let offer of bookOffers) {
                if (!isExpired(offer)) {
                    greatestDiscountbookOffer = offer;
                    break;
                }
            }

            if (!greatestDiscountcatOffer && !greatestDiscountbookOffer) {
                console.log('No  Active offers ');
                return res.render('users/checkout', {
                    Bookprice: cartTotal,
                    addresses,
                    cart: items,
                    book
                });

            }
            else if (!greatestDiscountcatOffer) {
                offer = greatestDiscountbookOffer;
            }
            else if (!greatestDiscountbookOffer) {
                offer = greatestDiscountcatOffer;
            }
            else {
                offer = greatestDiscountbookOffer.discount > greatestDiscountcatOffer.discount ? greatestDiscountbookOffer : greatestDiscountcatOffer
            }

            cartTotal = book.salePrice * ((100 - offer.discount) / 100)

        } else {
            // Cart checkout
            const cart = await Cart.findOne({ userId })
                .populate({
                    path: 'items.bookId',
                    select: 'bookName authorName  productImage salePrice quantity price',
                    populate: { path: 'category', select: 'name' }
                });


            if (cart && cart.items.length > 0) {
                cartTotal = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);
                items = cart;
            }
            const cartItems = cart.items.map(item => ({
                Id: item._id,
                id: item.bookId._id,
                category: item.bookId.category.name,
                bookName: item.bookId.bookName,
                salePrice: item.bookId.salePrice,
                price: item.price,
                quantity: item.quantity,
            }));

            for (item of cartItems) {
                console.log(item.bookName)
                const catOffers = await Offer.find({ category: item.category })
                const bookOffers = await Offer.find({ bookName: item.bookName })
                catOffers.sort((a, b) => b.discount - a.discount)
                bookOffers.sort((a, b) => b.discount - a.discount)
                console.log(catOffers)
                console.log(bookOffers)
                if (!catOffers && !bookOffers) {
                    console.log("ok")
                    item.totalPrice = item.salesPrice * item.quantity;
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

                if (!greatestDiscountcatOffer && !greatestDiscountbookOffer) {
                    item.totalPrice = item.salePrice * item.quantity;
                    console.log(`No valid offers for ${item.bookName}. Moving to the next item.`);

                    continue;
                }
                else if (!greatestDiscountcatOffer) {
                    offer = greatestDiscountbookOffer;
                }
                else if (!greatestDiscountbookOffer) {
                    offer = greatestDiscountcatOffer;
                }
                else {
                    offer = greatestDiscountbookOffer.discount > greatestDiscountcatOffer.discount ? greatestDiscountbookOffer : greatestDiscountcatOffer
                }
                console.log(offer.discount)

                item.totalPrice = (item.salePrice * ((100 - offer.discount) / 100)) * item.quantity


            }
            //console.log(cartItems)




            cartTotal = cartItems.reduce((total, item) =>
                total + item.totalPrice, 0);

            console.log(cartTotal)


        }

        return res.render('users/checkout', {
            Bookprice: cartTotal,

            addresses,
            cart: items,
            book,
            offer
        });

    } catch (error) {
        console.log("Error", error);
        res.status(500).send("An error occurred while loading checkout");
    }
};


const addAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const bookId = req.params.id;
        console.log(bookId)
        if (!userId) {
            return res.status(401).json({ message: 'Please log in to add to Address.' });
        }

        let address = await Address.findOne({ userId });
        if (!address) {
            address = new Address({ userId, address: [] })
            await address.save();
            console.log('Created')
            // Update user document with new  reference
            await User.findByIdAndUpdate(userId, { $push: { address: address._id } });
            console.log('Created and added  reference to user');
        }
        console.log("Already exits")

        const { name, houseName, city, landmark, state, pincode, phone, altPhone } = req.body;

        address.addresses.push({
            name: name,
            houseName: houseName,
            city: city,
            landMark: landmark,
            state: state,
            pincode: pincode,
            phone: phone,
            altPhone: altPhone,
        })
        await address.save();
        console.log('Added to address ')
        if (bookId) {
            return res.redirect(`/checkout/${bookId}`)
        }
        res.redirect('/checkout')
    } catch (error) {
        console.log('error', error)
    }
}

const deleteAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const addressId = req.params.id;
        console.log(addressId)
        const UserAddress = await Address.findOne({ userId });
        const initialItemCount = UserAddress.addresses.length;
        UserAddress.addresses = UserAddress.addresses.filter(address => address._id.toString() !== addressId);

        if (UserAddress.addresses.length === initialItemCount) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }


        await UserAddress.save();
        res.json({ success: true, message: 'Address deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting Address:', error);
        res.status(500).json({ success: false, message: 'Failed to delete Address' });
    }
}




const applyCoupon = async (req, res) => {
    try {
        const { couponCode, totalAmount } = req.body;
        const userId = req.session.user;

        if (!userId) {
            return res.status(400).json({ message: 'User not authenticated' });
        }
        console.log(totalAmount)

        const coupon = await Coupon.findOne({ couponCode });
        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }
        console.log(coupon)


        if (coupon.totalUses >= coupon.maxTotalUsers) {
            return res.status(400).json({ message: 'Coupon usage limit reached' });
        }

        const userUsageCount = coupon.userUsage.get(userId.toString()) || 0;
        if (userUsageCount >= coupon.usagePerUser) {
            return res.status(400).json({ message: 'You have reached the usage limit for this coupon' });
        }
        if (req.session.coupons && req.session.coupons.includes(couponCode)) {
            return res.status(400).json({ message: 'Coupon already applied for this session' });
        }

        if (totalAmount < coupon.minimumPurchase) {
            return res.status(400).json({
                message: `A minimum purchase of $${coupon.minimumPurchase} is required to apply this coupon.`
            });
        }


        let discount = Math.min(totalAmount, coupon.discount);
        discount = (100 - discount) / 100
        console.log(discount)
        coupon.userUsage.set(userId, userUsageCount + 1);
        coupon.totalUses += 1;
        await coupon.save();

        req.session.coupons = req.session.coupons || [];
        req.session.coupons.push(couponCode);


        console.log(coupon)


        return res.json({ message: 'Coupon applied successfully', discount });
    } catch (error) {
        console.error('Error applying coupon:', error);
        console.log(error)
        res.status(500).json({ message: 'Server error while applying coupon' });
    }
};



const removeCoupon = async (req, res) => {
    try {
      const { couponCode,totalAmount } = req.body;
      const userId = req.session.user;
  
      if (!userId) {
        return res.status(400).json({ message: 'User not authenticated' });
      }
  
      const coupon = await Coupon.findOne({ couponCode });
      if (!coupon) {
        return res.status(404).json({ message: 'Coupon not found' });
      }
  
      if (!req.session.coupons || !req.session.coupons.includes(couponCode)) {
        return res.status(400).json({ message: 'Coupon not applied in this session' });
      }
  
      let discount = coupon.discount;
        discount = (100 - discount) / 100
        console.log(discount)


      // Update usage details
      const userUsageCount = coupon.userUsage.get(userId.toString());
      if (userUsageCount && userUsageCount > 0) {
        coupon.userUsage.set(userId.toString(), userUsageCount - 1);
      }
  
      if (coupon.totalUses > 0) {
        coupon.totalUses -= 1;
      }
  
      await coupon.save();
  
      // Remove coupon from session
      req.session.coupons = req.session.coupons.filter(code => code !== couponCode);
  
      return res.json({ message: 'Coupon removed successfully',discount });
    } catch (error) {
      console.error('Error removing coupon:', error);
      res.status(500).json({ message: 'Server error while removing coupon' });
    }
  };
  




const validateCOD = async (req, res) => {
    try {
        const { amount } = req.body;
        if (amount > 1000) {
            return res.json({ error: 'Payment error: Cash on delivery is only allowed for amounts less than 1000.' });
        }
        
    } catch (error) {
        console.error('Error validation of COD :', error);
    }
}

const razorpay = new Razorpay({
    key_id: process.env.RAZERPAY_ID_KEY,     
    key_secret: process.env.RAZERPAY_SECRET_KEY,
});








    


const placeOrder = async (req, res) => {
    try {
        const { cartId, bookId, selectedAddress, paymentMethod, couponCode } = req.body;
        const userId = req.session.user;

        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const singleBookId = Array.isArray(bookId) ? bookId[0] : bookId;

        let orderedItems = [];
        let totalPrice = 0;
        let couponDiscount = 0;
        let finalAmount = 0;
        let perCouponDiscount = 0;
        let itemPerDiscount = 1;
        let offer;

        if (cartId) {
            const cart = await Cart.findById(cartId).populate({
                path: "items.bookId",
                select: "bookName authorName productImage salePrice quantity price",
                populate: { path: "category", select: "name" }
            });

            if (!cart) {
                return res.status(404).json({ message: "Cart not found" });
            }

            orderedItems = cart.items.map(item => ({
                book: item.bookId._id,
                productImage: item.bookId.productImage[0],
                bookName: item.bookId.bookName,
                category: item.bookId.category.name,
                quantity: item.quantity,
                price: item.price,
                salePrice: item.bookId.salePrice,
            }));

            for (const item of orderedItems) {
                const catOffers = await Offer.find({ category: item.category });
                const bookOffers = await Offer.find({ bookName: item.bookName });

                catOffers.sort((a, b) => b.discount - a.discount);
                bookOffers.sort((a, b) => b.discount - a.discount);

                const isExpired = (offer) => {
                    const currentDate = new Date();
                    return new Date(offer.endDate) < currentDate || offer.status === "Expired";
                };

                let greatestDiscountBookOffer = bookOffers.find(offer => !isExpired(offer));
                let greatestDiscountCatOffer = catOffers.find(offer => !isExpired(offer));

                if (greatestDiscountBookOffer && greatestDiscountCatOffer) {
                    offer = greatestDiscountBookOffer.discount > greatestDiscountCatOffer.discount
                        ? greatestDiscountBookOffer
                        : greatestDiscountCatOffer;
                } else {
                    offer = greatestDiscountBookOffer || greatestDiscountCatOffer;
                }

                item.perOfferDiscount = offer ? offer.discount : 0;
                item.finalAmount = offer
                    ? (item.salePrice * ((100 - offer.discount) / 100)) * item.quantity
                    : item.salePrice * item.quantity;
            }

            finalAmount = orderedItems.reduce((total, item) => total + item.finalAmount, 0);
        } else if (singleBookId) {
            const book = await Books.findById(singleBookId).populate("category");
            if (!book) {
                return res.status(404).json({ message: "Book not found" });
            }

            const catOffers = await Offer.find({ category: book.category.name });
            const bookOffers = await Offer.find({ bookName: book.bookName });

            catOffers.sort((a, b) => b.discount - a.discount);
            bookOffers.sort((a, b) => b.discount - a.discount);

            const isExpired = (offer) => {
                const currentDate = new Date();
                return new Date(offer.endDate) < currentDate || offer.status === "Expired";
            };

            const validBookOffer = bookOffers.find(offer => !isExpired(offer));
            const validCatOffer = catOffers.find(offer => !isExpired(offer));

            offer = validBookOffer && validCatOffer
                ? (validBookOffer.discount > validCatOffer.discount ? validBookOffer : validCatOffer)
                : (validBookOffer || validCatOffer);

            finalAmount = offer
                ? book.salePrice * ((100 - offer.discount) / 100)
                : book.salePrice;

            orderedItems.push({
                book: book._id,
                bookName: book.bookName,
                quantity: 1,
                price: book.salePrice,
                offerDiscount: book.salePrice - finalAmount,
                perOfferDiscount: offer ? offer.discount : 0,
                finalAmount,
            });

            totalPrice = finalAmount;
        } else {
            return res.status(400).json({ message: "No cartId or bookId provided" });
        }

        const address = await Address.findOne(
            { userId, "addresses._id": selectedAddress },
            { "addresses.$": 1 }
        );

        if (!address) {
            return res.status(404).json({ message: "Address not found" });
        }

        const orderAddress = address.addresses[0];

        if (couponCode) {
            const coupon = await Coupon.findOne({ couponCode });
            console.log(coupon)
            if (coupon) {
                
                couponDiscount = finalAmount;
                finalAmount = finalAmount * ((100 - coupon.discount) / 100);
                couponDiscount = (couponDiscount - finalAmount)/(orderedItems.length);
                console.log(perCouponDiscount)
                console.log(couponDiscount)
            }
        }

        let razorpayOrder;
        if (paymentMethod === "online") {
            razorpayOrder = await razorpay.orders.create({
                amount: Math.round(finalAmount * 100),
                currency: "INR",
                receipt: `receipt_${new Date().getTime()}`,
            });
        }

        if(paymentMethod === 'wallet')
        {
            let wallet = await Wallet.findOne({ userId });

        if (!wallet) 
        {
             return res.json({ error: 'Payment error: Insufficient wallet balance.' })
        }

        if (wallet.balance < finalAmount)
        {
            return res.json({ error: 'Payment error: Insufficient wallet balance.' })
        }

        const transactionEntry = {
            date: new Date(),
            type: 'debit',
            amount: finalAmount,
            description: 'Purchase',
        };

        wallet.balance -= finalAmount;
        wallet.transactions.push(transactionEntry);
        await wallet.save();
        }

        const createdOrders = await Promise.all(
            orderedItems.map(async (item) => {
                const newOrder = new Order({
                    userId,
                    orderedItems: [item],
                    totalPrice: item.price * item.quantity,
                    couponDiscount,
                  
                    finalAmount: item.finalAmount - couponDiscount ,
                    orderAddress,
                    invoiceDate: new Date(),
                    paymentMethod,
                    razorpayOrderId: razorpayOrder?.id || null,
                    status: paymentMethod === "online" ? "Pending" : "Processing",
                    expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                });

                await newOrder.save();
                await User.findByIdAndUpdate(userId, { $push: { order: newOrder._id } });
                return newOrder._id;
            })
        );

        if (cartId) {
            await Cart.findByIdAndDelete(cartId);
            
        }

        await Promise.all(
            orderedItems.map(item =>
                Books.findByIdAndUpdate(item.book, { $inc: { quantity: -item.quantity } })
            )
        );

        res.status(201).json({
            message: "Order placed successfully",
            orderId: createdOrders,
            razorpayOrderId: razorpayOrder?.id || null,
        });
    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};



const verifyPayment = async (req, res) => {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature, orderId } = req.body;

    console.log("Body : ", req.body)


    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto.createHmac("sha256", process.env.RAZERPAY_SECRET_KEY)
        .update(body.toString())
        .digest('hex');

    if (expectedSignature === razorpaySignature) {
        // Payment is verified
        for (item of orderId) {
            await Order.findByIdAndUpdate(item, { status: "Processing" });
        }
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
}













const orderSuccessPage = async (req, res) => {
    try {
        res.render('users/orderSuccess')
    } catch (error) {
        console.log(error)
    }
}












module.exports = {
    loadCheckout,
    addAddress,
    deleteAddress,
    placeOrder,
    applyCoupon,
    orderSuccessPage,
    validateCOD,
    verifyPayment,
    removeCoupon,
}