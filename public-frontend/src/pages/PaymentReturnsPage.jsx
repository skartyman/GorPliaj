import { Link } from 'react-router-dom';
import { useLocale } from '../state/locale';
import { useMeta } from '../hooks/useMeta';

const content = {
  ua: {
    title: 'Умови оплати і повернення',
    description: 'Правила оплати, передоплати, скасування та повернення коштів ГорПляж.',
    updated: 'Останнє оновлення: 20 липня 2026',
    intro: 'Ці умови застосовуються до бронювань, депозитів, квитків, передзамовлень та інших сервісів ГорПляж, що оформлюються через сайт або офіційні канали закладу.',
    note: 'Перед оформленням бронювання або оплати також ознайомтеся з правилами перебування на території комплексу.',
    noteLink: 'Відкрити правила перебування',
    noteHref: '/rules',
    sections: [
      { title: '1. Попередня оплата', body: 'Для денних пляжних послуг бронювання здійснюється за умови 100% передоплати, якщо інше прямо не погоджено з адміністрацією. Для інших сервісів порядок оплати може визначатися окремими умовами. Тариф застосовується відповідно до умов, чинних на дату бронювання.' },
      { title: '2. Що саме оплачується', body: 'Вхід на пляж є вільним і безоплатним. Оплата через сайт або інші офіційні канали може стосуватися сервісних послуг, депозитів, вхідних квитків на платні дні подій, передзамовлень, поповнення балансу мушель або інших платних опцій закладу. Склад і повна вартість замовлення відображаються до підтвердження оплати.' },
      { title: '2.1. Квиток на подію та бронювання столу', body: 'Вхідний квиток на платний день події і бронювання столу є окремими послугами. Квиток не включає столик, а бронювання столу не включає вхідні квитки. Під час бронювання потрібно вказати загальну кількість гостей за столом. Недостатні вхідні квитки можна придбати окремо заздалегідь або при вході в день події за наявності та за чинним тарифом.' },
      { title: '3. Підтвердження оплати', body: 'Після успішної оплати гість отримує підтвердження на сайті та електронною поштою або іншим погодженим способом. Для квитків і бронювань можуть надаватися окремі QR-коди та PDF-документи. Інформація також може відображатися в кабінеті гостя. За потреби адміністрація може запросити дані платежу для перевірки статусу.' },
      { title: '3.1. Мушлі та поповнення балансу', body: 'Мушлі є внутрішніми обліковими одиницями програми лояльності та відображаються в кабінеті гостя. Вони не є банківським рахунком, електронними грошима чи самостійним платіжним засобом поза сервісами закладу. Умови нарахування, використання та доступні способи поповнення показуються на сайті. У разі помилкового або подвійного списання гість може звернутися до адміністрації для перевірки та повернення коштів відповідно до закону й обставин платежу.' },
      { title: '4. Строк дії бронювання', body: 'Для денних пляжних послуг оплачене бронювання є дійсним до 13:00 відповідного дня, якщо інше не зазначено окремо. У разі неявки гостя до 13:00 адміністрація має право скасувати бронювання, а 50% суми передоплати утримується як компенсація за резервування місця.' },
      { title: '5. Надання послуги', body: 'Послуга вважається наданою з моменту передачі гостю у користування відповідного місця, інвентарю або підтвердження доступу до оплаченої опції. Послуга вважається виконаною незалежно від фактичного часу використання гостем.' },
      { title: '6. Скасування та повернення коштів', body: 'Можливість скасування і повернення залежить від виду послуги, часу звернення, умов конкретної події та фактично понесених закладом витрат. Кошти за належно надані або вже використані послуги не повертаються, крім випадків, передбачених законодавством України. Якщо подію скасовано або послуга не може бути надана з вини закладу, гість має право звернутися щодо повернення коштів чи іншого погодженого варіанта. Повернення також розглядається у разі підтвердженої технічної помилки або подвійного списання.' },
      { title: '7. Обставини поза контролем закладу', body: 'Адміністрація не несе відповідальності за обставини непереборної сили та інші фактори, що не залежать від закладу, зокрема погіршення погодних умов, дії третіх осіб або рішення органів влади. Такі обставини самі по собі не означають автоматичного повернення коштів.' },
      { title: '8. Сервісний збір', body: 'До рахунку за замовлення по меню в закладі додається 10% за обслуговування гостя, якщо інше прямо не зазначено окремо. Такий збір не є частиною загального правила для всіх бронювань і застосовується саме до рахунку за меню.' },
      { title: '9. Як подати запит', body: 'Для уточнення платежу або розгляду питання щодо повернення зверніться до адміністрації та вкажіть імʼя, номер телефону, дату бронювання або замовлення, суму платежу та причину звернення.' }
    ]
  },
  ru: {
    title: 'Условия оплаты и возврата',
    description: 'Правила оплаты, предоплаты, отмены и возврата средств ГорПляж.',
    updated: 'Последнее обновление: 20 июля 2026',
    intro: 'Эти условия применяются к бронированиям, депозитам, билетам, предзаказам и другим сервисам ГорПляж, оформляемым через сайт или официальные каналы заведения.',
    note: 'Перед оформлением бронирования или оплаты также ознакомьтесь с правилами пребывания на территории комплекса.',
    noteLink: 'Открыть правила пребывания',
    noteHref: '/rules',
    sections: [
      { title: '1. Предварительная оплата', body: 'Для дневных пляжных услуг бронирование осуществляется при условии 100% предоплаты, если иное прямо не согласовано с администрацией. Для других сервисов порядок оплаты может определяться отдельными условиями. Тариф применяется в соответствии с условиями, действующими на дату бронирования.' },
      { title: '2. Что именно оплачивается', body: 'Вход на пляж является свободным и бесплатным. Оплата через сайт или иные официальные каналы может касаться сервисных услуг, депозитов, входных билетов на платные дни мероприятий, предзаказов, пополнения баланса ракушек или других платных опций заведения. Состав и полная стоимость заказа отображаются до подтверждения оплаты.' },
      { title: '2.1. Билет на мероприятие и бронирование стола', body: 'Входной билет на платный день мероприятия и бронирование стола являются отдельными услугами. Билет не включает стол, а бронирование стола не включает входные билеты. При бронировании нужно указать общее количество гостей за столом. Недостающие входные билеты можно купить отдельно заранее или при входе в день мероприятия при наличии и по действующему тарифу.' },
      { title: '3. Подтверждение оплаты', body: 'После успешной оплаты гость получает подтверждение на сайте и по электронной почте либо иным согласованным способом. Для билетов и бронирований могут предоставляться отдельные QR-коды и PDF-документы. Информация также может отображаться в кабинете гостя. При необходимости администрация может запросить данные платежа для проверки статуса.' },
      { title: '3.1. Ракушки и пополнение баланса', body: 'Ракушки являются внутренними учетными единицами программы лояльности и отображаются в кабинете гостя. Они не являются банковским счетом, электронными деньгами или самостоятельным платежным средством вне сервисов заведения. Условия начисления, использования и доступные способы пополнения показываются на сайте. При ошибочном или двойном списании гость может обратиться к администрации для проверки и возврата средств в соответствии с законом и обстоятельствами платежа.' },
      { title: '4. Срок действия бронирования', body: 'Для дневных пляжных услуг оплаченное бронирование действительно до 13:00 соответствующего дня, если иное не указано отдельно. В случае неявки гостя до 13:00 администрация вправе отменить бронирование, а 50% суммы предоплаты удерживается как компенсация за резервирование места.' },
      { title: '5. Оказание услуги', body: 'Услуга считается оказанной с момента передачи гостю соответствующего места, инвентаря или подтверждения доступа к оплаченной опции. Услуга считается исполненной независимо от фактического времени использования гостем.' },
      { title: '6. Отмена и возврат средств', body: 'Возможность отмены и возврата зависит от вида услуги, времени обращения, условий конкретного мероприятия и фактически понесенных заведением расходов. Средства за надлежащим образом оказанные или уже использованные услуги не возвращаются, кроме случаев, предусмотренных законодательством Украины. Если мероприятие отменено или услуга не может быть оказана по вине заведения, гость вправе обратиться за возвратом средств или другим согласованным вариантом. Возврат также рассматривается при подтвержденной технической ошибке или двойном списании.' },
      { title: '7. Обстоятельства вне контроля заведения', body: 'Администрация не несет ответственности за обстоятельства непреодолимой силы и иные факторы, не зависящие от заведения, включая ухудшение погодных условий, действия третьих лиц или решения органов власти. Такие обстоятельства сами по себе не означают автоматический возврат средств.' },
      { title: '8. Сервисный сбор', body: 'К счету за заказ по меню в заведении добавляется 10% за обслуживание гостя, если иное прямо не указано отдельно. Такой сбор не является общим правилом для всех бронирований и относится именно к счету за меню.' },
      { title: '9. Как подать запрос', body: 'Для уточнения платежа или рассмотрения вопроса о возврате обратитесь к администрации и укажите имя, номер телефона, дату бронирования или заказа, сумму платежа и причину обращения.' }
    ]
  },
  en: {
    title: 'Payment and Refund Terms',
    description: 'Rules for payment, prepayment, cancellations, and refunds at GorPliaj.',
    updated: 'Last updated: July 20, 2026',
    intro: 'These terms apply to bookings, deposits, tickets, pre-orders, and other GorPliaj services arranged through the website or the venue’s official channels.',
    note: 'Please also review the venue rules before placing a booking or making a payment.',
    noteLink: 'Open venue rules',
    noteHref: '/rules',
    sections: [
      { title: '1. Prepayment', body: 'For daytime beach services, bookings require 100% prepayment unless otherwise explicitly agreed with the venue administration. Other services may follow separate payment terms. The applicable rate is the one in effect on the booking date.' },
      { title: '2. What is being paid for', body: 'Entrance to the beach is free. Payments made through the website or official channels may cover paid services, deposits, entry tickets for paid event days, pre-orders, shell balance top-ups, or other paid venue options. The contents and full price of the order are shown before payment is confirmed.' },
      { title: '2.1. Event tickets and table bookings', body: 'An entry ticket for a paid event day and a table booking are separate services. A ticket does not include a table, and a table booking does not include entry tickets. The booking must state the total number of guests at the table. Missing entry tickets may be purchased separately in advance or at the entrance on the event day, subject to availability and the current price.' },
      { title: '3. Payment confirmation', body: 'After successful payment, the guest receives confirmation on the website and by email or another agreed method. Tickets and table bookings may have separate QR codes and PDF documents. The information may also appear in the guest account. The venue may request payment details if additional verification is needed.' },
      { title: '3.1. Shells and balance top-ups', body: 'Shells are internal loyalty-program accounting units displayed in the guest account. They are not a bank account, electronic money, or an independent means of payment outside the venue services. Accrual, use, and available top-up terms are shown on the website. In the event of an erroneous or duplicate charge, the guest may contact the venue for review and a refund according to law and the payment circumstances.' },
      { title: '4. Booking validity period', body: 'For daytime beach services, a paid booking remains valid until 1:00 PM on the relevant day unless stated otherwise. If the guest does not arrive by 1:00 PM, the venue may cancel the booking and retain 50% of the prepayment as compensation for holding the place.' },
      { title: '5. When a service is considered provided', body: 'A service is considered provided once the guest receives access to the relevant place, inventory, or paid option. The service is considered completed regardless of how much time the guest actually uses it.' },
      { title: '6. Cancellations and refunds', body: 'Cancellation and refund eligibility depends on the service type, time of the request, the terms of the particular event, and costs actually incurred by the venue. Payments for properly delivered or already used services are non-refundable except where required by Ukrainian law. If an event is cancelled or the venue cannot provide the service due to its own fault, the guest may request a refund or another agreed option. Refunds are also reviewed for confirmed technical errors or duplicate charges.' },
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
