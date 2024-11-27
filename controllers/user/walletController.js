const Wallet = require('../../models/walletSchema')



const Razorpay = require('razorpay');
const crypto = require('crypto');




const loadWalletPage = async (req, res) => {
    try {
        const userId = req.session.user;

        // Fetch wallet for the user
        const wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            // If wallet does not exist, create a default object
            return res.render('users/wallet', {
                balance: 0,
                transactions: []
            });
        }

        // Sort transactions by date in descending order
        const sortedTransactions = wallet.transactions.sort((a, b) => b.date - a.date);

        let transactions = sortedTransactions.map(item => ({
            ...item.toObject(),
            date: item.date.toISOString().split("T")[0]
        }))


        transactions = transactions.slice(0, 4)

        // Render the wallet page with wallet data
        res.render('users/wallet', {
            balance: wallet.balance.toFixed(2),
            transactions: transactions
        });
    } catch (error) {
        console.error('Error loading wallet page:', error);
        res.status(500).send('Error loading wallet page.');
    }
};

const viewAllTransactions = async (req, res) => {
    try {
        const userId = req.session.user;

        const wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            // If wallet does not exist, create a default object
            return res.render('users/wallet', {
                transactions: []
            });
        }

        // Fetch wallet for the user

        const sortedTransactions = wallet.transactions.sort((a, b) => b.date - a.date);

        let transactions = sortedTransactions.map(item => ({
            ...item.toObject(),
            date: item.date.toISOString().split("T")[0]
        }))

        res.render('users/walletTrans', {
            transactions: transactions
        })


    } catch (error) {
        console.error("Error", error)
    }
}


const razorpay = new Razorpay({
    key_id: process.env.RAZERPAY_ID_KEY,     
    key_secret: process.env.RAZERPAY_SECRET_KEY,
});

const walletTopup = async (req, res) => {
    const { amount } = req.body;
    console.log(amount)

    try {

        const order = await razorpay.orders.create({
            amount: amount, // Amount in paisa
            currency: "INR",
            receipt: `receipt_${new Date().getTime()}`
        });

        res.json({
            success: true,
            order_id: order.id,
            amount: order.amount
        });


    } catch (error) {

        console.error(error);
        res.status(500).json({ success: false, error: 'Failed to create order' });

    }
}

/*const verifyPayment = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount } = req.body;

        const userId = req.session.user;


        console.log("Body : ", req.body)

        const generatedSignature = crypto
            .createHmac('sha256', 'jCW28TZMPhifXUXSBo4CVB8I')
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');


        if (generatedSignature !== razorpay_signature) {
            console.error("Signature mismatch:", { generatedSignature, razorpay_signature });
            return res.status(400).json({ success: false, message: "Invalid payment signature" });
        }

        if (generatedSignature === razorpay_signature) {
            let wallet = await Wallet.findOne({ userId: userId });

            // If wallet doesn't exist, create one
            if (!wallet) {
                wallet = new Wallet({
                    userId: userId,
                    balance: 0,
                    transactions: [],
                });
                await wallet.save();
                await User.findByIdAndUpdate(userId, { $push: { wallet: wallet._id } });
                console.log('Created and added wallet reference to user');
            }

            const numericAmount = amount / 100;
            wallet.balance += numericAmount;

            // Add a transaction entry in the wallet
            wallet.transactions.push({
                date: new Date(),
                type: 'credit',
                amount: numericAmount,
                description: `Top up`,
                razorpay_payment_id,
            });

            // Save the updated wallet
            await wallet.save();


            return res.json({ success: true, message: "Payment verified and wallet updated" });
        } else {
            return res.status(400).json({ success: false, message: "Invalid payment signature" });
        }
    }
    catch (error) {
        console.error("Error during payment verification:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }

}*/

const verifyPayment = async (req, res) => {
    try {
       
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount } = req.body;
        const userId = req.session.user;

        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !amount || !userId) {
           
            return res.status(400).json({ success: false, message: "Missing required payment data" });
        }

        

        const razorpaySecret = process.env.RAZERPAY_SECRET_KEY;
        const generatedSignature = crypto
            .createHmac('sha256', razorpaySecret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            console.error("Signature mismatch:", { generatedSignature, razorpay_signature });
            return res.status(400).json({ success: false, message: "Invalid payment signature" });
           
        }

        const numericAmount = amount / 100;

        let wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            wallet = new Wallet({
                userId,
                balance: 0,
                transactions: [],
            });
            await wallet.save();

            await User.findByIdAndUpdate(userId, { $push: { wallet: wallet._id } });
            console.log('Created and linked wallet to user');
        }

        const transactionEntry = {
            date: new Date(),
            type: 'credit',
            amount: numericAmount,
            description: 'Top up',
            razorpay_payment_id,
        };

        wallet.balance += numericAmount;
        wallet.transactions.push(transactionEntry);
        await wallet.save();

        return res.json({ success: true, message: "Payment verified and wallet updated" });

    } catch (error) {
        console.error("Error during payment verification:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};



const validateWallet =  async (req, res) => {
    
    try {
        const { amount } = req.body;
     
        const userId = req.session.user;

        const wallet = await Wallet.findOne({userId})
        if (!wallet) {
            return res.json({ error: 'Payment error: Insufficient wallet balance.' });
          }

        if (amount > wallet.balance) {
            return res.json({ error: 'Payment error: Insufficient wallet balance.' });
          }
       
    } catch (error) {
        console.error('Error validation of COD :', error);
    }
}


module.exports = {
    loadWalletPage,
    viewAllTransactions,
    verifyPayment,
    walletTopup,
    validateWallet,
}