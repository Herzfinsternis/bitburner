# Bitburner

## BN8 without 4S Market Data

**A journey to make some serious money without having 4S Market Data in Bitburners BitNode 8**

**Update: The jouney continues! Some [hints on Reddit](https://www.reddit.com/r/Bitburner/comments/vlup0m/bn8_without_4s_market_data/idz4ytg/?context=3) and digging into bitburners source are going to improve the script (todo)**

### tl/dr

[stockHist.js](./src/stockHist.js) records prices, [stockBB2.js](./src/stockBB2.js) buys and sells shares. Head over to src folder and grab them. You need both. Just leave them running for a few hours. But don't watch. Otherwise you might end up tearing your hair out.

### The story

When I first played BN8 I discoverd it *was* possible to gain money by manual hacking. The terminal can be scripted and the documentation also provides an example (Injecting HTML in the game). So I wrote a script for manual hacking, let it run while growing and weakening the target, bought 4S Market Data after hacking enough money and wrote a simple script for trading at the stock market, finished BN8 and moved on to other BitNodes.

Having done all BitNodes at least once I started doing the challenges and when it came to BitNode 8 the challenge says: 'Destroy BN8 without purchasing the 4s market data.' I thought: "Okay, no problem, I can do the manual hacking thing once again." Unfortunately someone removed that *feature* since I last did BN8. Of cause you can still hack manually but you will not gain money from doing so. Now I had to write a script for trading without having 4S Market Data TIX API Access - even without having 4S Market Data Access at all. Btw you could also try to make money in the casino.

First I made a script to simply record the prices of all stocks. The idea behind this was that the slope of the price of a stock is stable over a longer period and I would need to collect the prices over time to tell whether it is going up or down. Second I copied my old trading script and replaced the API calls for forecast and volatility. For the forecast I looked back ten market cycles and subtracted that from the current price. For the volatility I had to look at the source and generated a list for that as volatility seems to be quasi-static. Then I gave it a shot. But running the two scripts made me loose money. What was going on here?!

Examining the recorded data I discoverd that most of the time the stock price fell right after buying shares and recovered after a few cycles. Adding a constant to give the stock time to recover did the trick and I could finally generate some money at the stock market without purchasing 4S Market Data Access. It was rather slow but did the job in the end.

However I wasn't satisfied with the solution. To come up with a better solution I [visualized the recorded data with flot](https://herzfinsternis.github.io/). I made that available to anyone interested. You may want to try it for yourself.

The first thing I did then was replacing my overly simple approach to calculate the slope of the price with [simple linear regression](https://en.wikipedia.org/wiki/Simple_linear_regression) and visualized that too (green color in the flot chart). The next step was to calculate the slopes slope and visualize it (purple color in the flot chart). The slopes slope can be used to predict the slope - at least in theory. The calculated slope will always be the slope like it was a few market cycles in the past. For example, when the slope is calculated with 20 data points, then it will be the slope 10 market cycles before the current market cycle. To compensate this I add 10 times the slopes slope to the slope and made that my forecast (red line in the chart) and added an indicaton to the chart where the forecast is positive (orange areas). Playing with the parameters (how many points to take for the slope, how many points from that slope to take for the slopes slope, how many points to crop at start) and looking at different stocks I soon came to the conclusion that this is a viable approach, opted for 70 data points to calculate the slopes, 5 slopes to calculate the slopes slope and gave it a shot.

You start with $250m and the script initially invests $240m so you have $10m at hand. So I watched the value of my shares und wanted to tear my hair out as after half an hour and a few trades my shares had dropped to $230m. Left it running anyways and went for a coffee or three, had some other things on my mind, came back a few hours later and saw my shares had reached over $2.6b. The average increase per hour (5 hours or 3000 market cycles had passed since I ran the script) was over 60% and that was a lot better than my very basic first script had performed. Well, I probably just had luck. After 5130 cycles it said $4.5b and thus only 40% per hour. YMMV.

I think, this could still be improved a lot. Feel free to do so. I am not satisfied with my solution to just invest in the stock with the highest forecast for example.

### The Code

This code is a mess. On the other hand it could be even worse and I have already seen worse - which doesn't make mine better of cause. You will find "var", "let" and "const" in my scripts, code that is of no use anymore (well, those functions are called but not needed anymore) and if a variable has some arkward name it probably had a different meaning in the past - or its name is German. Some functions access variables in the parents scope instead of receiving them as parameters among other deficiencies.

[stockBB2.js](./src/stockBB2.js) will start [stockHist.js](./src/stockHist.js) if it is not already running. It then waits for the stock data to be recorded.

**stockHist.js**

Data is written to the static object `Math.bitburner.stockmarket.history` and will not be in your save when you save the game. Only the last 100 prices are stored (change `const maxCyclesHistory = cyclesPerHour * 10 / 60; //10 minutes` if you need more). Prices will be checked for updates every second and when some update occurred will be written to the history data.

**stockBB2.js**

At the start are some constants and I hope their names and the comments in the script are meaningful.

You can provide an argument to set the amount of money you do not want to invest - it's $10m per default or the value stored in `Math.bitburner.stockmarket.moneyKeep`.

Then there is some code for logging and keeping track of transactions. The later is not useful - as far as I remember - if you leave `stockRecoveryCycles` at 0.

You may want to take a look at `function getForecast()` and its sub-functions. For example the line `let slopesSlopes = getSlopes(slopes, slopeSlopeLen, 2);` calculates the last two slopes from solpes (the last two [second derivative](https://en.wikipedia.org/wiki/Derivative)) but only the last one is needed to calulate the forecast. A possible improvement might be to raise the forecast if the last slopes slope is negative and it now is positive. I thought of that but did not implement it.

After those functions within the main function you will find the code to start up and wait for `stockHist.js`. And then there finally is the inevitable `while (true)`-loop. It collects and sorts the stock data and makes transactions - and there is a flaw as it will first try to buy shares before selling shares but I don't mind.

Second to last I would like one thing to your attention. When you change the value of `Math.bitburner.stockmarket.moneyKeep` the script will adapt to it. I use a little script to do some ad hoc things:
```javascript
export async function main(ns) {
    ns.tail();
    ns.print(ns.args[0]);
    ns.print("");
    ns.print(eval(ns.args[0]));
}
```

Last. Do not watch your shares. It will only give you a headache. As a rough estimate I would recommend you calculate 3 hours for the shares value to dubble.
