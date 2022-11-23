const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config()
const port = process.env.PORT || 5000;



// middleware
app.use(cors())
app.use(express.json())


app.get("/", async (req, res) => {
    res.send("Computer zone server is running")
})

app.listen(port, () => {
    console.log(`Server running on the port ${port}`);
})