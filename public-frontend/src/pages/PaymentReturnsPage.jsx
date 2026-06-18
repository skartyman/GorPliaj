import { useLocale } from '../state/locale';
import { useMeta } from '../hooks/useMeta';

const content = {
  ua: {
    title: 'Умови оплати і повернення',
    description: 'Правила оплати, підтвердження замовлень, скасування та повернення коштів ГорПляж.',
    updated: 'Останнє оновлення: 17 червня 2026',
    sections: [
      {
        title: '1. Загальні положення',
        body: 'Ці умови регулюють оплату бронювань, квитків, депозитів, передзамовлень та інших послуг, що оформлюються через сайт або офіційні канали ГорПляж. Оформлюючи оплату, гість підтверджує, що ознайомився з цими умовами.'
      },
      {
        title: '2. Способи оплати',
        body: 'Оплата може здійснюватися банківською карткою, через платіжні сервіси, безготівковим переказом або іншим способом, доступним під час оформлення. Доступні способи оплати можуть залежати від типу послуги та технічних налаштувань платіжного провайдера.'
      },
      {
        title: '3. Підтвердження оплати',
        body: 'Після успішної оплати гість отримує підтвердження на сайті, електронною поштою, у месенджері або іншим погодженим способом. Якщо підтвердження не надійшло, зверніться до адміністрації та надайте дату, суму платежу і контактні дані.'
      },
      {
        title: '4. Скасування бронювання',
        body: 'Умови скасування залежать від типу бронювання, події або спеціальної пропозиції. Якщо окремі правила не вказані під час оформлення, гість може звернутися до адміністрації для скасування або перенесення бронювання до початку надання послуги.'
      },
      {
        title: '5. Повернення коштів',
        body: 'Повернення можливе у випадках скасування послуги закладом, технічної помилки оплати, подвійного списання або іншої підтвердженої підстави. Повернення здійснюється на той самий платіжний засіб, з якого була проведена оплата, якщо інше не погоджено сторонами.'
      },
      {
        title: '6. Строки повернення',
        body: 'Запит на повернення розглядається у розумний строк після отримання необхідних даних. Фактичне зарахування коштів залежить від банку або платіжної системи та зазвичай може тривати кілька банківських днів.'
      },
      {
        title: '7. Неповернювані платежі',
        body: 'Платежі можуть бути неповернюваними, якщо це прямо зазначено в умовах конкретної події, депозиту, акції або індивідуальної пропозиції. Також повернення може бути відхилене, якщо послуга вже була надана або гість не скористався бронюванням без своєчасного повідомлення.'
      },
      {
        title: '8. Як подати запит',
        body: 'Для повернення або уточнення платежу звʼяжіться з адміністрацією за контактами, вказаними на сайті. У зверненні вкажіть імʼя, номер телефону, дату замовлення або бронювання, суму платежу та причину звернення.'
      }
    ]
  },
  ru: {
    title: 'Условия оплаты и возврата',
    description: 'Правила оплаты, подтверждения заказов, отмены и возврата средств ГорПляж.',
    updated: 'Последнее обновление: 17 июня 2026',
    sections: [
      {
        title: '1. Общие положения',
        body: 'Эти условия регулируют оплату бронирований, билетов, депозитов, предзаказов и других услуг, оформляемых через сайт или официальные каналы ГорПляж. Выполняя оплату, гость подтверждает, что ознакомился с этими условиями.'
      },
      {
        title: '2. Способы оплаты',
        body: 'Оплата может выполняться банковской картой, через платежные сервисы, безналичным переводом или другим способом, доступным при оформлении. Доступные способы оплаты могут зависеть от типа услуги и технических настроек платежного провайдера.'
      },
      {
        title: '3. Подтверждение оплаты',
        body: 'После успешной оплаты гость получает подтверждение на сайте, по электронной почте, в мессенджере или другим согласованным способом. Если подтверждение не пришло, обратитесь к администрации и укажите дату, сумму платежа и контактные данные.'
      },
      {
        title: '4. Отмена бронирования',
        body: 'Условия отмены зависят от типа бронирования, события или специального предложения. Если отдельные правила не указаны при оформлении, гость может обратиться к администрации для отмены или переноса бронирования до начала оказания услуги.'
      },
      {
        title: '5. Возврат средств',
        body: 'Возврат возможен при отмене услуги заведением, технической ошибке оплаты, двойном списании или другом подтвержденном основании. Возврат выполняется на то же платежное средство, с которого была проведена оплата, если иное не согласовано сторонами.'
      },
      {
        title: '6. Сроки возврата',
        body: 'Запрос на возврат рассматривается в разумный срок после получения необходимых данных. Фактическое зачисление средств зависит от банка или платежной системы и обычно может занимать несколько банковских дней.'
      },
      {
        title: '7. Невозвратные платежи',
        body: 'Платежи могут быть невозвратными, если это прямо указано в условиях конкретного события, депозита, акции или индивидуального предложения. Возврат также может быть отклонен, если услуга уже оказана или гость не воспользовался бронированием без своевременного уведомления.'
      },
      {
        title: '8. Как подать запрос',
        body: 'Для возврата или уточнения платежа свяжитесь с администрацией по контактам, указанным на сайте. В обращении укажите имя, номер телефона, дату заказа или бронирования, сумму платежа и причину обращения.'
      }
    ]
  },
  en: {
    title: 'Payment and Refund Terms',
    description: 'Rules for payment, order confirmation, cancellation and refunds at GorPliaj.',
    updated: 'Last updated: June 17, 2026',
    sections: [
      {
        title: '1. General Terms',
        body: 'These terms govern payments for bookings, tickets, deposits, pre-orders and other services made through the website or official GorPliaj channels. By making a payment, the guest confirms that they have read these terms.'
      },
      {
        title: '2. Payment Methods',
        body: 'Payment may be made by bank card, payment services, bank transfer or another method available during checkout. Available payment methods may depend on the service type and payment provider settings.'
      },
      {
        title: '3. Payment Confirmation',
        body: 'After a successful payment, the guest receives confirmation on the website, by email, in a messenger or by another agreed method. If confirmation is not received, contact the administration and provide the payment date, amount and contact details.'
      },
      {
        title: '4. Booking Cancellation',
        body: 'Cancellation terms depend on the booking type, event or special offer. If separate rules are not shown during checkout, the guest may contact the administration to cancel or reschedule the booking before the service begins.'
      },
      {
        title: '5. Refunds',
        body: 'Refunds may be provided if the venue cancels a service, a payment error occurs, a duplicate charge is confirmed or another valid reason is verified. Refunds are made to the same payment method used for the original payment unless otherwise agreed.'
      },
      {
        title: '6. Refund Timing',
        body: 'Refund requests are reviewed within a reasonable time after the required information is received. Actual crediting of funds depends on the bank or payment system and may usually take several banking days.'
      },
      {
        title: '7. Non-Refundable Payments',
        body: 'Payments may be non-refundable where this is clearly stated in the terms of a specific event, deposit, promotion or individual offer. A refund may also be declined if the service has already been provided or the guest did not use the booking without timely notice.'
      },
      {
        title: '8. How to Submit a Request',
        body: 'To request a refund or clarify a payment, contact the administration using the contact details on the website. Include your name, phone number, order or booking date, payment amount and reason for the request.'
      }
    ]
  }
};

export default function PaymentReturnsPage() {
  const { locale } = useLocale();
  const copy = content[locale] || content.ua;

  useMeta(copy.title, copy.description);

  return (
    <div className="content-page legal-page">
      <section className="content-section">
        <h1>{copy.title}</h1>
        <p className="muted">{copy.updated}</p>

        <div className="legal-sections">
          {copy.sections.map((section) => (
            <article className="legal-section" key={section.title}>
              <h3>{section.title}</h3>
              <p>{section.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
