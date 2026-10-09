/**
 * Terminal UI Coordinator
 * Handles DOM rendering, interactive panels, chat transcript, voice visualizer,
 * paper trade modals, and real-time state telemetry.
 */
export class TerminalUI {
  constructor({
    onAssetChange,
    onMarketChange,
    onTimeframeChange,
    onSearchCrypto,
    onSendMessage,
    onToggleVoice,
    onToggleMute,
    onExecuteTrade,
    onCloseTrade,
    onResetAccount
  }) {
    this.callbacks = {
      onAssetChange,
      onMarketChange,
      onTimeframeChange,
      onSearchCrypto,
      onSendMessage,
      onToggleVoice,
      onToggleMute,
      onExecuteTrade,
      onCloseTrade,
      onResetAccount
    };

    this.bindEvents();
  }

  bindEvents() {
    // Universal Crypto Search Bar
    const searchContainer = document.getElementById('crypto_search_container');
    const searchInput = document.getElementById('crypto_search_input');
    const searchResults = document.getElementById('crypto_search_results');
    const searchClearBtn = document.getElementById('search_clear_btn');

    const renderSearchResults = (items) => {
      if (!searchResults) return;
      if (!items || items.length === 0) {
        searchResults.innerHTML = `<div class="search-empty-msg">No cryptocurrencies found matching query.</div>`;
        return;
      }
      searchResults.innerHTML = items.map(m => {
        const isPos = m.changePercent >= 0;
        const formattedPrice = m.price >= 1 ? `$${m.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${m.price.toFixed(6)}`;
        return `
          <button class="search-result-item" data-asset="${m.baseAsset}" type="button">
            <div class="search-res-left">
              <span class="search-res-symbol">${m.baseAsset}</span>
              <span class="search-res-pair">${m.symbol}</span>
            </div>
            <div class="search-res-right">
              <span class="search-res-price">${formattedPrice}</span>
              <span class="search-res-change ${isPos ? 'bullish' : 'bearish'}">
                ${isPos ? '+' : ''}${m.changePercent.toFixed(2)}%
              </span>
            </div>
          </button>
        `;
      }).join('');

      searchResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          const asset = item.dataset.asset;
          if (this.callbacks.onAssetChange) this.callbacks.onAssetChange(asset);
          if (searchContainer) searchContainer.classList.remove('open');
          if (searchInput) searchInput.value = '';
          if (searchClearBtn) searchClearBtn.style.display = 'none';
          this.setActiveWatchlistAsset(asset);
        });
      });
    };

    if (searchInput && searchContainer) {
      searchInput.addEventListener('focus', () => {
        if (this.callbacks.onSearchCrypto) {
          const items = this.callbacks.onSearchCrypto(searchInput.value.trim());
          renderSearchResults(items);
          searchContainer.classList.add('open');
        }
      });

      searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        if (searchClearBtn) {
          searchClearBtn.style.display = query ? 'flex' : 'none';
        }
        if (this.callbacks.onSearchCrypto) {
          const items = this.callbacks.onSearchCrypto(query);
          renderSearchResults(items);
          searchContainer.classList.add('open');
        }
      });
    }

    if (searchClearBtn && searchInput) {
      searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchClearBtn.style.display = 'none';
        if (this.callbacks.onSearchCrypto) {
          const items = this.callbacks.onSearchCrypto('');
          renderSearchResults(items);
        }
      });
    }

    // Close search dropdown on click outside
    document.addEventListener('click', (e) => {
      if (searchContainer && !searchContainer.contains(e.target)) {
        searchContainer.classList.remove('open');
      }
    });

    // Market Selector
    document.querySelectorAll('.market-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const market = e.currentTarget.dataset.market;
        if (market !== 'Crypto') {
          this.showToast(`Market: ${market}`, 'Coming in Phase 3 & 4. Crypto is active for MVP.', 'info');
          return;
        }
        document.querySelectorAll('.market-tab-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        if (this.callbacks.onMarketChange) this.callbacks.onMarketChange(market);
      });
    });

    // Mobile Navigation Tabs Handler
    document.querySelectorAll('.mobile-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetId = e.currentTarget.dataset.target;
        document.querySelectorAll('.mobile-tab-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        // Toggle mobile active panel
        document.querySelectorAll('.terminal-panel').forEach(panel => {
          panel.classList.toggle('active-mobile-panel', panel.id === targetId);
        });
      });
    });

    // Quick Watchlist Pills
    document.querySelectorAll('.asset-pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.asset-pill-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const asset = e.currentTarget.dataset.asset;
        if (this.callbacks.onAssetChange) this.callbacks.onAssetChange(asset);
      });
    });

    // Timeframe Tray & Pinned Buttons
    const dropdownContainer = document.querySelector('.tf-dropdown-container');
    const trayTriggerBtn = document.getElementById('tf_tray_trigger');
    const trayCloseBtn = document.getElementById('tf_tray_close_btn');
    const currentTfDisplay = document.getElementById('current_tf_display');

    if (trayTriggerBtn && dropdownContainer) {
      trayTriggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownContainer.classList.toggle('open');
      });
    }

    if (trayCloseBtn && dropdownContainer) {
      trayCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownContainer.classList.remove('open');
      });
    }

    // Close tray when clicking outside
    document.addEventListener('click', (e) => {
      if (dropdownContainer && !dropdownContainer.contains(e.target)) {
        dropdownContainer.classList.remove('open');
      }
    });

    // Handle Timeframe Tray Item selection
    document.querySelectorAll('.tf-tray-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const tf = item.dataset.tf;
        const label = item.dataset.label || tf;

        // Update active class on tray items
        document.querySelectorAll('.tf-tray-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');

        // Update pinned buttons if matching
        document.querySelectorAll('.tf-pinned-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.tf.toUpperCase() === tf.toUpperCase());
        });

        // Update trigger display
        if (currentTfDisplay) {
          currentTfDisplay.textContent = label;
        }

        // Close tray
        if (dropdownContainer) dropdownContainer.classList.remove('open');

        if (this.callbacks.onTimeframeChange) {
          this.callbacks.onTimeframeChange(tf);
        }
      });
    });

    // Handle Pinned Strategy Buttons
    document.querySelectorAll('.tf-pinned-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tf = btn.dataset.tf;
        const label = btn.textContent.trim();

        document.querySelectorAll('.tf-pinned-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update tray items active state
        document.querySelectorAll('.tf-tray-item').forEach(item => {
          item.classList.toggle('active', item.dataset.tf.toUpperCase() === tf.toUpperCase());
        });

        // Update trigger display
        if (currentTfDisplay) {
          currentTfDisplay.textContent = label;
        }

        if (this.callbacks.onTimeframeChange) {
          this.callbacks.onTimeframeChange(tf);
        }
      });
    });

    // Chat Input Form
    const chatForm = document.getElementById('chat_form');
    const chatInput = document.getElementById('chat_input');
    if (chatForm && chatInput) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (text) {
          if (this.callbacks.onSendMessage) this.callbacks.onSendMessage(text);
          chatInput.value = '';
        }
      });
    }

    // Quick Prompt Chips
    document.querySelectorAll('.quick-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const prompt = e.currentTarget.textContent.trim();
        if (this.callbacks.onSendMessage) this.callbacks.onSendMessage(prompt);
      });
    });

    // Voice Mic Button
    const voiceBtn = document.getElementById('voice_mic_btn');
    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => {
        if (this.callbacks.onToggleVoice) this.callbacks.onToggleVoice();
      });
    }

    // Voice Mute Toggle
    const muteBtn = document.getElementById('voice_mute_btn');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        if (this.callbacks.onToggleMute) {
          const isMuted = this.callbacks.onToggleMute();
          muteBtn.classList.toggle('muted', isMuted);
          muteBtn.title = isMuted ? 'Unmute AI Voice' : 'Mute AI Voice';
          muteBtn.innerHTML = isMuted ? '<i class="ph ph-speaker-slash"></i>' : '<i class="ph ph-speaker-high"></i>';
        }
      });
    }

    // Execute Paper Trade Button
    const execBtn = document.getElementById('execute_trade_btn');
    if (execBtn) {
      execBtn.addEventListener('click', () => {
        if (this.callbacks.onExecuteTrade) this.callbacks.onExecuteTrade();
      });
    }

    // Reset Account Button
    const resetBtn = document.getElementById('reset_account_btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Kya tum account balance aur journal reset karna chahte ho?')) {
          if (this.callbacks.onResetAccount) this.callbacks.onResetAccount();
        }
      });
    }

    // Journal Modal Toggles
    const journalBtn = document.getElementById('open_journal_btn');
    const journalModal = document.getElementById('journal_modal');
    const closeJournalBtn = document.getElementById('close_journal_btn');

    if (journalBtn && journalModal) {
      journalBtn.addEventListener('click', () => {
        journalModal.classList.add('open');
      });
    }
    if (closeJournalBtn && journalModal) {
      closeJournalBtn.addEventListener('click', () => {
        journalModal.classList.remove('open');
      });
    }
  }

  setActiveWatchlistAsset(asset) {
    let matched = false;
    document.querySelectorAll('.asset-pill-btn').forEach(b => {
      const isMatch = b.dataset.asset === asset;
      b.classList.toggle('active', isMatch);
      if (isMatch) matched = true;
    });

    // If selected asset is not already in top quick pills, dynamically add it and make it active
    if (!matched) {
      const container = document.getElementById('quick_watchlist_pills');
      if (container) {
        document.querySelectorAll('.asset-pill-btn').forEach(b => b.classList.remove('active'));
        const newBtn = document.createElement('button');
        newBtn.className = 'asset-pill-btn active';
        newBtn.dataset.asset = asset;
        newBtn.textContent = asset;
        newBtn.addEventListener('click', () => {
          document.querySelectorAll('.asset-pill-btn').forEach(b => b.classList.remove('active'));
          newBtn.classList.add('active');
          if (this.callbacks.onAssetChange) this.callbacks.onAssetChange(asset);
        });
        container.appendChild(newBtn);
      }
    }
  }

  formatPrice(price) {
    if (price === undefined || price === null || isNaN(price)) return '$0.00';
    const num = Number(price);
    if (num >= 1000) {
      return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (num >= 1) {
      return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
    } else if (num >= 0.001) {
      return `$${num.toFixed(5)}`;
    } else if (num >= 0.00001) {
      return `$${num.toFixed(7)}`;
    } else {
      return `$${num.toFixed(8)}`;
    }
  }

  updateTicker({ asset, price, changePercent, high24h, low24h, source }) {
    const priceEl = document.getElementById('live_ticker_price');
    const changeEl = document.getElementById('live_ticker_change');
    const sourceEl = document.getElementById('feed_source_badge');

    if (priceEl && price !== undefined) {
      const oldPrice = parseFloat(priceEl.dataset.rawPrice || 0);
      priceEl.dataset.rawPrice = price;
      priceEl.textContent = this.formatPrice(price);

      if (oldPrice > 0 && price !== oldPrice) {
        priceEl.classList.remove('tick-up', 'tick-down');
        void priceEl.offsetWidth; // Trigger reflow for re-animation
        priceEl.classList.add(price > oldPrice ? 'tick-up' : 'tick-down');
      }
    }
    if (changeEl && changePercent !== undefined) {
      const isPos = changePercent >= 0;
      changeEl.textContent = `${isPos ? '+' : ''}${changePercent.toFixed(2)}%`;
      changeEl.className = `ticker-change ${isPos ? 'bullish' : 'bearish'}`;
    }
    if (sourceEl && source) {
      sourceEl.textContent = source;
    }
  }

  updateStrategyState(strategyState) {
    const badgeEl = document.getElementById('ai_state_badge');
    const directionEl = document.getElementById('meta_direction');
    const htfEl = document.getElementById('meta_htf_trend');
    const setupEl = document.getElementById('meta_setup');
    const confirmEl = document.getElementById('meta_confirmation');
    const execBtn = document.getElementById('execute_trade_btn');

    if (!strategyState) return;

    const state = strategyState.state || 'WAIT';
    if (badgeEl) {
      badgeEl.className = `state-badge state-${state.toLowerCase().replace(' ', '-')}`;
      let icon = 'ph-clock';
      if (state === 'CONFIRMED') icon = 'ph-check-circle';
      else if (state === 'DEVELOPING') icon = 'ph-hourglass-high';
      else if (state === 'CANCELLED') icon = 'ph-x-circle';
      else if (state === 'NO SETUP') icon = 'ph-minus-circle';

      badgeEl.innerHTML = `<i class="ph ${icon}"></i> <span>${state}</span>`;
    }

    if (directionEl) {
      directionEl.textContent = strategyState.direction || 'LONG';
      directionEl.className = `meta-val ${strategyState.direction === 'LONG' ? 'bullish' : 'bearish'}`;
    }

    if (htfEl) {
      htfEl.textContent = strategyState.htfTrend?.direction || 'UNCLEAR';
      htfEl.className = `meta-val ${strategyState.htfTrend?.direction === 'BULLISH' ? 'bullish' : strategyState.htfTrend?.direction === 'BEARISH' ? 'bearish' : 'neutral'}`;
    }

    if (setupEl) {
      setupEl.textContent = strategyState.ltfStructure?.inPullbackZone ? 'Pullback In Zone' : 'Waiting Pullback';
    }

    if (confirmEl) {
      confirmEl.textContent = strategyState.ltfStructure?.hasConfirmation ? 'Confirmed (Wick Close)' : 'Pending Reaction';
    }

    // Enable/disable execution button depending on state
    if (execBtn) {
      if (state === 'CONFIRMED') {
        execBtn.disabled = false;
        execBtn.classList.add('pulse-ready');
        execBtn.innerHTML = `<i class="ph ph-lightning"></i> <span>Execute Paper Trade (Confirmed)</span>`;
      } else {
        execBtn.disabled = false; // allow demo testing even if waiting
        execBtn.classList.remove('pulse-ready');
        execBtn.innerHTML = `<i class="ph ph-paper-plane-tilt"></i> <span>Execute Paper Trade (${state})</span>`;
      }
    }
  }

  updateContextTelemetry({ historicalContext, eventRisk }) {
    const histEl = document.getElementById('meta_hist_context');
    const eventEl = document.getElementById('meta_event_risk');

    if (histEl && historicalContext) {
      histEl.textContent = `${historicalContext.contextTag} (${historicalContext.historicalWinRate}%)`;
      histEl.className = `meta-val tag-${historicalContext.contextTag.toLowerCase()}`;
    }

    if (eventEl && eventRisk) {
      eventEl.textContent = `${eventRisk.level} Risk`;
      eventEl.className = `meta-val risk-${eventRisk.level.toLowerCase()}`;
    }

    // News Radar container
    const newsContainer = document.getElementById('news_radar_list');
    if (newsContainer && eventRisk && eventRisk.activeEvents) {
      newsContainer.innerHTML = eventRisk.activeEvents.map(evt => `
        <div class="news-item impact-${evt.riskLevel.toLowerCase()}">
          <div class="news-header">
            <span class="news-impact-tag">${evt.impact}</span>
            <span class="news-time">${evt.timeWindow}</span>
          </div>
          <div class="news-title">${evt.title}</div>
          <div class="news-desc">${evt.details}</div>
        </div>
      `).join('');
    }

    // Historical Pattern Card
    const histCard = document.getElementById('historical_pattern_card');
    if (histCard && historicalContext) {
      histCard.innerHTML = `
        <div class="hist-title"><i class="ph ph-git-commit"></i> ${historicalContext.patternName}</div>
        <div class="hist-stats-row">
          <div class="stat-col"><span class="k">Sample:</span> <span class="v">${historicalContext.sampleSize} setups</span></div>
          <div class="stat-col"><span class="k">Win Rate:</span> <span class="v text-bullish">${historicalContext.historicalWinRate}%</span></div>
          <div class="stat-col"><span class="k">Avg RR:</span> <span class="v">1:${historicalContext.expectedRR}</span></div>
        </div>
        <div class="hist-desc">${historicalContext.explanation}</div>
        <div class="hist-disclaimer">ℹ️ ${historicalContext.disclaimer}</div>
      `;
    }
  }

  updateRiskParameters(riskParams) {
    if (!riskParams) return;

    const entryEl = document.getElementById('calc_entry');
    const slEl = document.getElementById('calc_sl');
    const tpEl = document.getElementById('calc_tp');
    const posSizeEl = document.getElementById('calc_pos_size');
    const maxRiskEl = document.getElementById('calc_max_risk');
    const rrEl = document.getElementById('calc_rr');
    const metaRREl = document.getElementById('meta_rr');

    if (entryEl) entryEl.textContent = this.formatPrice(riskParams.entry);
    if (slEl) slEl.textContent = this.formatPrice(riskParams.stopLoss);
    if (tpEl) tpEl.textContent = this.formatPrice(riskParams.target);
    if (posSizeEl) posSizeEl.textContent = `${riskParams.positionSizeCoins} coins`;
    if (maxRiskEl) maxRiskEl.textContent = `$${riskParams.maxRiskUSD} (1.0%)`;
    if (rrEl) {
      rrEl.textContent = `1:${riskParams.rrRatio}`;
      rrEl.className = `calc-val ${riskParams.isRRValid ? 'text-bullish' : 'text-bearish'}`;
    }
    if (metaRREl) {
      metaRREl.textContent = `1:${riskParams.rrRatio}`;
    }
  }

  appendChatMessage(sender, text) {
    const container = document.getElementById('chat_messages');
    if (!container) return;

    const msgEl = document.createElement('div');
    msgEl.className = `chat-bubble ${sender}-bubble`;

    // Simple markdown conversion for bold, bullets, line breaks
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>')
      .replace(/•/g, '&bull;');

    msgEl.innerHTML = `
      <div class="bubble-header">
        <span class="sender-name">${sender === 'user' ? '👤 You' : '🤖 MONDAY'}</span>
        <span class="msg-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div class="bubble-body">${formatted}</div>
    `;

    container.appendChild(msgEl);
    container.scrollTop = container.scrollHeight;
  }

  setVoiceListening(isListening) {
    const micBtn = document.getElementById('voice_mic_btn');
    const radar = document.getElementById('voice_activity_radar');
    const indicator = document.getElementById('voice_status_indicator');
    if (micBtn) {
      micBtn.classList.toggle('listening', isListening);
    }
    if (radar) {
      radar.classList.toggle('active-listening', isListening);
    }
    if (indicator) {
      indicator.textContent = isListening ? 'MONDAY is listening...' : 'MONDAY Active • Ready';
    }
  }

  setVoiceSpeaking(isSpeaking) {
    const radar = document.getElementById('voice_activity_radar');
    const indicator = document.getElementById('voice_status_indicator');
    if (radar) {
      radar.classList.toggle('active-speaking', isSpeaking);
    }
    if (indicator) {
      indicator.textContent = isSpeaking ? 'MONDAY is speaking...' : 'MONDAY Active • Ready';
    }
  }

  updateOpenPositions(positions) {
    const container = document.getElementById('open_positions_list');
    const countBadge = document.getElementById('open_positions_count');
    if (countBadge) countBadge.textContent = positions.length;

    if (!container) return;

    if (positions.length === 0) {
      container.innerHTML = `<div class="empty-state">No open positions. Setup awaiting confirmation.</div>`;
      return;
    }

    container.innerHTML = positions.map(pos => {
      const isPos = pos.unrealizedPnlUSD >= 0;
      const isLong = pos.direction === 'LONG';
      const range = Math.abs(pos.target - pos.stopLoss) || 1;
      const progress = isLong
        ? Math.min(100, Math.max(0, ((pos.currentPrice - pos.stopLoss) / range) * 100))
        : Math.min(100, Math.max(0, ((pos.stopLoss - pos.currentPrice) / range) * 100));

      return `
        <div class="position-card">
          <div class="pos-top">
            <div class="pos-badge-group">
              <span class="pos-asset-pill">${pos.asset}</span>
              <span class="pos-direction-pill ${pos.direction.toLowerCase()}">${pos.direction}</span>
            </div>
            <span class="pos-pnl-chip ${isPos ? 'bullish' : 'bearish'}">
              ${isPos ? '+' : ''}$${pos.unrealizedPnlUSD.toFixed(2)} (${isPos ? '+' : ''}${pos.unrealizedR}R)
            </span>
          </div>

          <!-- Target/SL Progress Bar -->
          <div class="pos-progress-wrapper" title="Progress towards Target (SL on left, TP on right)">
            <div class="pos-progress-track">
              <div class="pos-progress-fill ${isPos ? 'bullish' : 'bearish'}" style="width: ${progress}%;"></div>
              <div class="pos-progress-marker" style="left: ${progress}%;"></div>
            </div>
            <div class="pos-progress-labels">
              <span>SL ${this.formatPrice(pos.stopLoss)}</span>
              <span>TP ${this.formatPrice(pos.target)}</span>
            </div>
          </div>

          <div class="pos-grid">
            <div class="pos-grid-cell"><span class="lbl">Entry</span><span class="val">${this.formatPrice(pos.entry)}</span></div>
            <div class="pos-grid-cell"><span class="lbl">Current</span><span class="val highlight">${this.formatPrice(pos.currentPrice)}</span></div>
            <div class="pos-grid-cell"><span class="lbl">Size</span><span class="val">${pos.positionSize}</span></div>
            <div class="pos-grid-cell"><span class="lbl">Max Risk</span><span class="val">$${pos.riskUSD} (1%)</span></div>
            <div class="pos-grid-cell"><span class="lbl">RR Ratio</span><span class="val">1:${pos.rrRatio}</span></div>
            <div class="pos-grid-cell"><span class="lbl">Strategy</span><span class="val">1H/5M SMT</span></div>
          </div>

          <div class="pos-footer">
            <span class="pos-time"><i class="ph ph-clock"></i> ${new Date(pos.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <button class="btn-close-pos" data-trade-id="${pos.id}" type="button">
              <i class="ph ph-x-circle"></i> Close Trade
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach close buttons
    container.querySelectorAll('.btn-close-pos').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tradeId = e.currentTarget.dataset.tradeId;
        if (this.callbacks.onCloseTrade) this.callbacks.onCloseTrade(tradeId);
      });
    });
  }

  updateJournalAndAnalytics(analytics, trades) {
    // Header Balance & Stats
    const balEl = document.getElementById('header_balance');
    const totalREl = document.getElementById('header_total_r');
    if (balEl) balEl.textContent = `$${analytics.balance.toLocaleString()}`;
    if (totalREl) {
      const isPos = analytics.totalR >= 0;
      totalREl.textContent = `${isPos ? '+' : ''}${analytics.totalR}R`;
      totalREl.className = `stat-num ${isPos ? 'bullish' : 'bearish'}`;
    }

    // Modal Analytics
    const mBal = document.getElementById('modal_stat_balance');
    const mTrades = document.getElementById('modal_stat_trades');
    const mWinRate = document.getElementById('modal_stat_winrate');
    const mTotalR = document.getElementById('modal_stat_total_r');
    const mPf = document.getElementById('modal_stat_pf');
    const mStreak = document.getElementById('modal_stat_streak');

    if (mBal) mBal.textContent = `$${analytics.balance.toLocaleString()}`;
    if (mTrades) mTrades.textContent = `${analytics.totalTrades} (${analytics.winCount}W / ${analytics.lossCount}L)`;
    if (mWinRate) mWinRate.textContent = `${analytics.winRate}%`;
    if (mTotalR) mTotalR.textContent = `${analytics.totalR >= 0 ? '+' : ''}${analytics.totalR}R`;
    if (mPf) mPf.textContent = `${analytics.profitFactor}`;
    if (mStreak) mStreak.textContent = `${analytics.maxLosingStreak}`;

    // Journal Trades Table / Cards
    const tableBody = document.getElementById('journal_trades_tbody');
    if (!tableBody) return;

    if (trades.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="9" class="text-center">No trades recorded yet.</td></tr>`;
      return;
    }

    tableBody.innerHTML = trades.map(t => {
      const isWin = t.result === 'WIN';
      const resultClass = isWin ? 'bullish' : t.result === 'LOSS' ? 'bearish' : 'neutral';
      return `
        <tr>
          <td><strong>${t.id}</strong></td>
          <td>${new Date(t.openedAt).toLocaleDateString()}</td>
          <td><span class="badge-asset">${t.asset}</span></td>
          <td><span class="badge-${t.direction.toLowerCase()}">${t.direction}</span></td>
          <td>$${t.entry}</td>
          <td>$${t.exitPrice || t.currentPrice}</td>
          <td>1:${t.rrRatio}</td>
          <td><span class="result-tag ${resultClass}">${t.result} (${t.rMultiple >= 0 ? '+' : ''}${t.rMultiple}R)</span></td>
          <td><span class="pnl-val ${resultClass}">${t.pnlUSD >= 0 ? '+' : ''}$${t.pnlUSD}</span></td>
        </tr>
      `;
    }).join('');
  }

  showToast(title, message, type = 'info') {
    const container = document.getElementById('toast_container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} slide-in`;
    toast.innerHTML = `
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${message}</div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  }
}
