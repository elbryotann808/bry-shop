import app from "./app.js"
import { PORT } from "./config.js"

app.listen(PORT, ()=>{
  console.log(`Server catalog-service running on port ${PORT}`);
})

