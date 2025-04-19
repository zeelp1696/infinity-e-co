const express = require("express");
const mongoose = require('mongoose');
const path = require("path");
const app = express();
const session = require('express-session');
const hbs = require("hbs");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const bodyParser = require('body-parser');
const cartRoutes = require('./Routes/cartRoutes');
const productRoutes = require('./Routes/productRoutes'); // Import the product routes
const paymentRoutes = require('./Routes/paymentRoutes'); // Add payment routes
const User = require('./models/user'); // Import your User model
const Product = require('./models/product'); // Import your Product model
const Order = require("./models/Order"); // Ensure the correct path
console.log("Order model:", Order);

const cors = require('cors');

const fs = require('fs');
const cheerio = require('cheerio');



const Cart = require('./models/Cart'); // Import your Cart model



require("./db/conn");

const Register = require("./models/registers");
//const { console } = require("inspector");







const static_path = path.join(__dirname, "../infinity" ); 
const templates_path = path.join(__dirname, "../templates/views" ); 
const partials_path = path.join(__dirname, "../templates/partials" ); 

//console.log("Before initializing middleware");


  //make passport.js


// User serialization and deserialization for session management
// passport.serializeUser((user, done) => {
//     done(null, user);
//   });

//   passport.deserializeUser((user, done) => {
//     done(null, user);
//   });
  
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/cart", cartRoutes); 


//console.log("Before setting static path");
app.use(express.static(static_path));
//console.log("Static path set");

//console.log("About to start the server...");

//console.log("After app.listen()");


app.set("view engine", "hbs");
app.set("views", templates_path);
hbs.registerPartials(partials_path);

app.get("/blog", (req,res) =>{
    res.render("blog");
})

app.get("/boys", (req,res) =>{
    res.render("boys");
})

app.get("/cart", (req,res) =>{
    res.render("cart");
})

app.get("/payment", (req,res) =>{
    res.render("payment");
})

app.get("/order-confirmation", (req, res) => {
    res.render("order-confirmation");  // Ensure you have `order-confirmation.hbs`
});

app.get("/", (req,res) =>{
    console.log("GET /index route accessed");
    res.render("index");
});

app.get("/register", (req,res) =>{
    res.render("register");
})

app.get("/login", (req,res) =>{
    res.render("login");
})

app.get("/index", (req,res) =>{
    res.render("index");
})

app.get("/contact", (req,res) =>{
    res.render("contact");
})




//create a new user
app.post("/register",async (req,res) =>{
    try{
        const password = req.body.Password;
        const cpassword = req.body.ConfirmPassword;

        if(password === cpassword)
        {
            const registerCustomer = new Register({
                Fullname : req.body.Fullname,
                Email : req.body.Email,
                Password : password,
                ConfirmPassword : cpassword
            });

            //console.log("the succesful part is: " + registerCustomer);
            
            //const token = await registerCustomer.generateAuthToken();
            //console.log("the token part is : " + token);
            
            //password hash

            const registerd = await registerCustomer.save();
            res.status(201).redirect("index");
        }else{
            res.send("password does not match");
        }
    } catch(error){
        console.error(error)
        res.status(400).send(error);
    }
});

