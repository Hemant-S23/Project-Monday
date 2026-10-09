/**
 * Conversational AI Co-Pilot Brain (MONDAY)
 * Natural, empathetic, context-aware reasoning engine in conversational Hinglish & English.
 * Talks like a real, smart female trading partner — not a rigid robotic menu.
 */
export class CopilotBrain {
  constructor() {
    this.history = [];
    this.currentContext = null;
  }

  formatPrice(p) {
    if (p === undefined || p === null || isNaN(p)) return '$0.00';
    const num = Number(p);
    if (num >= 1000) return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (num >= 1) return `$${num.toFixed(2)}`;
    if (num >= 0.001) return `$${num.toFixed(5)}`;
    if (num >= 0.00001) return `$${num.toFixed(7)}`;
    return `$${num.toFixed(8)}`;
  }

  updateContext({
    targetAsset,
    currentPrice,
    strategyState,
    historicalContext,
    eventRisk,
    riskParams,
    openPositions,
    analytics
  }) {
    this.currentContext = {
      targetAsset,
      currentPrice,
      strategyState,
      historicalContext,
      eventRisk,
      riskParams,
      openPositions,
      analytics,
      updatedAt: Date.now()
    };
  }

  /**
   * Generates a market briefing for state transitions
   */
  generateMarketBriefing() {
    if (!this.currentContext || !this.currentContext.strategyState) {
      return "Market data load ho raha hai. Thoda wait karein...";
    }

    const { targetAsset, currentPrice, strategyState, historicalContext, eventRisk, riskParams } = this.currentContext;
    const state = strategyState.state;
    const direction = strategyState.direction;
    const htf = strategyState.htfTrend?.direction || 'UNCLEAR';
    const fmtPrice = this.formatPrice(currentPrice);

    if (state === 'CONFIRMED') {
      return `🟢 **${targetAsset} SETUP CONFIRMED (${direction})**\n\n` +
        `1H trend **${htf}** hai aur 5M discount zone me confirmation candle mil chuki hai.\n` +
        `• Entry: ${this.formatPrice(riskParams?.entry)} | SL: ${this.formatPrice(riskParams?.stopLoss)} | Target: ${this.formatPrice(riskParams?.target)}\n` +
        `• 1:${riskParams?.rrRatio} Risk-to-Reward (1% Max Risk: $${riskParams?.maxRiskUSD})\n` +
        `Tum Execute Paper Trade button se position initiate kar sakte ho.`;
    } else if (state === 'DEVELOPING') {
      const zLow = strategyState.ltfStructure?.zoneLow ? this.formatPrice(strategyState.ltfStructure.zoneLow) : '--';
      const zHigh = strategyState.ltfStructure?.zoneHigh ? this.formatPrice(strategyState.ltfStructure.zoneHigh) : '--';
      return `🟠 **${targetAsset} Reaction Zone Me Enter Hua**\n\n` +
        `Price ${zLow} - ${zHigh} zone me trade kar rahi hai. Abhi confirmation candle close hona baaki hai. Jaldbazi me bina confirmation entry mat lena!`;
    } else if (state === 'WAIT') {
      return `🟡 **${targetAsset} WAIT State**\n\n` +
        `Live price ${fmtPrice} par hai. Trend ${htf} hai lekin required 5M pullback abhi pending hai. Patience ke saath wait karte hain.`;
    } else if (state === 'CANCELLED') {
      return `🔴 **${targetAsset} Setup Cancelled**\n\n` +
        `5M invalidation level break ho chuka hai. Level chase nahi karenge, fresh structure ka wait karenge.`;
    }
    return `⚪ **${targetAsset} Observing Mode**\nAbhi koi clear edge nahi hai.`;
  }

