const port = 4200;

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const flash = require('express-flash');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(flash());
app.use(session({
    secret: 'very-secret',
    resave: false,
    saveUninitialized: false
}))
app.use(express.json());
app.use(cors({
    origin: "http://localhost:4200",
    credentials: true
}));
app.use(cookieParser());

const SECRET_KEY = "key-key-key-key-key"; 
const REFRRESH_SECRET = "refresh-key-key-key-key-key"

const {game, balanceMessage, getBalance, history} = require("./slotMachine");

const usersFile = 'users.json';

const loadUsers = () => {
    try {
        return JSON.parse(fs.readFileSync(usersFile));
    } catch (err) {
        return [];
    }
};

const saveUsers = (users) => {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
};

const readUser = () => {
    return JSON.parse(fs.readFileSync("users.json"));
}

const users = loadUsers();
let refreshTokens = [];

const generateAccessTkn = (user) => {
    return jwt.sign({id:user.id, username:user.username}, SECRET_KEY, {expiresIn:'15m'});
}

const generateRefreshTkn = (user) => {
    return jwt.sign({id:user.id, username:user.username}, REFRRESH_SECRET, {expiresIn:'5d'});
}

function verifyToken(req, res, next){
    const token = req.cookies.accessToken;

    if(!token){
        return res.status(401).json({message: "Unauthorized"});
    }

    try{
        req.user = jwt.verify(token, SECRET_KEY);
        next();
    } catch(error){
        res.clearCookie('accessToken');
        res.status(401).json({message: "Invalid token, log in again"});
    }
}

app.get('/', (req,res)=>{
    if(!req.session.user){
        return res.redirect('/login');
    }
    const username = req.session.user.username;
    const users = JSON.parse(fs.readFileSync("users.json"));
    const user = users.find(u => u.username === username);

    if(!user) res.redirect('/login');

    res.render("index", {
        username: username,
        balMes : `Current balance: ${user.amount}`,
        result: "",
        winMess: ""
    });
});

app.post('/', verifyToken, (req,res)=>{
    if(!req.session || !req.session.user){
        res.redirect('/login');
        return;
    }

    const username = req.session.user.username;

    if(getBalance() <= 0){
        res.render("index", {
            username: "",
            balMes : 'You ran out of money',
            result: "",
            winMess: ""
        })
        return;
    }
    const {balMes, parsed, winMess} = game(username);

    res.render("index", {
        username: username,
        balMes : balMes,
        result: parsed,
        winMess: winMess
    })
})

app.get('/login', (req,res) => {
    res.render("login");
})

app.post('/login', async (req,res) => {
    const {username, password} = req.body;

    const users = readUser();
    const user = users.find(u => u.username === username);

    if(!user || !(await bcrypt.compare(password, user.password))){
        return res.status(400).json({message: "Invalid username or password"});
    }

    const accessToken = generateAccessTkn(user);
    res.cookie('accessToken', accessToken, {httpOnly: true, expiresIn:'15m'});

    const refreshToken = generateRefreshTkn(user);
    res.cookie('refreshToken', refreshToken, {httpOnly: true, expiresIn: '5d'});

    req.session.user = user;

    res.json({
        message: "Successful login", 
        username: username,
        accessToken: accessToken, 
        amount: user.amount
    });
})

app.post("/update-balance", verifyToken, (req, res) => {
    const {amount} = req.body;
    let users = readUser();

    if(!req.session.user) return res.status(401).json({message: "Unauthorised"});

    let userIndex = users.findIndex(u => u.username === req.session.user.username);
    if (userIndex === -1) return res.status(401).json({message: "User not found"});

    users[userIndex].amount = amount;
    fs.writeFileSync("users.json", JSON.stringify(users, null, 2));

    req.session.user.amount = amount;
})

app.get('/register', (req,res) => {
    res.render("register");
})

app.post('/register', async (req,res) => {
    const { username, email, password } = req.body;

    if (users.find((user) => user.username === username)) {
        return res.status(400).json({ message: "User already exists" });
    }

    try {
        const hashedPass = await bcrypt.hash(password, 10);
        const newUser = {
            id: Date.now().toString(),
            username,
            email,
            password: hashedPass,
            amount: 100
        };
        users.push(newUser);
        saveUsers(users);

        res.json({message: "User registered successfully, please log in"});
    } catch {
        res.status(500).json({ message: "Error registering user" });
    }

    console.log(users);
})

app.post('/refresh', verifyToken, (req,res)=>{
    const refreshToken = req.cookies.refreshToken;
    if(!refreshToken){
        return res.status(403).json({message: "Refresh token invalid or expired"});
    }

    try{
        const user = jwt.verify(refreshToken, REFRRESH_SECRET);
        const newAccToken = generateAccessTkn(user);
        res.cookie('accessToken', newAccToken, {httpOnly: true});
        res.json({accessToken: newAccToken});
    } catch(err) {
        console.log(err.message);
        res.clearCookie('refreshToken');
        return res.status(403).json({message: "Invalid refresh token"});
    }
})

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send("Failed to log out");
        }
        res.clearCookie("connect.sid");
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        res.redirect("/login");
    });
});

app.get("/protected", verifyToken, (req,res)=>{
    res.json({message: "this is a protected route", user: req.user});
})

app.get("/history", (req,res) => {
    res.render("history", {history});
})

app.listen(port, ()=>{
    console.log("Server is listening on " + port);
})