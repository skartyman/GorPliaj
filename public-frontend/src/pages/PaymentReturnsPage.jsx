import { Link } from 'react-router-dom';
import { useLocale } from '../state/locale';
import { useMeta } from '../hooks/useMeta';

const content = {
  ua: {
    title: 'Умови оплати і повернення',
    description: 'Правила оплати, передоплати, скасування та повернення коштів ГорПляж.',
    updated: 'Останнє оновлення: 20 червня 2026',
    intro: 'Ці умови застосовуються до бронювань, депозитів, квитків, передзамовлень та інших сервісів ГорПляж, що оформлюються через сайт або офіційні канали закладу.',
    note: 'Перед оформленням бронювання або оплати також ознайомтеся з правилами перебування на території комплексу.',
    noteLink: 'Відкрити правила перебування',
    noteHref: '/rules',
    sections: [
      { title: '1. Попередня оплата', body: 'Бронювання сервісних послуг здійснюється за умови 100% передоплати, якщо інше прямо не погоджено з адміністрацією. Тариф застосовується відповідно до умов, чинних на дату бронювання.' },
      { title: '2. Що саме оплачується', body: 'Вхід на пляж є вільним і безоплатним. Оплата через сайт або інші офіційні канали може стосуватися лише сервісних послуг, депозитів, квитків, передзамовлень або інших платних опцій закладу.' },
      { title: '3. Підтвердження оплати', body: 'Після успішної оплати гість отримує підтвердження на сайті, електронною поштою, у месенджері або іншим погодженим способом. За потреби адміністрація може запросити дані платежу для перевірки статусу.' },
      { title: '4. Строк дії бронювання', body: 'Оплачене бронювання є дійсним до 13:00 відповідного дня, якщо інше не зазначено окремо. У разі неявки гостя до 13:00 адміністрація має право скасувати бронювання, а 50% суми передоплати утримується як компенсація за резервування місця.' },
      { title: '5. Надання послуги', body: 'Послуга вважається наданою з моменту передачі гостю у користування відповідного місця, інвентарю або підтвердження доступу до оплаченої опції. Послуга вважається виконаною незалежно від фактичного часу використання гостем.' },
      { title: '6. Повернення коштів', body: 'Кошти за належно надані послуги не повертаються, крім випадків, передбачених законодавством України, або коли послуга не може бути надана з вини адміністрації. Повернення також може бути можливим у разі підтвердженої технічної помилки чи подвійного списання.' },
      { title: '7. Обставини поза контролем закладу', body: 'Адміністрація не несе відповідальності за обставини непереборної сили та інші фактори, що не залежать від закладу, зокрема погіршення погодних умов, дії третіх осіб або рішення органів влади. Такі обставини самі по собі не означають автоматичного повернення коштів.' },
      { title: '8. Сервісний збір', body: 'До рахунку за замовлення по меню в закладі додається 10% за обслуговування гостя, якщо інше прямо не зазначено окремо. Такий збір не є частиною загального правила для всіх бронювань і застосовується саме до рахунку за меню.' },
      { title: '9. Як подати запит', body: 'Для уточнення платежу або розгляду питання щодо повернення зверніться до адміністрації та вкажіть імʼя, номер телефону, дату бронювання або замовлення, суму платежу та причину звернення.' }
    ]
  },
  ru: {
    title: 'Условия оплаты и возврата',
    description: 'Правила оплаты, предоплаты, отмены и возврата средств ГорПляж.',
    updated: 'Последнее обновление: 20 июня 2026',
    intro: 'Эти условия применяются к бронированиям, депозитам, билетам, предзаказам и другим сервисам ГорПляж, оформляемым через сайт или официальные каналы заведения.',
    note: 'Перед оформлением бронирования или оплаты также ознакомьтесь с правилами пребывания на территории комплекса.',
    noteLink: 'Открыть правила пребывания',
    noteHref: '/rules',
    sections: [
      { title: '1. Предварительная оплата', body: 'Бронирование сервисных услуг осуществляется при условии 100% предоплаты, если иное прямо не согласовано с администрацией. Тариф применяется в соответствии с условиями, действующими на дату бронирования.' },
      { title: '2. Что именно оплачивается', body: 'Вход на пляж является свободным и бесплатным. Оплата через сайт или иные официальные каналы может касаться только сервисных услуг, депозитов, билетов, предзаказов или других платных опций заведения.' },
      { title: '3. Подтверждение оплаты', body: 'После успешной оплаты гость получает подтверждение на сайте, по электронной почте, в мессенджере или иным согласованным способом. При необходимости администрация может запросить данные платежа для проверки статуса.' },
      { title: '4. Срок действия бронирования', body: 'Оплаченное бронирование действительно до 13:00 соответствующего дня, если иное не указано отдельно. В случае неявки гостя до 13:00 администрация вправе отменить бронирование, а 50% суммы предоплаты удерживается как компенсация за резервирование места.' },
      { title: '5. Оказание услуги', body: 'Услуга считается оказанной с момента передачи гостю соответствующего места, инвентаря или подтверждения доступа к оплаченной опции. Услуга считается исполненной независимо от фактического времени использования гостем.' },
      { title: '6. Возврат средств', body: 'Средства за надлежащим образом оказанные услуги не возвращаются, кроме случаев, предусмотренных законодательством Украины, либо когда услуга не может быть оказана по вине администрации. Возврат также может быть возможен при подтвержденной технической ошибке или двойном списании.' },
      { title: '7. Обстоятельства вне контроля заведения', body: 'Администрация не несет ответственности за обстоятельства непреодолимой силы и иные факторы, не зависящие от заведения, включая ухудшение погодных условий, действия третьих лиц или решения органов власти. Такие обстоятельства сами по себе не означают автоматический возврат средств.' },
      { title: '8. Сервисный сбор', body: 'К счету за заказ по меню в заведении добавляется 10% за обслуживание гостя, если иное прямо не указано отдельно. Такой сбор не является общим правилом для всех бронирований и относится именно к счету за меню.' },
      { title: '9. Как подать запрос', body: 'Для уточнения платежа или рассмотрения вопроса о возврате обратитесь к администрации и укажите имя, номер телефона, дату бронирования или заказа, сумму платежа и причину обращения.' }
    ]
  },
  en: {
    title: 'Payment and Refund Terms',
    description: 'Rules for payment, prepayment, cancellations, and refunds at GorPliaj.',
    updated: 'Last updated: June 20, 2026',
    intro: 'These terms apply to bookings, deposits, tickets, pre-orders, and other GorPliaj services arranged through the website or the venue’s official channels.',
    note: 'Please also review the venue rules before placing a booking or making a payment.',
    noteLink: 'Open venue rules',
    noteHref: '/rules',
    sections: [
      { title: '1. Prepayment', body: 'Bookings for paid services require 100% prepayment unless otherwise explicitly agreed with the venue administration. The applicable rate is the one in effect on the booking date.' },
      { title: '2. What is being paid for', body: 'Entrance to the beach is free. Payments made through the website or official channels apply only to paid services, deposits, tickets, pre-orders, or other paid venue options.' },
      { title: '3. Payment confirmation', body: 'After successful payment, the guest receives confirmation on the website, by email, in a messenger, or by another agreed method. The venue may request payment details if additional verification is needed.' },
      { title: '4. Booking validity period', body: 'A paid booking remains valid until 1:00 PM on the relevant day unless stated otherwise. If the guest does not arrive by 1:00 PM, the venue may cancel the booking and retain 50% of the prepayment as compensation for holding the place.' },
      { title: '5. When a service is considered provided', body: 'A service is considered provided once the guest receives access to the relevant place, inventory, or paid option. The service is considered completed regardless of how much time the guest actually uses it.' },
      { title: '6. Refunds', body: 'Payments for properly delivered services are non-refundable except where required by Ukrainian law or where the venue cannot provide the service due to its own fault. Refunds may also be possible in the event of a confirmed technical payment error or duplicate charge.' },
      { title: '7. Circumstances outside the venue’s control', body: 'The venue is not responsible for force majeure events or other circumstances beyond its control, including worsening weather, actions of third parties, or government decisions. Such circumstances do not automatically create a refund obligation.' },
      { title: '8. Service charge', body: 'A 10% guest service charge is added to on-site menu bills unless clearly stated otherwise. This is not a general rule for every booking and applies specifically to menu orders.' },
      { title: '9. How to submit a request', body: 'To clarify a payment or request a refund review, contact the venue administration and include your name, phone number, booking or order date, payment amount, and the reason for your request.' }
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
        <p>{copy.intro}</p>
        <p className="legal-note">
          {copy.note} <Link to={copy.noteHref}>{copy.noteLink}</Link>
        </p>
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
