import express from "express"; 


const PORT = 4000

const app = express();

app.use(express.json());

app.get("/", (req, res)=>{
  res.send("holasss")
})

app.listen (PORT, ()=>{
  console.log(`server running on port ${PORT}`);
  
})