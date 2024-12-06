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

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");





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
            // update user document with new  reference
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
        let deliveryCharge = 0;
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
                status :  paymentMethod === "online" ? "Pending" : "Processing",
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
                item.offerDiscount = (item.salePrice *item.quantity) - item.finalAmount;
            }


            finalAmount = orderedItems.reduce((total, item) => total + item.finalAmount, 0);
            totalPrice = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
            console.log(orderedItems)

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
                status :  paymentMethod === "online" ? "Pending" : "Processing",
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

        

      
         const ordered = orderedItems.map(item => ({
            
            ...item,
            finalAmount : item.finalAmount - couponDiscount,
            couponDiscount : couponDiscount,
          }));

          if(finalAmount > 2000)
          {
            deliveryCharge =  150;
          }
          else if( finalAmount>1000)
          {
            deliveryCharge = 100;
          }
          else if (finalAmount >500)
          {
            deliveryCharge = 50;
          }
          console.log(deliveryCharge)
          console.log(finalAmount)

          finalAmount += deliveryCharge;

        

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
    

       
                const newOrder = new Order({
                    userId,
                    orderedItems :ordered,
                    totalPrice,
                    couponDiscount,
                  
                    finalAmount,
                    deliveryCharge, 
                    orderAddress,
                    invoiceDate: new Date(),
                    paymentMethod,
                    paymentStatus : paymentMethod === "online" ? "Pending" : paymentMethod,
                    razorpayOrderId: razorpayOrder?.id || null,

                    expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                });

                await newOrder.save();
                await User.findByIdAndUpdate(userId, { $push: { order: newOrder._id } });
              
            
        

            

        console.log(newOrder)

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
            orderId: newOrder._id,
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
    
            const order =  await  Order.findOne({_id:orderId})
            
            order.orderedItems.forEach(async (item) => {
                item.status = "Processing";
            });
            order.paymentStatus = "online"
            await order.save();
            //console.log(order.orderedItems)
    
        
        //res.json({ success: true });

        res.status(201).json({
            success: true,
            orderId : orderId,
        });
        
    } else {
        res.json({ success: false });
    }
}



