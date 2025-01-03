const bcrypt = require('bcrypt');
const User = require('../../models/userSchema')
const Books = require('../../models/bookSchema')
const Category = require('../../models/categorySchema')
const Cart = require('../../models/cartSchema')
const Address = require('../../models/addressSchema')
const Order = require('../../models/orderSchema')
const Coupon = require('../../models/couponSchema')



const loadUserDetails = async (req, res) => {
    try {
        const userId = req.session.user;

        const userData = await User.findOne({ _id: userId })

        const userAddressData = await Address.findOne({ userId });
        if (!userAddressData) {
            return res.render('users/profile', { user: userData })
        }


        const addresses = userAddressData.addresses.map(address => ({
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


        res.render('users/profile', { user: userData, addresses })
    }
    catch (error) {
        console.error("Error displaying  profile:", error);
        res.status(500).send("An error occurred while loading the  profile page.");
    }
}

const loadEditProfile = async (req, res) => {
    try {
        const userId = req.session.user;

        const userData = await User.findOne({ _id: userId });
        res.render('users/editProfile', { user: userData });
    }
    catch (error) {
        console.error("Error displaying edit profile:", error);
        res.status(500).send("An error occurred while loading the edit profile page.");
    }
}

const updateProfile = async (req, res) => {
    try {
        const userId = req.session.user;

        const updatedData = {
            name: req.body.name,
           
            phone: req.body.phone,
        };

        await User.findByIdAndUpdate(userId, updatedData);
        res.redirect('/profile');

    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).send("An error occurred while updating the profile.");
    }

}

const changePassword = async (req, res) => {
    try {
        const userId = req.session.user;
        const { currentPassword, newPassword, confirmPassword } = req.body;




        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.render('users/editProfile', { error: "Please fill in all fields.", user: await User.findById(userId), });
        }

        if (newPassword !== confirmPassword) {
            return res.render('users/editProfile', { error: "New passwords do not match.", user: await User.findById(userId), });
        }

        const user = await User.findById(userId);

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.render('users/editProfile', { error: "Current password is incorrect.", user: await User.findById(userId), });
        }

        if (newPassword !== confirmPassword) {
            return res.render('users/editProfile', { error: "New passwords do not match." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);


        user.password = hashedPassword;
        await user.save();

        res.redirect('/profile');
    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).send("An error occurred while changing the password.");
    }
}

const editAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const bookId = req.session.user;
        if (!userId) {
            return res.status(401).json({ message: 'Please log in to edit address.' });
        }
        //console.log("ok from edit address ")
        const { addressId } = req.params;
        console.log('Address ID:', addressId);
        const { name, houseName, city, landMark, state, pincode, phone, altPhone } = req.body;



        let address = await Address.findOne({ userId });
        if (!address) {
            return res.status(404).json({ message: 'Address not found.' });
        }


        const addressToEdit = address.addresses.id(addressId);
        if (!addressToEdit) {
            return res.status(404).json({ message: 'Address not found.' });
        }
        
        addressToEdit.name = name;
        addressToEdit.houseName = houseName;
        addressToEdit.city = city;
        addressToEdit.landMark = landMark;
        addressToEdit.state = state;
        addressToEdit.pincode = pincode;
        addressToEdit.phone = phone;
        addressToEdit.altPhone = altPhone;

        await address.save();

       
        res.redirect('/profile');
    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).send('An error occurred while updating the address.');
    }
}

const getEditAddressPage = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ message: 'Please log in to edit address.' });
        }

        const { addressId } = req.params;

        let address = await Address.findOne({ userId });
        if (!address) {
            return res.status(404).json({ message: 'Address not found.' });
        }


        const addressToEdit = address.addresses.id(addressId);
        if (!addressToEdit) {
            return res.status(404).json({ message: 'Address not found.' });
        }

        res.render('users/editAddress', { address: addressToEdit });
    } catch (error) {
        console.error('Error showing edit address form:', error);
        res.status(500).send('An error occurred while fetching the address for editing.');
    }
};
const getAddAddressPage = async(req,res)=>{
    try {
        res.render('users/addAddress')
    } catch (error) {
        console.log(error)
    }
}

const addAddress = async (req, res) => {
    try {
        const userId = req.session.user;
       

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
       
        res.redirect('/profile')
    } catch (error) {
        console.log('error', error)
    }
}


