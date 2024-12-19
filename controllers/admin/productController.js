const Books = require('../../models/bookSchema')
const Category = require('../../models/categorySchema')
const User = require('../../models/userSchema')
const multer = require('multer');
const fs = require('fs')
const path = require('path')
const sharp = require('sharp');


const getAddBooksPage = async (req, res) => {
    try {
        const category = await Category.find({ status: "listed" })
        res.render('admin/addBooks', {
            categories: category,
        })
    } catch (error) {
        console.error(error)
    }
}

const addBooks = async (req, res) => {
    try {
        const books = req.body;
        const bookExists = await Books.findOne({
            bookName: books.bookName,

        });
        

        if (!bookExists) {
           
            let images = [];
            if (req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                

                    const originalImagePath = req.files[i].path;

                    const resizedImagePath = path.join('public', 'uploads', 'product-images', req.files[i].filename);
                    await sharp(originalImagePath).resize({ width: 440, height: 440 }).toFile(resizedImagePath);
                    images.push(req.files[i].filename);
                }
               console.log(req.files)
                    
            }
            else{
                console.log('Error while assing images')
            }

               


               

            const categoryId = await Category.findOne({ _id: books.category });
            if (!categoryId) {
                return res.status(400).json("invalid category name");
                console.log('category not found')
            }

            const newBook = new Books({
                bookName: books.bookName,
                authorName:books.authorName,
                description: books.description,
                category: books.category,
                regularPrice: books.regularPrice,
                salePrice: books.salePrice,
                createdAt: new Date(),
                quantity: books.quantity,
                productImage: images,
                //status: 'Available',
                status : books.quantity < 5 ? "Limited Stock" : books.quantity === 0 ? "Out of Stock"  :  "Available" ,


            })

            await newBook.save();
            return res.redirect('/admin/addBooks')
        }
        else {
            //return res.status(400).json("Books allready exits ,please try with another")
            return res.render('admin/addBooks', { message: "Book already exists" });
        }


    } catch (error) {
        console.error(error)

    }
}

const getAllBooks = async (req, res) => {
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

        const bookData = await Books.find({
            $or: [
                { bookName: { $regex: ".*" + search + ".*", $options: "i" } }
              ]
        })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .populate("category")
        .exec();

        const count = await Books.countDocuments({
            $or: [
                { bookName: { $regex: ".*" + search + ".*", $options: "i" } }
              ]
        });
        const books = bookData.map(book => ({
            ...book.toObject(),
            createdAt: book.createdAt.toISOString().split("T")[0]
          }));
          console.log(books)
          const cat = await Category.find({ _id:books.category });
          console.log(cat)
        const categories = await Category.find({ status: "listed" });
        if (categories) {
            res.render('admin/books', {
                data: books,
                
                currentPage: page,
                totalPages: Math.ceil(count / limit), 
                categories: categories,
                search 
            });
        } else {
            console.log("Error in fetching categories");
            res.status(500).send("Error fetching categories");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred while fetching books");
    }
}

const editBook = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;

        const book = await Books.findById(id);
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }
        const categoryId = await Category.findOne({ _id: updatedData.category });
        if (!categoryId) {
            return res.status(400).json("invalid category name");
            console.log('category not found')
        }

        if(updatedData.quantity < 5)
        {
            await Books.updateOne({ _id: id }, { $set: { status: "Limited Stock" } });
        }
        else if (updatedData.quantity === 0 )
        {
            await Books.updateOne({ _id: id }, { $set: { status: "Out of Stock" } });
        }
       

        // Update fields with new data
        book.bookName = updatedData.bookName;
        book.authorName = updatedData.authorName;
        book.description = updatedData.description;
        book.regularPrice = updatedData.regularPrice;
        book.salePrice = updatedData.salePrice;
        book.quantity = updatedData.quantity;
        book.category = updatedData.category;

        // Handle new images upload
        if (req.files && req.files.length > 0) {
            const images = [];
            for (let i = 0; i < req.files.length; i++) {
                const originalImagePath = req.files[i].path;
                const resizedImagePath = path.join('public', 'uploads', 'product-images', req.files[i].filename);
                
                await sharp(originalImagePath).resize({ width: 440, height: 440 }).toFile(resizedImagePath);
                images.push(req.files[i].filename);
            }
            book.productImage = images;
        }

        await book.save();
        res.redirect(`/admin/books`);
    } catch (error) {
        console.error("Error updating book:", error);
        res.status(500).json({ message: "Error updating book" });
    }
};

const getEditBookPage = async (req, res) => {
    try {
        const { id } = req.params;
        const book = await Books.findById(id);
        const categories = await Category.find({status: "listed"}); // Fetch all categories
        

        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }

        res.render("admin/editBook", { book, categories });
    } catch (error) {
        console.error("Error fetching book details:", error);
        res.status(500).json({ message: "Error fetching book details" });
    }
};

// updation of in stock 
const updateStatus = async (req, res) => {
    try {
        const bookId = req.params.id;
        const newStatus = req.body.status;

        await Books.updateOne({ _id: bookId }, { $set: { status: newStatus } });

        res.redirect('/admin/books');
    } catch (error) {
        console.error("Error updating book status:", error);
        res.status(500).send("Server Error");
    }
};



  // update  action (block and unblock)
  const updateBookStatus = async (req, res) => {
    try {
      const bookId = req.params.id;
      const action = req.body.status;
      const Blocked = action === 'block';
      const updateBook = await Books.updateOne({ _id: bookId }, { $set: { isBlocked:Blocked } });

    
      res.redirect('/admin/books');
    } catch (error) {
      console.error("Error updating book status:", error);
      res.status(500).send("Server Error");
    }
  };
  

  const deleteBook = async (req,res)=>{
    try {
        const bookId = req.params.id;
        const deletedBook = await Books.findByIdAndDelete(bookId);

        if (deletedBook) {
            res.status(200).json({ success: true, message: "Book deleted successfully." });
        } else {
            res.status(404).json({ success: false, message: "Book not found." });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}




module.exports = {
    getAddBooksPage,
    addBooks,
    getAllBooks,
    getEditBookPage,
    editBook,
    updateStatus,
    updateBookStatus,
    deleteBook
}


















