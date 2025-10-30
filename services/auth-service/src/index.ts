import express from "express"; 
import cors from "cors";
import cookieParser from "cookie-parser"
import { PORT } from "./config.js";
import authRouter from "./routes/auth.routes.js"

const app = express();

app.use(cors())

app.use(express.json());

app.use(cookieParser())

app.use("/api/auth", authRouter)

app.listen (PORT, ()=>{
  console.log(`Server auth-service running on port ${PORT}`);
})


