import express from "express"; 
import cors from "cors";
import swaggerUi from "swagger-ui-express"
import swaggerDocument from "./docs/swagger.json" with { type: "json" }

import cookieParser from "cookie-parser"
import authRouter from "./routes/auth.routes.js"

const app = express();
app.use(cors())
app.use(express.json());
app.use(cookieParser())

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument))

app.use("/api/auth", authRouter)

export default app;