const myOrders = async (req, res) => {
    try {
        const userId = req.session.user;
        console.log(userId)

        

        const myorders = await Order.find({ userId })
            .populate({
                path: 'orderedItems.book',
                populate: { path: 'category', select: 'name' }
            })
            
            myorders.sort((a,b)=>b.createdAt - a.createdAt)

        console.log(myorders)

        if (!myorders || myorders.length === 0) {
            return res.render('users/myOrders', {
                orderItems: [],
                message: 'Your Order history is empty'
            });
        }


        const orderItems = myorders.map(order => ({
            id: order._id,
           
            totalPrice: order.totalPrice,
            finalAmount: order.finalAmount,
            paymentMethod:order.paymentMethod,
            paymentStatus : order.paymentStatus,
            items: order.orderedItems.map(item => ({
                id: item._id,
                bookName: item.book ? item.book.bookName : 'Unknown Book',
                quantity: item.quantity,
                price: item.price,
                productImage:  item.book.productImage[0]  ,
                status:item.status,
                reason: item.reason,
                offerDiscount : item.perOfferDiscount,
                couponDiscount: item.couponDiscount.toFixed(2),
                offerPrice : item.price * ((100 - item.perOfferDiscount )/100),
                finalAmount : item.finalAmount,
            })),
           
            userAddress: `${order.orderAddress[0].name},${order.orderAddress[0].houseName},${order.orderAddress[0].city},
            ${order.orderAddress[0].landMark},${order.orderAddress[0].state},${order.orderAddress[0].pincode},
            ${order.orderAddress[0].phone},${order.orderAddress[0].altPhone}`,
        }));

        // Render the myOrders view with the orderItems data
        res.render('users/myOrders', {
            orderItems
        });

    } catch (error) {
        console.error('Error retrieving order history:', error);
        res.status(500).send('Error retrieving order history.');
    }
};


const filterOrders = async (req, res) => {
    try {
        const userId = req.session.user; // Get the logged-in user's ID
        const status = req.query.status; // Get the selected status from the query parameters

        // Build the query object
        const query = { userId };
        if (status && status !== 'All') {
            query.status = status;
        }
        console.log(query)

        // Fetch the filtered orders from the database
        const orders = await Order.find(query)
            .populate({
                path: 'orderedItems.book',
                populate: { path: 'category', select: 'name' }
            })
            .sort({ createdAt: -1 });

        // Transform the orders into the desired format
        const orderItems = orders.map(order => ({
            id: order._id,
            totalPrice: order.totalPrice,
            finalAmount: order.finalAmount,
            paymentMethod:order.paymentMethod,
           
            items: order.orderedItems.map(item => ({
                id: item._id,
                bookName: item.book ? item.book.bookName : 'Unknown Book',
                quantity: item.quantity,
                price: item.price,
                productImage:  item.book.productImage[0]  ,
                status:item.status,
                reason: item.reason,
                offerDiscount : item.perOfferDiscount,
                couponDiscount: item.couponDiscount.toFixed(2),
                offerPrice : item.price * ((100 - item.perOfferDiscount )/100),
                finalAmount : item.finalAmount,
            })),
           
            userAddress: `${order.orderAddress[0].name},${order.orderAddress[0].houseName},${order.orderAddress[0].city},
            ${order.orderAddress[0].landMark},${order.orderAddress[0].state},${order.orderAddress[0].pincode},
            ${order.orderAddress[0].phone},${order.orderAddress[0].altPhone}`,
        }));

        // Respond with the filtered orders
        res.json({ success: true, orderItems });
    } catch (error) {
        console.error('Error filtering orders:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving filtered orders.',
        });
    }
};


