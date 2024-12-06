const User = require('../../models/userSchema')
const Books = require('../../models/bookSchema')
const Category = require('../../models/categorySchema')
const Offer = require('../../models/offerSchema')
const Wallet = require('../../models/walletSchema')

const env = require('dotenv').config()
const nodemailer = require('nodemailer')

const bcrypt = require('bcrypt')


//loadhome
const loadHome = async (req, res) => {
    try {
        const categories = await Category.find({ status: "listed" })

        let bookData = await Books.find(
            {
                isBlocked: false,
                category: { $in: categories.map(category => category._id) }, quantity: { $gt: 0 }
            }
        )

        bookData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        bookData = bookData.slice(0, 4);

        const books = bookData.map(item => ({
            ...item.toObject(),
            category: item.category.name,
        }))

        for (let item of books) {
            console.log(item.bookName)
            const catOffers = await Offer.find({ category: item.category })
            const bookOffers = await Offer.find({ bookName: item.bookName })
            catOffers.sort((a, b) => b.discount - a.discount)
            bookOffers.sort((a, b) => b.discount - a.discount)
            //console.log(catOffers)
            // console.log(bookOffers)
            if (!catOffers && !bookOffers) {
                console.log("ok")
                continue;
            }

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
            console.log(offer)
            item.offerName = offer.offerName;
            item.discount = offer.discount;
            item.offerPrice = item.salePrice * ((100 - offer.discount) / 100);

        }
        console.log(books)



        //collections 

        let collection = await Books.find({
            isBlocked: false,
            category: { $in: categories.map(category => category._id) },
            quantity: { $gt: 0 }
        })
            .populate("category");



        collection = collection.slice(0, 4);
        // console.log(collection)


        const collections = collection.map(item => ({
            ...item.toObject(),
            category: item.category.name,

        }));


        for (let item of collections) {
            console.log(item.bookName)
            const catOffers = await Offer.find({ category: item.category })
            const bookOffers = await Offer.find({ bookName: item.bookName })
            catOffers.sort((a, b) => b.discount - a.discount)
            bookOffers.sort((a, b) => b.discount - a.discount)
            //console.log(catOffers)
            // console.log(bookOffers)
            if (!catOffers && !bookOffers) {
                console.log("ok")
                continue;
            }

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
            console.log(offer)
            item.offerName = offer.offerName;
            item.discount = offer.discount;
            item.offerPrice = item.salePrice * ((100 - offer.discount) / 100);




        }
        //console.log(collections)



        res.render('users/homeBfLog', { Newbooks: books, books: collections });
    } catch {
        console.log("Home page not found");
        res.status(500).send("Server Error")
    }
}


//loadlogin
const loadLogin = async (req, res) => {
    try {
        res.render('users/login')
    }
    catch {
        console.log("Login page not found");
        res.status(500).send("Server Error")
    }
}

//loadsignup
const loadsignup = async (req, res) => {
    try {
        res.render('users/signup')
    }
    catch {
        console.log("Signup page not found");
        res.status(500).send("Server Error")
    }
}

//otp creation
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
//email verification
async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            }
        })
        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify Your Account",
            text: `Your OTP is ${otp}`,
            html: `<b> OTP : ${otp}</b>`
        }
        const info = await transporter.sendMail(mailOptions)

        //return info.accepted.length > 0
        console.log('Email sent : ', info.messageId)
        return true;
    } catch (error) {
        console.error("Error sending email", error)
        return false;
    }
}


//signup validation
const signup = async (req, res) => {
    try {
        const { name, phone, email, password, confirmPassword, referalCode } = req.body;

        const existUser = await User.findOne({ email })
        console.log(existUser)
        if (existUser) {
            return res.render('users/signup', { message: "User With this Email already exists" });
        }

        const otp = generateOtp();
        console.log(email)
        const emailSend = await sendVerificationEmail(email, otp);
        if (!emailSend) {
            return res.json('email.error')
        }

        req.session.userOtp = otp;
        req.session.userData = { name, phone, email, password, referalCode };
        res.render('users/verifyOtp')
        console.log(`OTP : ${otp}`)
    } catch (error) {
        console.error('signup error', error);
    }
}

//OTP verification

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash;
    } catch (error) {

    }
}