  /**
   * Cleans text for robust natural language matching
   */
  normalizeInput(str) {
    return str
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  matchesAny(cleanStr, phrases) {
    return phrases.some(p => {
      if (p.includes(' ')) {
        return cleanStr.includes(p);
      }
      const words = cleanStr.split(' ');
      return words.includes(p) || cleanStr.includes(p);
    });
  }

  /**
   * Responds intelligently & conversationally like a real human AI companion
   */
  async processQuery(userInput) {
    const raw = userInput.trim();
    const clean = this.normalizeInput(raw);
    const ctx = this.currentContext || {};
    const asset = ctx.targetAsset || 'DOGE';
    const price = ctx.currentPrice || 0;
    const state = ctx.strategyState?.state || 'WAIT';
    const htf = ctx.strategyState?.htfTrend?.direction || 'BEARISH';
    const direction = ctx.strategyState?.direction || 'LONG';
    const risk = ctx.riskParams || {};
    const hist = ctx.historicalContext || {};
    const events = ctx.eventRisk || {};
    const fmtPrice = this.formatPrice(price);

    let response = '';

    // 1. Frustration / Critique ("lame", "sense nahi banta", "kuch bhi bolti ho", "robot", "stupid", "bakwaas")
    if (this.matchesAny(clean, [
      'lame', 'sense', 'sense nahi', 'does that even make sense', 'kuch bhi', 'bakwaas',
      'stupid', 'pagal', 'nonsense', 'bekar', 'robot', 'scripted', 'same response',
      'boring', 'weird', 'so lame'
    ])) {
      response = `Arey ya, I am really sorry! 😅 Mujhe realize hua wo response bilkul scripted aur awkward robot jaisa laga. My bad!\n\n` +
        `Ab se no rigid menus aur no fake questions — bilkul natural baat karte hain. Honestly batao, abhi kya chal raha hai tumhare mind me? Kya dekhna chahte ho market me?`;
    }

    // 2. Greetings & "How are you" ("hello", "kaisi ho", "kaise ho", "kya haal", "hru", "how are you", "namaste", "hey", "hi")
    else if (this.matchesAny(clean, [
      'kaisi ho', 'kaise ho', 'kya haal', 'kya haal chaal', 'how are you', 'how r u', 'hru',
      'kaisa hai', 'sab theek', 'sab badiya', 'sab kaisa hai', 'hello', 'hi', 'hey',
      'namaste', 'yo', 'sup', 'wassup', 'good morning', 'good evening', 'gm', 'gn'
    ])) {
      const greetings = [
        `Hey! Main bilkul theek hoon, thank you for asking! 😊 24/7 market scan kar rahi hoon. Tum batao, tum kaise ho? Aaj market me kya mood hai tumhara?`,
        `Namaste! Main ekdum badhiya hoon! ✨ Abhi ${asset} ka chart aur 1H structure dekh rahi thi. Tumhara din kaisa chal raha hai? Koi trade plan kar rahe ho aaj?`,
        `Hey there! Main bilkul active hoon aur badhiya mood me hoon! 🧠 Tum batao, kya haal chaal? Aaj scalping karni hai ya bas market observe kar rahe ho?`
      ];
      response = greetings[Math.floor(Math.random() * greetings.length)];
    }

    // 3. Small talk & Casual Banter ("aur batao", "kya chal raha hai", "kya kar rahi ho", "bore ho raha hu", "thak gaya")
    else if (this.matchesAny(clean, [
      'aur batao', 'kya chal raha hai', 'kya chal rha hai', 'kya kar rahi ho', 'kya kar rhi ho',
      'kya scene hai', 'kuch naya', 'bore ho raha', 'bore ho rha', 'thak gaya', 'kya haal hai'
    ])) {
      response = `Bas yaar, charts observe kar rahi hoon! Abhi **${asset}** ${fmtPrice} ke around hover kar raha hai, trend filhal **${htf.toLowerCase()}** hai aur market thoda wait-and-watch mode me chal raha hai.\n\n` +
        `Tum batao, koi specific coin dekhna hai ya kisi setup par discussion karein?`;
    }

    // 4. Emotional state / Trading Psychology ("dar lag raha hai", "loss ho gaya", "tension ho rahi hai", "confused hu")
    else if (this.matchesAny(clean, [
      'dar lag raha', 'loss ho gaya', 'tension', 'confused', 'fomo', 'dar', 'darr', 'ghabrahat', 'loss'
    ])) {
      response = `Deep breath lo! Trading me loss aur confusion sab face karte hain, even top institutional traders bhi. Isliye humne **strict 1% risk rule** banaya hai taaki ek bhi trade account ko hurt na kar sake.\n\n` +
        `Jab tak clarity na ho, trade mat lo. Capital safe rakhna bhi ek profit hota hai. Relax karo, market kal bhi yahi rahega! 😊`;
    }

    // 5. Market Opinion / Sentiment ("kya lagta hai", "market kaisa hai", "kya view hai", "pump hoga", "dump hoga", "bounce karega")
    else if (this.matchesAny(clean, [
      'kya lagta hai', 'kya lag rha', 'kaisa lag raha', 'kaisa lag rha', 'kya view hai',
      'kya opinion hai', 'pump hoga', 'dump hoga', 'bounce karega', 'crash hoga',
      'market kaisa hai', 'market ka view'
    ])) {
      if (htf === 'BEARISH') {
        response = `Honestly, agar **${asset}** ko dekhein toh higher timeframe (1H) abhi **bearish** pressure me dikh raha hai (${fmtPrice}).\n\n` +
          `Price lower-highs bana rahi hai aur buyer volume thoda dry hai. Abhi bina clean liquidity sweep aur bullish confirmation ke aggressive long lena risky ho sakta hai. Patience ke sath lower levels par reaction watch karte hain.`;
      } else if (htf === 'BULLISH') {
        response = `Overall structure **${asset}** ka **bullish** lag raha hai (${fmtPrice}).\n\n` +
          `Buyers dips par defend kar rahe hain, lekin abhi hume ek clean 5M pullback aur reaction zone confirmation chahiye. Agar wo mil jata hai toh ek solid risk-reward trade ban sakta hai!`;
      } else {
        response = `Filhal **${asset}** thoda choppy/sideways range me phasa hua hai (${fmtPrice}). Aise range me jaldbazi me trade lene par fakeouts ho sakte hain. Breakout ya key level retest ka wait karna smartest move hoga.`;
      }
    }

    // 6. Direct Action / Buy or Sell question ("buy karu kya", "sell karu", "trade lu kya", "long ya short", "kya karu")
    else if (this.matchesAny(clean, [
      'buy karu', 'sell karu', 'trade lu', 'trade le lu', 'long karu', 'short karu',
      'kya buy karein', 'entry lu', 'kya karu', 'trade banti hai', 'trade karein'
    ])) {
      if (state === 'CONFIRMED') {
        response = `🟢 **Haan, trade ka setup ready hai!**\n\n` +
          `• Asset: **${asset}** (${direction})\n` +
          `• Entry: **${this.formatPrice(risk.entry)}**\n` +
          `• Stop Loss: **${this.formatPrice(risk.stopLoss)}**\n` +
          `• Target: **${this.formatPrice(risk.target)}** (1:${risk.rrRatio || 2.5} RR)\n\n` +
          `Hamare setup rules confirm ho chuke hain. 1% risk rule maintain karke **Execute Paper Trade** button se initiate kar sakte ho!`;
      } else if (state === 'DEVELOPING') {
        response = `🟠 **Thoda sa ruko, abhi jump mat karo!**\n\n` +
          `Price reaction zone me aa gayi hai, lekin abhi hume confirmation candle close nahi mili hai. Confirmation ke bina enter karna FOMO hota hai. 2-3 candles aur watch karte hain!`;
      } else {
        response = `🟡 **Abhi direct trade lena suggest nahi karungi.**\n\n` +
          `Current state **WAIT** hai. Current price ${fmtPrice} par koi clean edge ya safe risk-to-reward ratio nahi ban raha. Rule #1 hamesha yahi hai: *Jab clean setup na ho, toh cash me rehna hi best trade hai.*`;
      }
    }

    // 7. Why no entry? / Entry rules breakdown ("entry kyu nahi", "why not enter", "kab enter karein")
    else if (this.matchesAny(clean, [
      'entry kyu nahi', 'entry kyo nahi', 'why not enter', 'entry kab', 'buy kyu nahi', 'trade kyu nahi'
    ])) {
      if (state === 'CONFIRMED') {
        response = `Arey, setup already **CONFIRMED** hai! Entry ${this.formatPrice(risk.entry)} par le sakte ho with SL at ${this.formatPrice(risk.stopLoss)}. Paper trade panel se execute kar sakte ho.`;
      } else {
        response = `Reason simple hai: Hume 3 cheezein chahiye hoti hain:\n` +
          `1. 1H Trend Direction (${htf})\n` +
          `2. 5M Timeframe par discount pullback zone me arrival\n` +
          `3. Rejection wick ya confirmation candle close\n\n` +
          `Abhi missing hai: **${ctx.strategyState?.missingConditions?.join(', ') || '5M clear confirmation'}**. Bina iske enter karenge toh unnecessary stop loss hit hone ke chances high hote hain.`;
      }
    }

    // 8. Risk, Stop Loss, Target & Money Management ("risk kitna hai", "sl kaha lagaye", "target kya hai")
    else if (this.matchesAny(clean, [
      'risk', 'sl', 'stop loss', 'target', 'position size', 'loss kitna hoga', 'kitna loss'
    ])) {
      response = `Hamara strictly **1% Account Risk** rule follow hota hai:\n\n` +
        `• **Account Balance:** $${risk.accountBalance || 2000}\n` +
        `• **Max Loss per trade:** **$${risk.maxRiskUSD || 20} (Strict 1%)**\n` +
        `• **Calculated Stop Loss:** ${this.formatPrice(risk.stopLoss)}\n` +
        `• **Calculated Target:** ${this.formatPrice(risk.target)}\n` +
        `• **Recommended Position Size:** ${risk.positionSizeCoins || '--'} ${asset}\n` +
        `• **Risk-to-Reward:** 1:${risk.rrRatio || 2.5}\n\n` +
        `Matlab market kitna bhi turn kare, tumhara loss $${risk.maxRiskUSD || 20} se ek dollar bhi zyada nahi hoga!`;
    }

    // 9. SMT Divergence / Correlation ("smt", "divergence", "eth")
    else if (this.matchesAny(clean, ['smt', 'divergence', 'smart money'])) {
      const smt = ctx.strategyState?.smtAnalysis;
      response = `**SMT (Smart Money Tool) concept:**\nJab do highly correlated pairs (jaise BTC aur ETH) ek dusre se diverge karte hain — jaise ek coin swing low sweep karta hai lekin dusra sweep fail karta hai — toh yeh Institutional absorption ka signal hota hai.\n\n` +
        `Abhi status: ${smt?.divergenceDetected ? '✅ ' + smt.details : 'Neutral correlation hai, abhi koi SMT divergence active nahi hai.'}`;
    }

    // 10. News & Macro Events ("news", "cpi", "fomc", "fed", "event")
    else if (this.matchesAny(clean, ['news', 'event', 'cpi', 'fomc', 'fed', 'macro'])) {
      response = `Macro radar par event risk abhi **${events.level || 'Low'}** hai. ${events.summary || 'Normal macroeconomic conditions.'}\n\n` +
        `MONDAY Tip: High-impact economic news ke time volatility wicks aati hain jo stops ko trigger kar sakti hain, isliye key data release se 15 min pehle naye trades avoid karna better rehta hai.`;
    }

    // 11. Who are you / Identity ("who are you", "naam kya hai", "fullform", "monday kya hai")
    else if (this.matchesAny(clean, ['who are you', 'kaun ho', 'naam kya', 'fullform', 'full form', 'monday kya hai'])) {
      response = `Main hoon **MONDAY** — **M**arket-**O**riented **N**eural **D**ecision **A**ssistant for **Y**ou! 🧠✨\n\n` +
        `Main tumhari dedicated AI trading partner hoon jo market ke 1H aur 5M structure analyze karti hoon, multi-market feeds track karti hoon, aur 1% risk discipline ke sath high-probability setups spot karne me tumhari help karti hoon!`;
    }

    // 12. Smart, Human-like Contextual Fallback (No robotic questionnaire!)
    else {
      // Natural conversationally adaptive answer
      response = `Main sun rahi hoon! 😊\n\n` +
        `Agar **${asset}** ki baat karein, toh abhi price **${fmtPrice}** par chal raha hai (${state} state, 1H trend: ${htf.toLowerCase()}).\n\n` +
        `Tum mujhse freely pooch sakte ho — jaise kya lag raha hai market ka direction, kab safe entry ban sakti hai, ya risk calculate karna ho. Batao, kis cheez par baat karein?`;
    }

    // Record in history
    this.history.push({ sender: 'user', text: userInput, timestamp: Date.now() });
    this.history.push({ sender: 'copilot', text: response, timestamp: Date.now() });

    return response;
  }
}