const getOrderCancelPage = async (req, res) => {
    const itemId = req.params.id;  
    console.log(itemId);
  
    try {
     
      const order = await Order.findOne({ "orderedItems._id": itemId })
        .populate('orderedItems.book'); 
  
      if (!order) {
        return res.status(404).json({ message: 'Order not found for the given item.' });
      }
  
      
      const item = order.orderedItems.find(item => item._id.toString() === itemId);
  
      if (!item) {
        return res.status(404).json({ message: 'Item not found in this order.' });
      }
  
      
      const itemDetails = {
        id  : item._id,
        bookName: item.bookName,
        quantity: item.quantity,
        price: item.price,
        offerDiscount: item.offerDiscount,
        finalAmount: item.finalAmount,
      };
  
      console.log(itemDetails);
      const orderDetails = {
        id: order._id,
        paymentMethod: order.paymentMethod,
        orderDate :  order.createdAt ? order.createdAt.toISOString().split("T")[0] : null,
        itemDetails,
       
    };

    console.log(orderDetails)
  
     
      res.render('users/cancel-order', { orderDetails });
    } catch (error) {
      console.error("Error fetching order details:", error);
      return res.json({ success: false, message: "Internal server error" });
    }
  };
  


  const cancelOrder = async (req, res) => {
    const { itemId, reason } = req.body; // Expecting the item ID and reason from the request
    console.log(req.body);
  
    try {
      // Find the order containing the specific item in the orderedItems array
      const order = await Order.findOne({ "orderedItems._id": itemId });
      if (!order) {
        return res.status(404).json({ success: false, message: "Order or item not found." });
      }  
  
      // Find the specific item in the orderedItems array
      const item = order.orderedItems.find((item) => item._id.toString() === itemId);
      if (!item) {
        return res.status(404).json({ success: false, message: "Item not found." });
      }
      item.status = "Cancel Request";
      item.reason = reason;


      await order.save();

      console.log("Updated item status:", item);
  
      return res.json({ success: true, message: "Item canceled successfully" });
    } catch (error) {
      console.error("Error canceling order item:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  };
  






const getOrderReturnPage = async (req,res)=>{
    const itemId = req.params.id;
    console.log(itemId)
    try {
        const order = await Order.findOne({ "orderedItems._id": itemId })
        .populate('orderedItems.book');
        console.log(order)
        if(!order)
        {
            return res.status(404).json({ message: 'order not found.' });
        }

        const item = order.orderedItems.find(item => item._id.toString() === itemId);
  
        if (!item) {
          return res.status(404).json({ message: 'Item not found in this order.' });
        }

        const orderItems = order.orderedItems.map((item) => ({
            bookName: item.bookName,
            quantity: item.quantity,
            price: item.price,
            offerDiscount: item.offerDiscount,
        }));

        const itemDetails = {
            id  : item._id,
            bookName: item.bookName,
            quantity: item.quantity,
            price: item.price,
            offerDiscount: item.offerDiscount,
            finalAmount: item.finalAmount,
          };
      
          console.log(itemDetails);
          const orderDetails = {
            id: order._id,
            paymentMethod: order.paymentMethod,
            orderDate :  order.createdAt ? order.createdAt.toISOString().split("T")[0] : null,
            itemDetails,
           
        };
    
        console.log(orderDetails)
        res.render('users/return',
            {orderDetails}
        )
    } catch (error) {
        console.error("Error canceling order:", error);
      return res.json({ success: false, message: "Internal server error" });
    }
}

const returnOrder = async(req,res)=>{
    const { itemId ,reason } = req.body;
    console.log(req.body)

    try {
     

      const order = await Order.findOne({ "orderedItems._id": itemId });
      if (!order) {
        return res.status(404).json({ success: false, message: "Order or item not found." });
      }  

      const item = order.orderedItems.find((item) => item._id.toString() === itemId);
      if (!item) {
        return res.status(404).json({ success: false, message: "Item not found." });
      }
      item.status = "Return Request";
      item.reason = reason;

      await order.save();


      console.log("Updated item status:", item);

      return res.json({ success: true ,message: "Item canceled successfully" });
    } catch (error) {
      console.error("Error canceling order:", error);
      return res.json({ success: false, message: "Internal server error" });
    }
  
}





const   listAvailableCoupons = async(req,res)=>{
    try {
        const userId = req.session.user;

        const coupons = await Coupon.find();

        const availableCoupons = coupons.filter((coupon)=>{
            const userUsageCount = coupon.userUsage.get(userId) || 0;

            const userLimit = userUsageCount < coupon.usagePerUser;

            const TotalLimit = coupon.totalUses < coupon.maxTotalUsers;

            return userLimit && TotalLimit
        })
        const couponsWithRemainingUses = availableCoupons.map((coupon) => {
            const userUsageCount = coupon.userUsage.get(userId) || 0;
            const remainingUses = coupon.usagePerUser - userUsageCount;
            return { ...coupon.toObject(), remainingUses };
        });

        console.log(couponsWithRemainingUses);
         res.render('users/couponList',{coupons :couponsWithRemainingUses})
    } catch (error) {
        console.error("Error fetching available coupons:", error);
    }
}




module.exports = { 
    loadUserDetails, 
    loadEditProfile, 
    updateProfile, 
    changePassword, 
    getEditAddressPage, 
    editAddress,
    getAddAddressPage,
    addAddress ,
    myOrders,
    filterOrders,
    listAvailableCoupons,
    cancelOrder,
    getOrderCancelPage,

    getOrderReturnPage,
    returnOrder,
}