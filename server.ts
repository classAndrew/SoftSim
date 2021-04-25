import * as express from 'express';

const app = express();
app.use("/node_modules", express.static("node_modules"));
app.use("/", express.static("app"));

app.listen(8080, ()=>console.log("Starting on http://localhost:8080"));