const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log("Received OTP:", otp);
        console.log("Session OTP:", req.session.userOtp);

        const status = otp === req.session.userOtp;
        console.log(status);

        if (status) {
            const user = req.session.userData;

            // Check if the user already exists based on email or googleId
            const existingUser = await User.findOne({ email: user.email });

            if (existingUser) {
                res.status(400).json({ success: false, message: "User already exists" });
                console.log("Error: User already exists");
                return;
            }

            console.log('User does not exist, proceeding with registration');

            const passwordHash = await securePassword(user.password);

            // Example: Node.js code snippet for referral code generation
            const generateReferralCode = (username) => {
                return username + Math.random().toString(36).substring(2, 8).toUpperCase();
            };

            // user data, 
            const saveUserData = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHash,
                referalCode: generateReferralCode(user.name),
                // googleId: user.googleId || undefined,//bcz of googleId
            });

            
            // Insert the new user
            const newUser = await saveUserData.save();
            console.log("New user inserted:", newUser);

            req.session.user = newUser._id;

            const referredUser = await User.findOne({ referalCode: user.referalCode })
            
            if (referredUser) {
                const referredUserId = referredUser._id;
                console.log(referredUserId)
                let wallet = await Wallet.findOne({ userId: referredUserId });

                // If wallet doesn't exist, create one
                if (!wallet) {
                    wallet = new Wallet({
                        userId: referredUserId,
                        balance: 0,
                        transactions: [],
                    });
                    await wallet.save();
                    await User.findByIdAndUpdate(referredUserId, { $push: { wallet: wallet._id } });
                    console.log('Created and added wallet reference to user');
                }
                //console.log(wallet)

                // Add the refund amount to the wallet
                wallet.balance += 300;

                // Add a transaction entry in the wallet
                wallet.transactions.push({
                    date: new Date(),
                    type: 'credit',
                    amount: 300,
                    description: `Refferal Amount`,
                });

                // Save the updated wallet
                await wallet.save();
                console.log(wallet)
            }
            if (user.referalCode) {
                let wallet = await Wallet.findOne({ userId: req.session.user });

                // If wallet doesn't exist, create one
                if (!wallet) {
                    wallet = new Wallet({
                        userId: req.session.user,
                        balance: 0,
                        transactions: [],
                    });
                    await wallet.save();
                    await User.findByIdAndUpdate(req.session.user, { $push: { wallet: wallet._id } });
                    console.log('Created and added wallet reference to user');
                }
                //console.log(wallet)

                // Add the refund amount to the wallet
                wallet.balance += 200;

                // Add a transaction entry in the wallet
                wallet.transactions.push({
                    date: new Date(),
                    type: 'credit',
                    amount: 200,
                    description: `Refferal Amount`,
                });

                // Save the updated wallet
                await wallet.save();
                console.log(wallet)
            }



            res.json({ success: true, redirectUrl: "/homelog" });
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP, please try again" });
            console.log("Error: Invalid OTP");
        }
    } catch (error) {
        console.error("Error Verifying OTP", error);
        res.status(500).json({ success: false, message: "An error occurred" });
    }
};

// Resend OTP 
const resendOtp = async (req, res) => {
    try {
        const { email } = req.session.userData;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email not found in session" })
        }

        const otp = generateOtp();
        req.session.userOtp = otp;

        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log("Resend OTP : ", otp);
            res.status(200).json({ success: true, message: "OTP Resend successfully" })
        } else {
            res.status(500).json({ success: false, message: "Failed to resend OTP .Please try again" });
        }
    } catch (error) {
        console.error("Error resending OTP", error);
        res.status(500).json({ success: false, message: "Internal Server Error. Please try again" })
    }
}

//login valodation
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        console.log(user);

        if (!user) {
            return res.render('users/login', { message: "User not found" });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.render("users/login", { message: "Password is incorrect" });
        } else if (user.isBlocked) {
            return res.render("users/login", { message: "User is blocked" });
        } else {

            req.session.user = user._id;
            console.log(req.session.user)

            const categories = await Category.find({ isListed: true });
            let bookData = await Books.find({
                isBlocked: false,
                category: { $in: categories.map(category => category._id) },
                quantity: { $gt: 0 }
            });

            bookData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            bookData = bookData.slice(0, 4);


            let collections = await Books.find({
                isBlocked: false,
                category: { $in: categories.map(category => category._id) },
                quantity: { $gt: 0 }
            });
            collections = collections.slice(0, 4);

            //res.render('users/homelog', { Newbooks: bookData, books: collections });
            res.redirect('/homelog')
        }
    } catch (error) {
        console.error("Login error:", error);
        res.render('users/login', { message: "Something went wrong" });
    }
};



