const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cors = require("cors");
require("dotenv").config()
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
    const usersCollection = client.db("computer-zone").collection("users")
    const categoriesCollection = client.db("computer-zone").collection("categories")
    const productsCollection = client.db("computer-zone").collection("products")
    const bookingCollection = client.db("computer-zone").collection("bookings")
    const advertisesCollection = client.db("computer-zone").collection("advertises")

    try {

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
        app.get("/myUsers", verifyJwt, async (req, res) => {
            const userRole = req.query.userRole;
            const query = { userRole: userRole }
            const seller = await usersCollection.find(query).toArray()
            res.send(seller)
        })

        // delete method for deleting buyer and seller
        app.delete("/deleteAPerson/:id", verifyJwt, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const deleteUser = await usersCollection.deleteOne(query);
            res.send(deleteUser)
        })

        // patch method for change available to sold 
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

        app.get("/advertise", async (req, res) => {
            const status = req.query.status;
            const query = { status: status }
            const advertises = await advertisesCollection.find(query).toArray()
            res.send(advertises)
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