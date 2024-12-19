const User = require("../../models/userSchema");

const userInfo = async (req, res) => {
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

    
    const userData = await User.find({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*", $options: "i" } }, 
        { email: { $regex: ".*" + search + ".*", $options: "i" } }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit)
    .exec();

    // Count total number of matching documents
    const count = await User.find({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { email: { $regex: ".*" + search + ".*", $options: "i" } }
      ]
    }).countDocuments();
    console.log(userData)
    //date only
    const users = userData.map(user => ({
      ...user.toObject(),
      createdAt: user.createdAt.toISOString().split("T")[0]
    }));

    const totalPages = Math.ceil(count / limit);
        const prevPage = page > 1 ? page - 1 : null;
        const nextPage = page < totalPages ? page + 1 : null;

        // Pass data to the view
        res.render('admin/users', {
            users: users,
            totalPages: totalPages,
            currentPage: page,
            search: search,
            prevPage: prevPage,
            nextPage: nextPage
        });

  } catch (error) {
    console.error("Error fetching user info:", error);
    res.status(500).send("Server Error");
  }
};







//user Status
const updateUserStatus = async (req, res) => {
  try {
      const userId = req.params.id;
      const status = req.body.status;

      // Determine the status to set based on the form selection
      const isBlocked = status === 'block';

      // Update the user's block status in the database
      await User.updateOne({ _id: userId }, { $set: { isBlocked: isBlocked } });

      res.redirect('/admin/users');
  } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).send("Server Error");
  }
}

module.exports = {
  userInfo,
  updateUserStatus,
};