const loadhomelog = async (req, res) => {
    try {
        const categories = await Category.find({ isListed: true })
        let offer;


        let bookData = await Books.find(
            {
                isBlocked: false,
                category: { $in: categories.map(category => category._id) }, quantity: { $gt: 0 }
            }
        )
            .populate("category");


        bookData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        bookData = bookData.slice(0, 4);

        const books = bookData.map(item => ({
            ...item.toObject(),
            category: item.category.name,
        }))

        for (let item of books) {
            console.log(item.bookName)
            const catOffers = await Offer.find({ category: item.category })
            const bookOffers = await Offer.find({ bookName: item.bookName })
            catOffers.sort((a, b) => b.discount - a.discount)
            bookOffers.sort((a, b) => b.discount - a.discount)
            //console.log(catOffers)
            // console.log(bookOffers)
            if (!catOffers && !bookOffers) {
                console.log("ok")
                continue;
            }

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
            console.log(offer)
            item.offerName = offer.offerName;
            item.discount = offer.discount;
            item.offerPrice = item.salePrice * ((100 - offer.discount) / 100);

        }
        console.log(books)



        //collections 

        let collection = await Books.find({
            isBlocked: false,
            category: { $in: categories.map(category => category._id) },
            quantity: { $gt: 0 }
        })
            .populate("category");



        collection = collection.slice(0, 4);
        // console.log(collection)


        const collections = collection.map(item => ({
            ...item.toObject(),
            category: item.category.name,

        }));


        for (let item of collections) {
            console.log(item.bookName)
            const catOffers = await Offer.find({ category: item.category })
            const bookOffers = await Offer.find({ bookName: item.bookName })
            catOffers.sort((a, b) => b.discount - a.discount)
            bookOffers.sort((a, b) => b.discount - a.discount)
            //console.log(catOffers)
            // console.log(bookOffers)
            if (!catOffers && !bookOffers) {
                console.log("ok")
                continue;
            }

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
            console.log(offer)
            item.offerName = offer.offerName;
            item.discount = offer.discount;
            item.offerPrice = item.salePrice * ((100 - offer.discount) / 100);




        }
        //console.log(collections)





        res.render('users/homelog', {
            Newbooks: books, books: collections,
            breadcrumbs: [
                { name: "Home", url: "/homelog" },
            ],
        })
    }
    catch (error) {
        res.render('users/signup')
    }
}



