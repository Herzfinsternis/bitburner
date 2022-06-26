/** @param {NS} ns **/
export async function main(ns) {
    const cyclesPerHour = 3600 / 6;
    const maxCyclesHistory = cyclesPerHour * 10 / 60; //10 minutes
    ns.tail();
    try {
        if (typeof (Math.bitburner) != "object") {
            Math.bitburner = {};
        }
        if (typeof (Math.bitburner.stockmarket) != "object") {
            Math.bitburner.stockmarket = {};
        }
        //if (typeof (Math.bitburner.stockmarket.history) == "undefined") {
        Math.bitburner.stockmarket.history = {}; //reset
        Math.bitburner.stockmarket.history.graph = {}; //plot data for easier debugging
        //}
        let history = Math.bitburner.stockmarket.history;
        history.lastUpdate = new Date(2000, 1, 1);
        ns.disableLog('ALL');
        var stocks = ns.stock.getSymbols();
        let i = 0;
        //while (10 * 60 * 12 > i) { //about 12 hours (6 seconds per cycle equals 10 cycles per minute)
        while (42) {
            let newPrices = [];
            let isUpdated = false;
            for (const symbol of stocks) {
                var ap = ns.stock.getAskPrice(symbol);
                var ms = ns.stock.getMaxShares(symbol);
                if (typeof (history[symbol]) == "undefined") {
                    history[symbol] = [];
                    history.graph[symbol] = [];
                }
                newPrices.push({ "symbol": symbol, "price": ap });
                if (0 < i) {
                    isUpdated = isUpdated || history[symbol].slice(-1) != ap;
                } else {
                    isUpdated = true;
                }
            }
            if (isUpdated) {
                i++;
                for (const val of newPrices) {
                    history[val.symbol].push(val.price);
                    if (maxCyclesHistory < history[val.symbol].length) {
                        history[val.symbol].shift();
                    }
                    history.graph[val.symbol].push({ "x": i, "price": val.price });
                    if (maxCyclesHistory < history.graph[val.symbol].length) {
                        history.graph[val.symbol].shift();
                    }
                }
                history.lastUpdate = Date.now();
                ns.print("Cycle " + i + " Complete");
            }
            await ns.sleep(1000);
            //ns.clear("/data/stockmarket.txt");
            //await ns.write("/data/stockmarket.txt", JSON.stringify(Math.bitburner.stockmarket, null, 2));
        }
    } catch (e) {
        ns.print("error: " + e);
    }
}
