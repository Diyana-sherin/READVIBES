const User = require('../../models/userSchema')
const Books = require('../../models/bookSchema')
const Category = require('../../models/categorySchema')
const Cart = require('../../models/cartSchema')
const Address = require('../../models/addressSchema')
const Order = require('../../models/orderSchema')
const Wallet = require('../../models/walletSchema')



const loadOrderPage = async (req, res) => {
    try {
        let search = "";
        if (req.query.search) {
            search = req.query.search;
        }

        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page); // Convert page number to an integer
        }

        const limit = 3;

        const orderData = await Order.find({
            $or: [
                { "orderedItems.bookName": { $regex: ".*" + search + ".*", $options: "i" } },
            ]
        })
            .populate({
                path: 'orderedItems.book',
                populate: { path: 'category', select: 'name' }
            })

            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();
        //console.log(orderData)

        const count = await Order.countDocuments({
            $or: [
                { "orderedItems.bookName": { $regex: ".*" + search + ".*", $options: "i" } },
            ]
        });

        const formatOrder = (order) => ({
            id: order._id,
            bookName: order.orderedItems.map(item => item.bookName).join(','),
            category: order.orderedItems.map(item => item.book?.category?.name).join(','),
            price: order.orderedItems.map(item => item.price).join(', '),
            quantity: order.orderedItems.map(item => item.quantity ?? 1).join(', '),
            totalPrice: order.totalPrice,
            finalAmount: order.finalAmount,
            offerDiscount: order.orderedItems.map(item => item.perOfferDiscount ?? 1).join(', '),
            couponDiscount: order.couponDiscount.toFixed(2),
            orderedAt: order.createdAt ? order.createdAt.toISOString().split("T")[0] : null,
            status: order.status,
            paymentMethod : order.paymentMethod,
            reason : order.reason,
            expectedDeliveryDate : order.expectedDeliveryDate ? order.expectedDeliveryDate.toISOString().split("T")[0] : null,
            userAddress: `${order.orderAddress[0].name},${order.orderAddress[0].houseName},${order.orderAddress[0].city},
            ${order.orderAddress[0].landMark},${order.orderAddress[0].state},${order.orderAddress[0].pincode},
            ${order.orderAddress[0].phone},${order.orderAddress[0].altPhone}`,
        });

        const orders = orderData.map(formatOrder)

       
        res.render('admin/orders', {
            data: orders,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            search
        });


    } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred while fetching orders");
    }
}





       







const chengeStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        const validStatuses = [
            'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancel Request','Cancelled', 'Return Request', 'Returned'
        ];
        if (!validStatuses.includes(status)) {
            return res.status(400).send('Invalid status.');
        }

        const order = await Order.findById(orderId)
        const userId = order.userId;
        
        const bookName = order.orderedItems.map(item => item.bookName);
        console.log(bookName)


        if (!order) {
            return res.status(404).send('Order not found.');
        }

        // Update the status
        order.status = status;

        // Check if the order is being canceled
        if (status === 'Cancelled') {
            // Check if the payment method is online
            if (order.paymentMethod === 'online') {
                // Find the user's wallet
                let wallet = await Wallet.findOne({ userId: order.userId });

                // If wallet doesn't exist, create one
                if (!wallet) {
                    wallet = new Wallet({
                        userId: order.userId,
                        balance: 0,
                        transactions: [],
                    });
                    await wallet.save();
                    await User.findByIdAndUpdate(userId, { $push: { wallet : wallet._id } });
                    console.log('Created and added wallet reference to user');
                }
                console.log(wallet)

                // Add the refund amount to the wallet
                wallet.balance += order.finalAmount;

                // Add a transaction entry in the wallet
                wallet.transactions.push({
                    date: new Date(),
                    type: 'credit',
                    amount: order.finalAmount,
                    description: `Refund for Order of  ${bookName}`,
                });

                // Save the updated wallet
                await wallet.save();
                console.log(wallet)
            }
        }

        // Save the updated order
        await order.save();

        res.redirect('/admin/orders');
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).send('Error updating order status.');
    }
};



const ViewOrderDetails = async (req, res) => {
    try {

        const orderId = req.params.id;
       // console.log("Order ID:", orderId);

        // Fetch order data
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
                offerPrice: item.price * ((100 - item.offerDiscount) / 100),
                productImage: item.book.productImage[0],
            })),
            finalAmount: order.finalAmount,
            totalPrice: order.totalPrice,
            paymentMethod: order.paymentMethod,
            offerDiscount: order.orderedItems.map(item => item.offerDiscount ?? 1).join(', '),
            couponDiscount: order.cuoponDiscount,
            orderedAt: order.createdAt ? order.createdAt.toISOString().split("T")[0] : null,
            status: order.status,
            userAddress: `${order.orderAddress[0].name},${order.orderAddress[0].houseName},${order.orderAddress[0].city},
            ${order.orderAddress[0].landMark},${order.orderAddress[0].state},${order.orderAddress[0].pincode},
            ${order.orderAddress[0].phone},${order.orderAddress[0].altPhone}`,

            userName: order.userId?.name || "Not available",
            userEmail: order.userId?.email || "Not available",
            userPhone: order.userId?.phone || "Not available"
        });

        const formattedOrder = formatOrder(orderData);

       // console.log(formattedOrder)


       // console.log("Order Data:", orderData.userId);

        res.render('admin/viewDetails', { order: formattedOrder });
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).send("Error fetching order details");
    }
};





module.exports = { loadOrderPage, chengeStatus, ViewOrderDetails }