const loadviewMore = async (req, res) => {
    try {
        const categories = await Category.find({ status: "listed" })
        const sortOption = req.query.sort || 'new';
        const searchQuery = req.query.search || '';
        const selectedCategory = req.query.category || 'All';
       
        console.log(searchQuery)

        let categoryFilter = {};
        if (selectedCategory !== 'All') {
            const category = categories.find(cat => cat.name === selectedCategory);
            if (category) {
                categoryFilter.category = category._id;
            } else {
                return res.status(404).send('Category not found');
            }
        } else {
            categoryFilter.category = { $in: categories.map(cat => cat._id) };
        }

        let sortCriteria;

        if (sortOption === 'priceLowHigh') {
            sortCriteria = { salePrice: 1 };
        } else if (sortOption === 'priceHighLow') {
            sortCriteria = { salePrice: -1 };
        } else if (sortOption === 'alphaAsc') {
            sortCriteria = { bookName: 1 };
        } else if (sortOption === 'alphaDesc') {
            sortCriteria = { bookName: -1 };
        } else {
            sortCriteria = { createdAt: -1 };
        }


        const searchCriteria = {
            isBlocked: false,
           // category: { $in: categories.map((category) => category._id) },
           ...categoryFilter,
            quantity: { $gt: 0 },
            $or: [
                { bookName: { $regex: searchQuery, $options: 'i' } },
                { authorName: { $regex: searchQuery, $options: 'i' } }
            ]
        };

       


        const bookData = await Books.find(searchCriteria).sort(sortCriteria)
            .populate("category");

        let offer;


        const books = bookData.map(item => ({
            ...item.toObject(),
            category: item.category.name,

        }))

        for (let item of books) {
            console.log(item.bookName)
            const catOffers = await Offer.find({ category: item.category })
            const bookOffers = await Offer.find({ bookName: item.bookName })
            catOffers.sort((a, b) => b.discount - a.discount)
            bookOffers.sort((a, b) => b.discount - a.discount)
            //console.log(catOffers)
            // console.log(bookOffers)
            if (!catOffers && !bookOffers) {
                console.log("ok")
                continue;
            }

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
            console.log(offer)
            item.offerName = offer.offerName;
            item.discount = offer.discount;
            item.offerPrice = item.salePrice * ((100 - offer.discount) / 100);

        }

        console.log(books)

        res.render('users/viewmore', {
            books: books,
            categories, // All categories for the filter UI

            breadcrumbs: [
                { name: "Home", url: "/homelog" },
                { name: "viewmore", url: "/viewmore" }
            ],
            sortOption,
            searchQuery,
            selectedCategory
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading books');
    }
};








//bood details
const bookDetails = async (req, res) => {
    try {
        const bookId = req.params.id;
        const categories = await Category.find({ isListed: true })

        const books = await Books.findById(bookId)
        .populate("category")

        //console.log("Cat",books.category.name)


        let bookData = await Books.find(
            { 
                category : books.category._id, _id: { $ne: bookId } ,quantity: { $gt: 0 }
            }
        )
            .populate("category")
        console.log("Listed",bookData)


        bookData = bookData.slice(0, 4);
        let bookOffer ;

        const ListedBooks = bookData.map(item => ({
            ...item.toObject(),
            category: item.category.name,

        }))
        for (let item of ListedBooks) {
            console.log(item.bookName)
            const catOffers = await Offer.find({ category: item.category })
            const bookOffers = await Offer.find({ bookName: item.bookName })
            catOffers.sort((a, b) => b.discount - a.discount)
            bookOffers.sort((a, b) => b.discount - a.discount)
            //console.log(catOffers)
            // console.log(bookOffers)
            if (!catOffers && !bookOffers) {
                console.log("ok")
                continue;
            }

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
                console.log(`No valid offers for ${item.bookName}. Moving to the next item.`);
                continue;
            }
            else if (!greatestDiscountcatOffer) {
                bookOffer = greatestDiscountbookOffer;
            }
            else if (!greatestDiscountbookOffer) {
                bookOffer = greatestDiscountcatOffer;
            }
            else {
                bookOffer = greatestDiscountbookOffer.discount > greatestDiscountcatOffer.discount ? greatestDiscountbookOffer : greatestDiscountcatOffer
            }
            console.log(bookOffer)
            item.bookOfferName = bookOffer.offerName;
            item.bookOfferDiscount = bookOffer.discount;
            item.bookOfferOfferPrice = item.salePrice * ((100 - bookOffer.discount) / 100);


        }


        //console.log(ListedBooks)
        // console.log(bookId)



       /* const books = await Books.findById(bookId)
            .populate("category")*/


        console.log(books._id)
        if (!books) {
            return res.status(404).send("Book not found");
        }


        //offers
        const catOffers = await Offer.find({ category: books.category.name })
        const bookOffers = await Offer.find({ bookName: books.bookName })
        catOffers.sort((a, b) => b.discount - a.discount)
        bookOffers.sort((a, b) => b.discount - a.discount)
        // console.log(catOffers)
        // console.log(bookOffers)

        if (catOffers.length === 0 && bookOffers.length === 0) {
            console.log('No offers available for this category');
            return res.render('users/bookDetails', {
                book: books, books: bookData,
                breadcrumbs: [
                    { name: "Home", url: "/homelog" },
                    { name: "viewmore", url: "/viewmore" },
                    { name: "bookdetails", url: "/bookDetails/:id" },

                ]
            });

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

        let offer;

        if (!greatestDiscountcatOffer && !greatestDiscountbookOffer) {
            console.log('No  Active offers ');
            return res.render('users/bookDetails', {
                book: books, books: bookData,
                breadcrumbs: [
                    { name: "Home", url: "/homelog" },
                    { name: "viewmore", url: "/viewmore" },
                    { name: "bookdetails", url: "/bookDetails/:id" },

                ]
            })
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



       // console.log(offer)

        const offerDetails = {
            name: offer.offerName,
            discount: offer.discount,
            salePrice: books.salePrice,
            offerPrice: books.salePrice * ((100 - offer.discount) / 100)
        }

       // console.log(offerDetails)
        //end of offers

        //console.log(books);
        res.render('users/bookDetails', {
            book: books, books: ListedBooks, offer: offerDetails,
            breadcrumbs: [
                { name: "Home", url: "/homelog" },
                { name: "viewmore", url: "/viewmore" },
                { name: "bookdetails", url: "/bookDetails/:id" },

            ]
        });
    } catch (error) {
        console.error("Error fetching book details:", error);
        res.status(500).send("Internal Server Error");
    }
};




const logout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.log("Session destuction error", err.message)
                //return res.redirect('')
            }
            return res.redirect('/')
        })

    }
    catch (error) {
        console.log('Logout error', error)
    }
}


module.exports = {
    loadHome,
    loadLogin,
    loadsignup,
    signup,
    verifyOtp,
    login,
    loadhomelog,
    resendOtp,
    loadviewMore,
    bookDetails,
    logout,
   

}