const retryPayment = async (req, res) => {
    try {
      const { orderId } = req.body;
  
      const orderData = await Order.findOne({ _id: orderId })
        .populate({
          path: 'orderedItems.book',
          populate: { path: 'category', select: 'name' }
        })
        .populate({
          path: 'userId',
          select: 'name email phone'
        });
  
      if (!orderData) {
        return res.status(404).json({ error: "Order not found" });
      }
  
      const razorpayOrderId = orderData.razorpayOrderId || null;
  
      res.status(201).json({
        message: "Retry initiated",
        orderId: orderData._id,
        razorpayOrderId: razorpayOrderId,
        finalAmount: orderData.totalAmount,
        customerName: orderData.userId.name,
        customerEmail: orderData.userId.email,
        customerPhone: orderData.userId.phone,
        selectedAddress: orderData.shippingAddress
      });
    } catch (error) {
      console.error("Error retrying payment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
  









 const orderSuccessPage = async (req, res) => {
    try {
        const orderId = req.params.id;
        
        const orderData = await Order.findOne({ _id: orderId })
            .populate({
                path: 'orderedItems.book',
                populate: { path: 'category', select: 'name' }
            })
            .populate({
                path: 'userId',
                select: 'name email phone'
            })

            
        const formatOrder = (order) => ({
            id: order._id,
            items: order.orderedItems.map(item => ({
                id: item._id,
                bookName: item.book ? item.book.bookName : 'Unknown Book',
                quantity: item.quantity,
                price: item.price,
                offerDiscount: item.offerDiscount,
               perOfferDiscount : item.perOfferDiscount,
                productImage: item.book.productImage[0],
                status:item.status,
                finalAmount : item.finalAmount,
                couponDiscount: item.couponDiscount.toFixed(2),
            })),
            finalAmount: order.finalAmount,
            deliveryCharge : order.deliveryCharge,
            totalPrice: order.totalPrice,
            paymentMethod: order.paymentMethod,
            offerDiscount: order.orderedItems.map(item => item.offerDiscount ?? 1).join(', '),
          
            orderedAt: order.createdAt ? order.createdAt.toISOString().split("T")[0] : null,
           
            userAddress: `${order.orderAddress[0].name},${order.orderAddress[0].houseName},${order.orderAddress[0].city},
            ${order.orderAddress[0].landMark},${order.orderAddress[0].state},${order.orderAddress[0].pincode},
            ${order.orderAddress[0].phone},${order.orderAddress[0].altPhone}`,

            userName: order.userId?.name || "Not available",
            userEmail: order.userId?.email || "Not available",
            userPhone: order.userId?.phone || "Not available"
        });
        const formattedOrder = formatOrder(orderData);

        res.render('users/orderDetails',{order : formattedOrder})

    } catch (error) {
        console.error("Error fetching order details:", error);
    }
}




const download = async (req, res) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).send("Order ID is required");
        }

        const order = await Order.findOne({ _id: orderId }).populate("orderedItems.book");

        if (!order) {
            return res.status(404).send("Order not found");
        }

        // Create a new PDF document
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument();

        // Configure response headers
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=invoice-${orderId}.pdf`);

        // Pipe the PDF into the response
        doc.pipe(res);

        // Add content to the PDF
        doc.fontSize(20).text("Invoice", { align: "center" });
        doc.fontSize(14).text(`Order ID: ${order.orderId}`, { align: "left" });
        doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, { align: "left" });
        doc.text(`Payment Method: ${order.paymentMethod}`, { align: "left" });
        doc.moveDown();

        doc.fontSize(16).text("Shipping Address:", { underline: true });
        const address = order.orderAddress[0];
        doc.fontSize(12).text(`${address.name}`);
        doc.text(`${address.houseName}, ${address.city}, ${address.state}, ${address.pincode}`);
        doc.text(`Phone: ${address.phone}`);
        doc.moveDown();

        doc.fontSize(16).text("Ordered Items:", { underline: true });
        order.orderedItems.forEach((item, index) => {
            doc.fontSize(12).text(`${index + 1}. ${item.bookName} - Qty: ${item.quantity}, Price: Rs ${item.price},
                Discount: Rs ${item.offerDiscount} , OfferPrice: Rs ${ item.price * ((100 - item.offerDiscount) / 100)}, Coupon Discount: Rs  ${item.couponDiscount} ,
                Final: Rs  ${item.finalAmount} `);
        });

        doc.moveDown();
        doc.fontSize(14).text(`Total Price: Rs ${order.totalPrice}`);
        doc.fontSize(14).text(`Delivery Charge: Rs ${order.deliveryCharge}`);
        doc.text(`Final Amount: Rs ${order.finalAmount}`);

        // Finalize the PDF
        doc.end();
    } catch (error) {
        console.error(error);
        res.status(500).send("Error generating invoice");
    }
};

const axios = require('axios');

/*const distance = async (req, res) => {
    try {
        async function getLatLon(pincode) {
            const apiKey = 'AIzaSyDR4X_1PrKnPxOZWVOMymC5Ng0mtUmjYoc';
            const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${pincode}&key=${apiKey}`;

            try {
                const response = await axios.get(url);
                console.log(response.data); // Log the response for debugging
                const location = response.data.results[0].geometry.location;
                return { lat: location.lat, lng: location.lng };
            } catch (error) {
                console.error('Error fetching geocode data:', error.message);
                throw error;
            }
        }

        // Call getLatLon with await
        const { lat, lng } = await getLatLon('560001');
        console.log(`Latitude: ${lat}, Longitude: ${lng}`);

        // Respond to the route request
        res.status(200).json({ lat, lng });
    } catch (error) {
        console.error("Error in distance function:", error.message);
        res.status(500).send("Internal Server Error");
    }
};*/


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

    download,
    retryPayment,
}