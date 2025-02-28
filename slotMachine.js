const fs = require('fs');

let balance = 100;
const bet = 1;
const rows = 3;
const column = 5;

const keys = {
    ACE: 'A ',
    KING: 'K ',
    QUEEN: 'Q ',
    JOKER: 'J ',
    TEN: '10'
}

const symbolRarity = {
    [keys.ACE]: 10,
    [keys.KING]: 18,
    [keys.QUEEN] : 30,
    [keys.JOKER] : 60,
    [keys.TEN]: 100
}

const symbolWorth = {
    [keys.ACE] : 1000,
    [keys.KING] : 500,
    [keys.QUEEN] : 100,
    [keys.JOKER] : 25,
    [keys.TEN]: 10
}

const balanceMessage = (balance) => {
    return "Current balance: " + balance;
}

const generateSymbols = () => {
    const symbols = [];

    for(const [symbol, count] of Object.entries(symbolRarity)){
        for(let i=0; i<count; i++){
            symbols.push(symbol);
        }
    }

    const reels = [];
    
    for(let i=0; i<column; i++){
        reels.push([]);
        const reelSymbols = [...symbols];
        for(let j=0; j<rows; j++){
            const randomSymbol = Math.floor(Math.random() * reelSymbols.length);
            const selectedSymbol = reelSymbols[randomSymbol];
            reels[i].push(selectedSymbol);
            reelSymbols.splice(randomSymbol,1);
        }
    }

    return reels;
}

const flipGeneratedSymbols = (reels) => {
    const newReels=[];

    for(let i=0; i<rows; i++){
        newReels.push([]);
        for(let j=0; j<column; j++){
            newReels[i].push(reels[j][i]);
        }
    }
    return newReels;
}

const parseFlipped = (newReels) => {
    return newReels.map(reel => reel.join('   ')).join('\n');
}

const checkForWin = (newReels) => {
    let moneyWon = 0;

    for(let i=0; i<rows; i++){
        let current =  newReels[i][0];
        let equal = true;

        for(let j=1; j<column; j++){
            if(newReels[i][j] != current){
                equal = false;
                break;
            }
        }
        if(equal){
            moneyWon += symbolWorth[current];
        }
    }
    return moneyWon;
}

const winMessage = (moneyWon) => {
    if(moneyWon > 0) return "You won " + moneyWon;
    return "You didn't win";
}

const addWinnings = (balance, moneyWon) => {
    return balance + (moneyWon*bet) - bet;
}

const history = [];

const game = (username) => {
    const users = JSON.parse(fs.readFileSync("users.json"));
    let userIndex = users.findIndex(u => u.username === username);

    if(userIndex === -1) return {balMes: "User not found", parsed: "", winMess: ""};

    let user = users[userIndex];

    if(user.amount <=0 ) return {balMes: "You ran out of money", result: "", winMess: ""}

    const balMes = balanceMessage(user.amount);
    const generated = generateSymbols();
    const flipped = flipGeneratedSymbols(generated);
    const parsed = parseFlipped(flipped);
    const check = checkForWin(flipped);
    const winMess = winMessage(check);
    user.amount = user.amount + (check*bet) - bet;

    fs.writeFileSync("users.json", JSON.stringify(users, null, 2));

    history.push({time: new Date().toLocaleString(), amount: check});

    return { balMes: `Current balance: ${user.amount}`, parsed, winMess };
}

module.exports = {game, balanceMessage, getBalance: () => balance, history}