import express from "express"
import cors from "cors"
import swaggerUi from "swagger-ui-express"
import swaggerDocument from "./docs/swagger.json" with { type: "json" }

import categoryAdminRouter from "./routes/admin/categories.routes.js"
import productsAdminRouter from "./routes/admin/products.routes.js"
import inventoryAdminRouter from "./routes/admin/inventory.routes.js"
import ordersUserRouter from "./routes/user/orders.routes.js"
import cartUserRouter from "./routes/user/cart.routes.js"
import categoriesPublicRouter from "./routes/public/categories.routes.js"
import productsPublicRouter from "./routes/public/products.routes.js"

const app = express()
app.use(cors())
app.use(express.json())


app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument))

app.use("/api/admin/category", categoryAdminRouter)
app.use("/api/admin/products", productsAdminRouter)
app.use("/api/admin/inventory", inventoryAdminRouter)
app.use("/api/user/orders", ordersUserRouter)
app.use("/api/user/cart", cartUserRouter)
app.use("/api/categories", categoriesPublicRouter)
app.use("/api/products", productsPublicRouter)

export default app