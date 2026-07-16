import { useMemo } from 'react';

function formatAmount(amount, currency, locale) {
  const value = Number(amount || 0);
  const language = locale === 'en' ? 'en-US' : (locale === 'ru' ? 'ru-RU' : 'uk-UA');
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency: currency || 'UAH',
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2
  }).format(value);
}

export default function PaymentChoice({ paymentUrl, amount, currency = 'UAH', locale = 'ua', description = '' }) {
  const copy = useMemo(() => ({
    ua: {
      eyebrow: 'Захищена оплата HUTKO',
      title: 'Оберіть спосіб оплати',
      amount: 'До сплати',
      methods: 'Спосіб оплати',
      card: 'Банківська картка',
      cardHint: 'Visa або Mastercard',
      wallet: 'Google Pay / Apple Pay',
      walletHint: 'Доступний гаманець визначиться на вашому пристрої',
      note: 'Платіжні дані вводяться на захищеній стороні HUTKO. Ми не отримуємо і не зберігаємо дані картки.'
    },
    ru: {
      eyebrow: 'Защищённая оплата HUTKO',
      title: 'Выберите способ оплаты',
      amount: 'К оплате',
      methods: 'Способ оплаты',
      card: 'Банковская карта',
      cardHint: 'Visa или Mastercard',
      wallet: 'Google Pay / Apple Pay',
      walletHint: 'Доступный кошелёк определится на вашем устройстве',
      note: 'Платёжные данные вводятся на защищённой стороне HUTKO. Мы не получаем и не храним данные карты.'
    },
    en: {
      eyebrow: 'Secure HUTKO payment',
      title: 'Choose a payment method',
      amount: 'Amount due',
      methods: 'Payment method',
      card: 'Bank card',
      cardHint: 'Visa or Mastercard',
      wallet: 'Google Pay / Apple Pay',
      walletHint: 'The available wallet will be detected on your device',
      note: 'Payment details are entered securely on HUTKO. We never receive or store your card details.'
    }
  }), []);
  const text = copy[locale] || copy.ua;

  return (
    <section className="payment-choice" aria-labelledby="payment-choice-title">
      <header className="payment-choice-header">
        <span className="payment-choice-lock" aria-hidden="true">✓</span>
        <div>
          <span>{text.eyebrow}</span>
          <h3 id="payment-choice-title">{text.title}</h3>
        </div>
      </header>

      {description ? <p className="payment-choice-description">{description}</p> : null}

      <div className="payment-choice-body">
        <div className="payment-choice-total">
          <span>{text.amount}</span>
          <strong>{formatAmount(amount, currency, locale)}</strong>
        </div>

        <div className="payment-choice-methods">
          <span className="payment-choice-label">{text.methods}</span>
          <a className="payment-method payment-method-card" href={paymentUrl}>
            <span className="payment-method-copy">
              <strong>{text.card}</strong>
              <small>{text.cardHint}</small>
            </span>
            <span className="payment-card-brands" aria-hidden="true">
              <b>VISA</b>
              <b>MC</b>
            </span>
          </a>
          <a className="payment-method payment-method-wallet" href={paymentUrl}>
            <span className="payment-wallet-mark" aria-hidden="true">G</span>
            <span className="payment-method-copy">
              <strong>{text.wallet}</strong>
              <small>{text.walletHint}</small>
            </span>
            <span className="payment-method-arrow" aria-hidden="true">›</span>
          </a>
        </div>
      </div>

      <p className="payment-choice-note">
        <span aria-hidden="true">i</span>
        {text.note}
      </p>
    </section>
  );
}
