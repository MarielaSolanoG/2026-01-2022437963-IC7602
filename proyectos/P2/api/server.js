const express = require("express");

const cors = require("cors");

const db = require("./firebase");

const app = express();

app.use(cors());

app.use(express.json());

app.get("/",(req,res)=>{res.json({message:"API running"});});

app.get("/domains/:domain/config",async(req,res)=>{
    try{

        const domain = req.params.domain;
        const doc = await db.collection("domains").doc(domain).get();

        if(!doc.exists){
            return res.status(404).json({message:"No existe"});}

        res.json(doc.data());

    }catch(e){

        console.log(e);
        res.status(500).send();

    }});

app.listen(3000,()=>{console.log("API http://localhost:3000")});