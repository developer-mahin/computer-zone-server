const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;


// middleware
app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.mfp1c6k.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    const usersCollection = client.db("computer-zone").collection("users")
    const categoriesCollection = client.db("computer-zone").collection("categories")
    const productsCollection = client.db("computer-zone").collection("products")
    const bookingCollection = client.db("computer-zone").collection("bookings")


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
            const query = {category_id: convert}
            const products = await productsCollection.find(query).toArray()
            res.send(products)
        })

        // get all products
        app.get("/products", async(req,res)=>{
            const query = {}
            const result = await productsCollection.find(query).toArray()
            res.send(result)
        })

        // confirm booking 
        app.post("/booking", async(req,res)=>{
            const bookData = req.body;
            const booking = await bookingCollection.insertOne(bookData)
            res.send(booking)
        })

        // get specific user
        app.get("/user/:email", async(req, res)=>{
            const email = req.params.email;
            const query = {email: email}
            const user = await usersCollection.findOne(query)
            res.send(user)
        })

        // get booking data for specific user
        app.get("/bookings", async(req, res)=>{

            const email = req.query.email;
            const query = {userEmail: email}
            const bookings = await bookingCollection.find(query).toArray()
            res.send(bookings)

        })

        // add product by post method
        app.post("/addProduct", async(req,res)=>{
            const product = req.body;
            const result = await productsCollection.insertOne(product)
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