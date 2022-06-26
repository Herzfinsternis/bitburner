# Bitburner

## BN8 without 4S Market Data

**A journey to make some serious money without having 4S Market Data in Bitburners BitNode 8**

### tl/dr

[stockHist.js](./src/stockHist.js) records prices, [stockBB2.js](./src/stockBB2.js) buys and sells shares. Head over to src folder and grab them. You need both. Just leave them running for a few hours. But don't watch. Otherwise you might end up tearing your hair out.

### The story

When I first played BN8 I discoverd it *was* possible to gain money by manual hacking. The terminal can be scripted. Did so, bought 4S Market Data after hacking enough money and wrote a simple script for trading at the stock market, finished BN8 and moved on to other BitNodes.

Having done all BitNodes at least once I started doing the challenges and when I came back to BitNode 8 the challenge says: 'Destroy BN8 without purchasing the 4s market data.' Okay, no problem, I can do the manual hacking thing once again. Unfortunately someone removed that feature since I last did BN8. Of cause you can still hack manually but you will not gain money from doing so. I had to write a script for trading without having 4S Market Data TIX API Access - even without having 4S Market Data Access at all.

First I made a script to simply record the prices of all stocks. The idea behind this was that the slope of the price of a stock is stable over a longer period and I would need to collect the prices over time to tell wether it is going up or down. Second I copied my old trading script and replaced the API calls for forecast and volatility. For the forecast I looked back ten market cycles and subtracted that from the current price. For the volatility I hab to look at the source and generated a list as this seem to be quasi-static. Then I gave it a shot. But running the two scripts made me loose money. What was going on here?!

Examining the recorded data I discoverd that most of the time the stock price fell right after buying shares and recovered after a few cycles. Adding a constant to give the stock time to recover did the trick and could finally generate some money at the stock market without purchasing 4S Market Data Access. It was rather slow but did the job in the end.

However I wasn't satisfied with the solution. To come up with a better solution I visualized the recorded data with flot.

### The Code
