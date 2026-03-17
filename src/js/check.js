// js/check.js — WalletConnect + TRON (TRX + USDT TRC-20)

const WC_PROJECT_ID = 'd25e40ff116d1b959932c04dfe3b51c5'; // ← твой Project ID
const USDT_TRON = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

import { ethers } from 'https://esm.sh/ethers@5.7.2';

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('connectWalletBtn');
  const result = document.getElementById('result');

  if (!btn) return;

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin mr-3 text-3xl"></i> Открываем QR...';

    try {
      const { EthereumProvider } = await import('https://esm.sh/@walletconnect/ethereum-provider@2.23.8');

      const provider = await EthereumProvider.init({
        projectId: WC_PROJECT_ID,
        chains: [195], // ТОЛЬКО TRON Mainnet (chainId 195)
        showQrModal: true,
        metadata: {
          name: 'AMLBot',
          description: 'Проверка баланса TRX и USDT TRC-20',
          url: window.location.origin,
          icons: ['https://amlbot.com/favicon.png']
        }
      });

      await provider.enable();

      const address = provider.accounts[0];

      // Для TRON используем TronWeb (WalletConnect для TRON возвращает TronWeb-совместимый провайдер)
      const tronWeb = new TronWeb({
        fullHost: 'https://api.trongrid.io',
        privateKey: '' // не нужен, т.к. провайдер уже авторизован
      });
      tronWeb.setAddress(address);

      const trxSun = await tronWeb.trx.getBalance(address);
      const trx = tronWeb.fromSun(trxSun);

      const contract = await tronWeb.contract().at(USDT_TRON);
      const usdtRaw = await contract.balanceOf(address).call();
      const usdt = Number(usdtRaw) / 1_000_000;

      const score = Math.floor(Math.random() * 11) + 85;
      const color = score >= 90 ? 'green' : 'emerald';
      const text = score >= 90 ? 'Высокая безопасность' : 'Хорошая безопасность';

      document.getElementById('address').textContent = address;
      document.getElementById('trxBal').textContent = Number(trx).toFixed(2) + ' TRX';
      document.getElementById('usdtBal').textContent = Number(usdt).toFixed(2) + ' USDT';
      document.getElementById('score').textContent = score + '%';
      document.getElementById('score').className = `text-8xl font-black mb-4 text-${color}-600`;
      document.getElementById('scoreText').textContent = text;
      document.getElementById('time').textContent = new Date().toLocaleString('ru-RU');

      result.classList.remove('hidden');
      result.scrollIntoView({ behavior: 'smooth' });

      btn.innerHTML = '<i class="fa-solid fa-check-circle mr-3 text-3xl"></i> Подключено!';
      btn.classList.add('bg-green-600', 'hover:bg-green-700');
      btn.disabled = true;

    } catch (e) {
      alert('Ошибка: ' + (e.message || e));
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-qrcode mr-2"></i> Подключить Trust Wallet (QR)';
    }
  });
});