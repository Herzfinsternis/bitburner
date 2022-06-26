const histLen = 70; //how many cycles to look back in history
const slopeSlopeLen = 5; //slopes are calculated with histLen data points and the slopes slopes are calculated with slopeSlopeLen slopes (at least 2)
const minHistLen = 25; //we need some data to make educated choices
const minFC = 1e-9; //minimum forecast to consider buying a stock; 0 is neutral, negative is decreasing, positive ascending; this is different than forecast by 4s!; values will be rather small (close to zero)
const maxFC = 0.00; //maximum forecast for selling; if the forecast drops below that value then sell the shares
const maxVol = 1.50; //maximum volatility - if a stock has higher volatility, it will be ignored; I think this is different than volatility by 4s but I don't remeber
let moneyKeep = 10e6; //save that much money for the player; 1m=1e6, 1b=1e9, 1t=1e12
const minShareInvest = 50e6; //invest at least that much money (otherwise if you do not have much money the commission fee might eat up your earnings)
const commissionfee = 1e5; //is this a constant value through all bitnodes?
const stockRecoveryCycles = 0; //price may temporarily go down because we influenced it by buying shares, so we may give it some cycles to recover
//staticVolFromSrc was generated from source code v1.7.0; I am not 100% sure if this is correct
const staticVolFromSrc = [{ "symbol": "NTLK", "maxVolatility": 4 }, { "symbol": "SGC", "maxVolatility": 2.75 }, { "symbol": "WDS", "maxVolatility": 2.6 }, { "symbol": "APHE", "maxVolatility": 2.05 }, { "symbol": "CTYS", "maxVolatility": 1.75 }, { "symbol": "SYSC", "maxVolatility": 1.7 }, { "symbol": "LXO", "maxVolatility": 1.35 }, { "symbol": "FLCM", "maxVolatility": 1.3 }, { "symbol": "FSIG", "maxVolatility": 1.1 }, { "symbol": "OMGA", "maxVolatility": 1.1 }, { "symbol": "CTK", "maxVolatility": 1 }, { "symbol": "STM", "maxVolatility": 0.9 }, { "symbol": "KGI", "maxVolatility": 0.85 }, { "symbol": "BLD", "maxVolatility": 0.8 }, { "symbol": "VITA", "maxVolatility": 0.8 }, { "symbol": "SLRS", "maxVolatility": 0.8 }, { "symbol": "NVMD", "maxVolatility": 0.8 }, { "symbol": "FNS", "maxVolatility": 0.8 }, { "symbol": "MDYN", "maxVolatility": 0.8 }, { "symbol": "CLRK", "maxVolatility": 0.75 }, { "symbol": "OMN", "maxVolatility": 0.75 }, { "symbol": "OMTK", "maxVolatility": 0.7 }, { "symbol": "DCOMM", "maxVolatility": 0.7 }, { "symbol": "ICRS", "maxVolatility": 0.7 }, { "symbol": "RHOC", "maxVolatility": 0.7 }, { "symbol": "TITN", "maxVolatility": 0.7 }, { "symbol": "HLS", "maxVolatility": 0.65 }, { "symbol": "AERO", "maxVolatility": 0.65 }, { "symbol": "GPH", "maxVolatility": 0.65 }, { "symbol": "UNV", "maxVolatility": 0.6 }, { "symbol": "ECP", "maxVolatility": 0.5 }, { "symbol": "MGCP", "maxVolatility": 0.5 }];

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog('ALL');
    if (!Math.bitburner) Math.bitburner = {};
    if (!Math.bitburner.stockmarket) Math.bitburner.stockmarket = {};
    if (ns.args.length > 0) {
        moneyKeep = ns.args[0];
        Math.bitburner.stockmarket["moneyKeep"] = moneyKeep;
    } else {
        if (Math.bitburner.stockmarket.moneyKeep) moneyKeep = Math.bitburner.stockmarket.moneyKeep;
    }
    ns.tail();

    let logObj = {};
    let tCount = 0;

    function log(key, value) {
        logObj[key] = value;
        ns.clearLog();
        ns.print(JSON.stringify(logObj, null, 2));
    }

    function logArr(key, value, maxEntries) {
        if (maxEntries == undefined) {
            maxEntries = 10;
        }
        if (logObj[key] === undefined) {
            logObj[key] = [];
        }
        logObj[key].push(value);
        logObj[key] = logObj[key].slice(-maxEntries);
    }

    function addTransaction(symbl, num) {
        tCount++;
        if (Math.bitburner.stockmarket.transactions === undefined) {
            Math.bitburner.stockmarket.transactions = {};
        }
        let transaction = { shares: num, ticks: 0 };
        Math.bitburner.stockmarket.transactions[symbl] = transaction;
    }

    function tickTransactions() {
        if (Math.bitburner.stockmarket.transactions === undefined) {
            Math.bitburner.stockmarket.transactions = {};
        }
        let smbls = Object.keys(Math.bitburner.stockmarket.transactions);
        for (var i = 0; i < smbls.length; i++) {
            let transaction = Math.bitburner.stockmarket.transactions[smbls[i]];
            transaction.ticks++;
        }
    }

    function getTransaction(symbl) {
        if (Math.bitburner.stockmarket.transactions === undefined) {
            Math.bitburner.stockmarket.transactions = {};
        }
        let transaction = Math.bitburner.stockmarket.transactions[symbl];
        return transaction;
    }

    function getTransactionTicks(symbl) {
        let transaction = getTransaction(symbl);
        if (transaction === undefined) {
            return Number.MAX_VALUE;
        }
        return transaction.ticks;
    }

    function getForecast() {

        function arrayAvg(arr) {
            if (!Array.isArray(arr)) return 0; //undefined?
            if (arr.length == 0) return 0; //undefined?
            //arr could contain non numbers, but we ignore that and let the exceptions roll
            return arr.reduce((prev, curr) => prev + curr) / arr.length;
        }

        function calcRegressionParams(yValues) {
            let yAvg = arrayAvg(yValues);
            let xAvg = yValues.length / 2;
            let sumDxDy = yValues.reduce((prev, curr, indx) => prev + (curr - yAvg) * (indx - xAvg), 0);
            let sumDxDx = yValues.reduce((prev, curr, indx) => prev + (indx - xAvg) * (indx - xAvg), 0);
            let a = sumDxDy / sumDxDx;
            let b = yAvg - a * xAvg;
            let retVal = { "slope": a, "intercept": b };
            return retVal;
        }

        function getSlopes(yValues, maxDataPointsForSlope, maxSlopes) {
            let slopes = [];
            let dataLen = yValues.length;
            for (let i = 0; i < maxSlopes; i++) {
                let subArrStart = Math.max(0, dataLen - maxDataPointsForSlope - maxSlopes + i + 1);
                let subArrEnd = dataLen - maxSlopes + i + 1;
                let subArr = yValues.slice(subArrStart, subArrEnd);
                slopes.push(calcRegressionParams(subArr).slope);
            }
            return slopes;
        }

        if (data.length < minHistLen) {
            return 0; //neutral
        }
        let slopes = getSlopes(data, histLen, slopeSlopeLen + 1);
        let slopesSlopes = getSlopes(slopes, slopeSlopeLen, 2);
        let fc = slopesSlopes[slopesSlopes.length - 1] * histLen / 2 + slopes[slopes.length - 1];
        fc = fc / data[data.length - 1];
        return fc;
    }

    function getVolatility(symbl) {
        //todo: calculate some meaningful value
        //instead: return a static value extracted from the source code v1.7.0
        let mv = staticVolFromSrc.reduce(
            function (pv, cv) {
                return ((cv.symbol == symbl) ? cv : pv);
            },
            { "symbol": "unknown", "maxVolatility": 99 }
        );
        return mv.maxVolatility;
    }

    function buyPositions(symbl) {
        if (getTransactionTicks(symbl) < stockRecoveryCycles) {
            return;
        }
        var maxShares = ns.stock.getMaxShares(symbl) - position[0];
        var askPrice = ns.stock.getAskPrice(symbl);
        var forecast = getForecast(symbl);
        var vol = getVolatility(symbl);
        var playerMoney = ns.getServerMoneyAvailable('home');
        if (forecast >= minFC && vol <= maxVol) {
            if (playerMoney - moneyKeep - commissionfee > minShareInvest) {
                var shares = Math.min(maxShares, (playerMoney - moneyKeep - commissionfee) / askPrice);
                shares = Math.floor(shares);
                ns.stock.buy(symbl, shares);
                addTransaction(symbl, shares);
                log("BFC", 'Forecast for ' + symbl + ' is ' + forecast);
                logArr("BUY", cycle + ' Bought ' + shares + ' ' + symbl + ' shares for ' + ns.nFormat(askPrice, '0.000a') + ' (' + ns.nFormat(shares * askPrice, '0.000a') + ') bucks');
            }
        }
    }

    function sellPositions(symbl) {
        let shares = position[0];
        let lastTransaction = getTransaction(symbl);
        if (!lastTransaction) {
            //so the player did buy some stock
            addTransaction(symbl, shares);
            return;
        }
        if (lastTransaction.ticks < stockRecoveryCycles) {
            return;
        }
        var forecast = getForecast();
        if (forecast < maxFC) {
            var bidPrice = ns.stock.getBidPrice(symbl);
            ns.stock.sell(symbl, shares);
            addTransaction(symbl, -shares);
            log("SFC", 'Forecast for ' + symbl + ' is ' + forecast);
            logArr("SELL", cycle + ' Sold ' + shares + ' ' + symbl + ' shares for ' + ns.nFormat(bidPrice, '0.000a') + ' (' + ns.nFormat(shares * bidPrice, '0.000a') + ') bucks');
        }
    }

    let waitingDots = ".";
    try {
        if (ns.getRunningScript("stockHist.js") == null) {
            ns.run("stockHist.js");
            for (let i = 0; i < 30; i++) {
                ns.clearLog();
                ns.print("waiting for Stock Market history data (min. 30s)");
                ns.print(waitingDots);
                await ns.sleep(1000);
                waitingDots += ".";
            }
        }
    } catch (e) {
        ns.print("error: " + e);
        ns.exit();
    }
    while ((typeof (Math.bitburner) != "object") || (typeof (Math.bitburner.stockmarket) != "object") || (typeof (Math.bitburner.stockmarket.history) != "object")) {
        ns.clearLog();
        ns.print("waiting for Stock Market history data");
        ns.print(waitingDots);
        await ns.sleep(1000);
        waitingDots += ".";
    }
    let history = Math.bitburner.stockmarket.history;
    waitingDots = ".";
    while (history.lastUpdate < Date.now() - 2000) {
        ns.clearLog();
        ns.print("waiting for Stock Market history data update");
        ns.print(waitingDots);
        await ns.sleep(1000);
        waitingDots += ".";
    }
    ns.print("Stock Market history data available. Starting trading.");
    //debugger;
    let cycle = 0;
    let shareVauleSum = 0;
    log("cycle", "???");
    log("Value", "0");
    log("BFC", "");
    log("SFC", "");
    while (true) {
        await ns.sleep(100);
        if (Date.now() - history.lastUpdate < 500) {
            if (Number.isInteger(Math.bitburner.stockmarket["moneyKeep"])) {
                if (moneyKeep != Math.bitburner.stockmarket["moneyKeep"]) {
                    moneyKeep = Math.bitburner.stockmarket["moneyKeep"];
                    ns.tprint("moneyKeep=" + moneyKeep);
                }
            }
            //ns.clearLog();
            cycle++;
            tickTransactions();
            shareVauleSum = 0;
            log("cycle", cycle);
            let sortedStockdata = [];
            for (var stock of Object.keys(history)) {
                var data = history[stock];
                //debugger;
                if ((Array.isArray(data)) && (data.length >= histLen)) {
                    var fc = getForecast(stock);
                    var stockData = { stock: stock, fc: fc };
                    sortedStockdata.push(stockData);
                }
            }
            sortedStockdata = sortedStockdata.sort(function (a, b) { return b.fc - a.fc });
            for (var stockData of sortedStockdata) {
                var data = history[stockData.stock];
                var position = ns.stock.getPosition(stockData.stock);
                if (position[0]) {
                    //ns.print('Position: ' + stock + ', ')
                    sellPositions(stockData.stock);
                }
                buyPositions(stockData.stock);
                position = ns.stock.getPosition(stockData.stock);
                if (position[0]) {
                    var value = ns.stock.getBidPrice(stockData.stock) * position[0];
                    shareVauleSum += value;
                }
            }
            log("Value", ns.nFormat(shareVauleSum, "0.000a"));
            await ns.sleep(500);
        }
    }
}
