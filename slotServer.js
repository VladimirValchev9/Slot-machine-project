const express = require('express');
const port = 4201;

const server = express();

server.set('view engine', 'ejs');

server.get("/", (req, res) => {
    res.render("slotMachine");
})

server.listen(port, () => {
    console.log("Listening on " + port);
});