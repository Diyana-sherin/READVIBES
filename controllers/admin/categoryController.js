const Books = require('../../models/bookSchema')
const Category = require('../../models/categorySchema');


// Controller to get paginated category information
const categoryInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        const category = await Category.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);

        //pages
        const prevPage = page > 1 ? page - 1 : null;
        const nextPage = page < totalPages ? page + 1 : null;


        const categoryData = category.map(item => ({
            ...item.toObject(),
            createdAt: item.createdAt.toISOString().split("T")[0]
          }));



        res.render('admin/category', {
            categories: categoryData,
            currentPage: page,
            totalPages: Array.from({ length: totalPages }, (_, i) => i + 1),
            prevPage: prevPage,
            nextPage: nextPage,
            totalCategories: totalCategories
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading categories");
    }
};

//load add category 
const loadAddCategory = async (req, res) => {
    try {
        res.render('admin/addCategory');
    } catch {
        console.log("Add page not found");
        res.status(500).send("Server Error")
    }
}

//Add a new category
const addCategory = async (req, res) => {
    console.log (req.body)
    const { name, description } = req.body;
    try {
        const exists = await Category.findOne({ name });
        if (exists) {
            return res.render('admin/addCategory', { message: "Category already exists" });
        }
        
  
            console.log('ok')
            const newCategory = new Category({
                name,
                description,
                //addedAt: Category.createdAt.toISOString().split("T")[0]
            });

            await newCategory.save();
            res.redirect('/admin/category');
        
        console.log('ok')
    } catch (error) {
        console.error(error);
        res.status(500).render('admin/addCategory', { message: "Error adding category" });
    }
};

//load edit page
const getEditCategory = async (req, res) => {
    const { id } = req.params;
    try {
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).render('admin/editCategory', { message: 'Category not found' });
        }
        res.render('admin/editCategory', { category });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading category');
    }
};

//update
const updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    try {
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).render('admin/editCategory', { message: 'Category not found' });
        }

        category.name = name;
        category.description = description;
        await category.save();

        res.redirect('/admin/category');
    } catch (error) {
        console.error(error);
        res.status(500).render('admin/editCategory', { message: 'Error updating category' });
    }
};


const updateCategoryStatus = async (req, res) => {
    try {
      const categoryId = req.params.id;
      const newStatus = req.body.status;
  
      // Update the category status in the database
      await Category.findByIdAndUpdate(categoryId, { status: newStatus });
  
      // Redirect back to the category list page
      res.redirect('/admin/category');
    } catch (error) {
      console.error("Error updating category status:", error);
      res.status(500).send("Internal Server Error");
    }
  };


  const deleteCategory = async (req,res)=>{
    try {
        const catId = req.params.id;
        const deletedCat = await Category.findByIdAndDelete(catId);

       

        if (deletedCat) {
            res.status(200).json({ success: true, message: "Category deleted successfully." });
        } else {
            res.status(404).json({ success: false, message: "Category not found." });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}





module.exports = { 
    categoryInfo, 
    addCategory,
    loadAddCategory,
    getEditCategory, 
    updateCategory,
    updateCategoryStatus,
    deleteCategory
};