//for login 
app.post("/index", async (req, res) => {
    try {
        const email = req.body.Email;
        const password = req.body.Password;

        //find user by email
        const user_email = await Register.findOne({Email:email});

        // Check if user exists
        if (!user_email) {
            return res.status(404).send("User not found");
        }

        const ismatch =await bcrypt.compare(password, user_email.Password)

        if(ismatch){
            res.status(201).render("index", {loginSuccess: true});
           
        }else{
            res.send("password does not match");
        }
        
        

    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

// 📌 Read and Parse HBS File
const hbsFilePath = path.join(__dirname, '../templates/views/boys.hbs');
if (!fs.existsSync(hbsFilePath)) {
    console.error("❌ Error: HBS file not found at:", hbsFilePath);
} 
    const hbsFile = fs.readFileSync(hbsFilePath, 'utf8');
    const $ = cheerio.load(hbsFile);

    // 📌 Extract product details
    const products = [];
    $('.product-box').each((index, element) => {
        const name = $(element).find('h3').text().trim();
        const priceText = $(element).find('.price').text().trim();
        const price = parseFloat(priceText.replace('$', ''));
        const image = $(element).find("img").attr("src");

        if (name && !isNaN(price) && image) {
            products.push({ name, price, image });
        }
    });

    //console.log("Extracted Products:", products);

    // 📌 Function to Insert Products into MongoDB
    const insertProducts = async () => {
        try {
            const existingProducts = await Product.find();
            if (existingProducts.length === 0) {
                await Product.insertMany(products);
                console.log("✅ Products added to MongoDB!");
            } else {
                console.log("⚠️ Products already exist in the database.");
            }
        } catch (error) {
            console.error("❌ Error inserting products:", error);
        }
    };

    mongoose.connection.once("open", () => {
        console.log("📡 MongoDB connection established, inserting products...");
        insertProducts();
    });

    // 📌 Extract name-image pairs
const productImages = {};
$('.product-box').each((index, element) => {
    const name = $(element).find('h3').text().trim();
    const image = $(element).find("img").attr("src"); // ✅ Extract image URL

    if (name && image) {
        productImages[name] = image; // Store in object for quick lookup
        //console.log(`📸 Extracted: ${name} -> ${image}`);  // ✅ Debugging
    }
});

// 📌 Update Existing Products in MongoDB
const updateProducts = async () => {
    try {
        const updates = Object.entries(productImages).map(async ([name, image]) => {
            const updated = await Product.findOneAndUpdate(
                { name },  // Match product by name
                { $set: { image } },  // Update image field
                { new: true } // Return updated document
            );
            if (updated) {
                //console.log(`✅ Updated product: ${name} with image: ${image}`);
            } else {
                console.log(`⚠️ Product not found for name: ${name}`);
            }
        });

        await Promise.all(updates);
        console.log("✅ All products updated!");
    } catch (error) {
        console.error("❌ Error updating products:", error);
    } 
};

// 📌 Execute after MongoDB connection is established
mongoose.connection.once("open", async () => {
    console.log("📡 MongoDB connected, updating products with images...");
    await updateProducts();
});












//  securepassword = async (password) =>{
//     const passwordhash = await bcrypt.hash(password, 10);
//     console.log(passwordhash);

//     const passwordcomp = await bcrypt.compare(password, passwordhash);
//     console.log(passwordcomp);
// }

// securepassword("zeel123");


//  const createToken = async() =>{
//     const token = await  jwt.sign({_id:"67735d4972b73b4900e5e9d0"},"mynameiszeelandiambackenddeveloper",{
//      expiresIn: "10s"
//     });
//     //console.log(token);

//     const userVer = await jwt.verify(token, "mynameiszeelandiambackenddeveloper");
//     console.log(userVer);
//  }

// createToken();


// Configure Google OAuth Strategy
// passport.use(
//     new GoogleStrategy(
//       {
//         clientID: process.env.GOOGLE_CLIENT_ID,
//         clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//         callbackURL: process.env.GOOGLE_CALLBACK_URL,
//       },
//       (accessToken, refreshToken, profile, done) => {
//         // Save user info or generate a JWT here
//         // For simplicity, we are returning the profile
//         return done(null, profile);
//       }
//     )
//   );


// MongoDB Connection

// Routes


// ... other routes (user routes, product routes, etc.)


app.use(cors());

const orders = [];  // Temporary storage (use DB in production)

// API to handle COD orders
// 🔹 API Route to Store Order
app.post("/api/place-order", async (req, res) => {
    try {
        console.log("📥 Order received:", req.body); // Debug log

        const { name, address, pincode, paymentMethod, amount } = req.body;

        if (!name || !address || !pincode || !paymentMethod || !amount) {
            console.log("⚠️ Missing required fields");
            return res.status(400).json({ success: false, message: "All fields are required." });
        }

        const newOrder = new Order({
            name,
            address,
            pincode,
            paymentMethod,
            amount,
            status: "Pending",
        });

        await newOrder.save();
        console.log("✅ Order saved successfully");

        res.json({ success: true, message: "Order placed successfully!" });
    } catch (error) {
        console.error("❌ Error saving order:", error);
        res.status(500).json({ success: false, message: "Server error. Please try again later." });
    }
});

// Add payment routes
app.use('/payment', paymentRoutes);

const port = process.env.PORT || 4000;

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});


