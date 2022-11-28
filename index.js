const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cors = require("cors");
require("dotenv").config()
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;


// middleware
app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.mfp1c6k.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJwt(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ accessToken: "Unauthorized Access" })
    }
    const token = authHeader.split(" ")[1]
    jwt.verify(token, process.env.JWT_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ accessToken: "Forbidden Access" })
        }
        req.decoded = decoded
    })
    next()
}

async function run() {


    try {
        const usersCollection = client.db("computer-zone").collection("users")
        const categoriesCollection = client.db("computer-zone").collection("categories")
        const productsCollection = client.db("computer-zone").collection("products")
        const bookingCollection = client.db("computer-zone").collection("bookings")
        const advertisesCollection = client.db("computer-zone").collection("advertises")
        const wishListsCollection = client.db("computer-zone").collection("wishlists")
        const paymentsCollection = client.db("computer-zone").collection("payments")
        const reportItemsCollection = client.db("computer-zone").collection("reports")

        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email
            const query = { email: decodedEmail }
            const user = await usersCollection.findOne(query)
            if (user?.userRole !== "admin") {
                return res.status(403).send({ message: "Forbidden access" })
            }
            next()
        }

        // save user in the database
        app.post("/users", async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user)
            res.send(result)
        })

        // get all categories 
        app.get("/categories", async (req, res) => {
            const query = {}
            const result = await categoriesCollection.find(query).toArray()
            res.send(result)
        })

        // get all products by category
        app.get("/category/:id", async (req, res) => {
            const id = req.params.id;
            const convert = parseInt(id)
            const query = { category_id: convert }
            const products = await productsCollection.find(query).toArray()
            res.send(products)
        })

        // get all products
        app.get("/products", async (req, res) => {
            const query = {}
            const result = await productsCollection.find(query).toArray()
            res.send(result)
        })

        //get method for jwt token 
        app.get("/jwt", async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            const token = jwt.sign(user, process.env.JWT_TOKEN, { expiresIn: "1d" })
            return res.send({ accessToken: token })
        })


        // stripe payment intent
        app.post("/create-payment-intent", async (req, res) => {
            const paymentInfo = req.body;
            const price = paymentInfo.itemPrice;
            const totalAmount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: "usd",
                amount: totalAmount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })

        // store payment details and update product status and pay status
        app.post("/payments", async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment)
            const id = payment.bookingId
            const filter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const result2 = await bookingCollection.updateOne(filter, updatedDoc)
            const productId = payment.productId;
            const filter2 = { _id: productId }
            const updatedDoc2 = {
                $set: {
                    status: "Sold",
                    transactionId: payment.transactionId
                }
            }

            const filter3 = { _id: ObjectId(productId) }
            const updatedDoc3 = {
                $set: {
                    status: "Sold",
                    transactionId: payment.transactionId
                }
            }
            const result4 = await productsCollection.updateOne(filter3, updatedDoc3)
            const result3 = await advertisesCollection.updateOne(filter2, updatedDoc2)
            res.send(result)
        })

        // confirm booking 
        app.post("/booking", async (req, res) => {
            const bookData = req.body;
            const booking = await bookingCollection.insertOne(bookData)
            res.send(booking)
        })

        // get specific user
        app.get("/user/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            res.send(user)
        })

        // get booking data for specific user
        app.get("/bookings", verifyJwt, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email
            if (email !== decodedEmail) {
                return res.status(403).send({ message: "Forbidden Access" })
            }
            const query = { userEmail: email }
            const bookings = await bookingCollection.find(query).toArray()
            res.send(bookings)

        })

        // get booking by specific product id for payment option
        app.get("/bookings/:id", async (req, res) => {
            const id = req.params.id;
            const query = { productId: id }
            const result = await bookingCollection.findOne(query)
            res.send(result)
        })

        // add product by post method
        app.post("/addProduct", verifyJwt, async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product)
            res.send(result)
        })

        // get my product for seller
        app.get("/my-product", verifyJwt, async (req, res) => {
            const decoded = req.decoded
            if (decoded.email !== req.query.email) {
                res.status(401).send({ message: "Unauthorized access" })
            }
            const email = req.query.email;
            const query = { seller_email: email }
            const myProducts = await productsCollection.find(query).toArray()
            res.send(myProducts)
        })

        // get all seller and buyer account
        app.get("/myUsers", verifyJwt, verifyAdmin, async (req, res) => {
            const userRole = req.query.userRole;
            const query = { userRole: userRole }
            const seller = await usersCollection.find(query).toArray()
            res.send(seller)
        })

        // delete method for deleting buyer and seller
        app.delete("/deleteAPerson/:id", verifyJwt, async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: ObjectId(id) }
            const deleteUser = await usersCollection.deleteOne(query);
            res.send(deleteUser)
        })

        // patch method for change seller verification false to true 
        app.patch("/status/:id", verifyJwt, async (req, res) => {
            const id = req.params.id
            const status = req.body.status;
            const query = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    status: status
                }
            }
            const result = await productsCollection.updateOne(query, updatedDoc)
            res.send(result)
        })

        // post method to add product in advertise section 
        app.post("/advertise", verifyJwt, async (req, res) => {
            const advertiseProduct = req.body
            const result = await advertisesCollection.insertOne(advertiseProduct)
            res.send(result)
        })

        // get method for getting advertise in the home section
        app.get("/advertise", async (req, res) => {
            const status = req.query.status;
            const query = { status: status }
            const advertises = await advertisesCollection.find(query).toArray()
            res.send(advertises)
        })

        // post method for add product in the wishlist 
        app.post("/wishlist", verifyJwt, async (req, res) => {
            const wishlist = req.body;
            const result = await wishListsCollection.insertOne(wishlist)
            res.send(result)
        })

        // get method for getting wishlist item 
        app.get("/myWishlist", verifyJwt, async (req, res) => {
            const email = req.query.email;
            const query = { wishlistAuthor: email }
            const wishlists = await wishListsCollection.find(query).toArray();
            res.send(wishlists)
        })

        // this API protected for admin routes
        app.get("/users/admin/:email", async (req, res) => {
            const email = req.params.email
            const query = { email }
            const user = await usersCollection.findOne(query)
            res.send({ isAdmin: user?.userRole === "admin" })
        })

        //this API protected for seller routes
        app.get("/users/seller/:email", async (req, res) => {
            const email = req.params.email
            const query = { email }
            const user = await usersCollection.findOne(query)
            res.send({ isAdmin: user?.userRole === "seller" })
        })

        // this method for add reported item in the database
        app.post("/report-item", verifyJwt, async (req, res) => {
            const reportItem = req.body;
            const result = await reportItemsCollection.insertOne(reportItem)
            res.send(result)
        })

        // this method for get all reported items
        app.get("/reported-items", verifyJwt, verifyAdmin, async (req, res) => {
            const query = {}
            const result = await reportItemsCollection.find(query).toArray()
            res.send(result)
        })

        // delete reported item from any where
        app.delete("/reportsItem/:id", verifyJwt, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const reportedQuery = { productId: id }
            const productsQuery = { _id: ObjectId(id) }
            const advertiseQuery = { _id: id }
            const deleteItem3 = await advertisesCollection.deleteOne(advertiseQuery)
            const deleteItem2 = await productsCollection.deleteOne(productsQuery)
            const deleteItem = await reportItemsCollection.deleteOne(reportedQuery)
            res.send(deleteItem)
        })

        // method for verifying users 
        app.patch("/verify-users/:email", verifyJwt, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const option = { upsert: true }
            const updatedDoc = {
                $set: {
                    verify: true,
                    verifyStatus: "Verified"
                }
            }

            const query2 = { seller_email: email }
            const option2 = { upsert: true }
            const updatedDoc2 = {
                $set: {
                    verify: true,
                }
            }
            const result2 = await productsCollection.updateOne(query2, updatedDoc2, option2)
            const result = await usersCollection.updateOne(query, updatedDoc, option)
            res.send(result)
        })

    }
    finally {

    }

}


run().catch(err => console.log(err.message))


app.get("/", async (req, res) => {
    res.send("Computer zone server is running")
})

app.listen(port, () => {
    console.log(`Server running on the port ${port}`);
})