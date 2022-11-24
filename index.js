const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config()
const port = process.env.PORT || 5000;


// middleware
app.use(cors())
app.use(express.json())



const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.mfp1c6k.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    const usersCollection = client.db("computer-zone").collection("users")
    const categoriesCollection = client.db("computer-zone").collection("categories")


    try {

        // save user in the database
        app.post("/users", async(req, res)=>{
            const user = req.body;
            const result = await usersCollection.insertOne(user)
            res.send(result)
        })

        // get all categories 
        app.get("/categories", async(req,res)=>{
            const query = {}
            const result = await categoriesCollection.find(query).toArray()
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