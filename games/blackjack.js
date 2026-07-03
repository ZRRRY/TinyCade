/* ============================================================
   games/blackjack.js — 21点(casual)
   牌组,rng 洗牌. BTN.a hit, BTN.b stand.
   ============================================================ */

import { centerText } from '../engine/draw.js';

export default {
  meta: {
    id: 'blackjack',
    name: '21 点',
    desc: '比大小不超过 21',
    icon: '🃏',
    cat: 'casual',
    controls: 'BTN.a 要牌 · BTN.b 停牌 · BTN.start 重开',
  },
  tickHz: 5,

  create(rng, api) {
    const W = 360, H = 480;
    let deck, player, dealer, state, cursor, frame = 0;

    function cardStr(c) {
      const s = ['♠', '♥', '♦', '♣'][Math.floor(c / 13)];
      const r = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][c % 13];
      return `${s}${r}`;
    }
    function val(hand) {
      let v = 0, a = 0;
      hand.forEach((c) => {
        const r = c % 13;
        if (r === 0) { a++; v += 11; }
        else if (r < 10) v += r + 1;
        else v += 10;
      });
      while (v > 21 && a) { v -= 10; a--; }
      return v;
    }
    function deal() {
      deck = Array.from({ length: 52 }, (_, i) => i);
      for (let i = deck.length - 1; i > 0; i--) {
        const j = rng.int(i + 1);
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      player = [deck.pop(), deck.pop()];
      dealer = [deck.pop(), deck.pop()];
      state = 'play';
    }
    function stand() {
      while (val(dealer) < 17) dealer.push(deck.pop());
      const pv = val(player), dv = val(dealer);
      if (pv > 21) state = 'lose';
      else if (dv > 21 || pv > dv) state = 'win';
      else if (pv === dv) state = 'push';
      else state = 'lose';
    }

    deal();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return state === 'win' || state === 'lose' || state === 'push'; },
      update(input) {
        const p = input.pressed;
        if (p.start) { deal(); return; }
        if (state !== 'play') return;
        if (p.a) {
          player.push(deck.pop());
          if (val(player) > 21) { state = 'lose'; api.emit('lose'); }
          else api.emit('move');
        } else if (p.b) {
          stand();
          if (state === 'win') api.emit('win');
          else if (state === 'lose') api.emit('lose');
        }
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#006400'; ctx.fillRect(0, 0, W, H);
        // Dealer
        ctx.fillStyle = '#fff'; ctx.font = '16px VT323'; ctx.textAlign = 'left';
        ctx.fillText('DEALER', 10, 30);
        dealer.forEach((c, i) => {
          ctx.fillStyle = '#fff';
          ctx.fillRect(20 + i * 60, 40, 50, 70);
          ctx.fillStyle = '#000'; ctx.font = '16px VT323';
          ctx.fillText(cardStr(c), 28 + i * 60, 60);
        });
        ctx.fillStyle = '#ffff00';
        ctx.fillText(state !== 'play' ? String(val(dealer)) : '?', 250, 25);
        // Player
        ctx.fillStyle = '#fff';
        ctx.fillText('PLAYER', 10, 200);
        player.forEach((c, i) => {
          ctx.fillStyle = '#fff';
          ctx.fillRect(20 + i * 60, 210, 50, 70);
          ctx.fillStyle = '#000'; ctx.font = '16px VT323';
          ctx.fillText(cardStr(c), 28 + i * 60, 230);
        });
        ctx.fillStyle = '#00ff00';
        ctx.fillText(String(val(player)), 250, 195);
        // Buttons
        ctx.fillStyle = '#ff0066'; ctx.fillRect(20, 320, 100, 60);
        ctx.fillStyle = '#0000ff'; ctx.fillRect(140, 320, 100, 60);
        ctx.fillStyle = '#fff'; ctx.font = '20px VT323'; ctx.textAlign = 'center';
        ctx.fillText('HIT', 70, 355);
        ctx.fillText('STAND', 190, 355);
        if (state !== 'play') {
          ctx.fillStyle = '#ffff00'; ctx.font = '24px VT323'; ctx.textAlign = 'center';
          ctx.fillText(state.toUpperCase(), W / 2, 420);
          ctx.fillStyle = '#fff'; ctx.font = '14px VT323';
          ctx.fillText('BTN.start to retry', W / 2, 450);
        }
      },
      serialize() {
        return { player: player.slice(), dealer: dealer.slice(), state };
      },
    };
  },
};
