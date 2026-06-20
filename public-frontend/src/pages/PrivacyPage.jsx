import { Link } from 'react-router-dom';
import { useLocale } from '../state/locale';
import { useMeta } from '../hooks/useMeta';

const content = {
  ua: {
    title: 'Політика конфіденційності',
    description: 'Політика конфіденційності ГорПляж щодо збору, використання, зберігання та захисту персональних даних.',
    updated: 'Останнє оновлення: 20 червня 2026',
    intro: 'Ця політика пояснює, які персональні та технічні дані ГорПляж може обробляти під час бронювання, оплати, купівлі квитків, звернення до адміністрації та користування сайтом.',
    note: 'Окремі умови надання послуг, передоплати, скасування, перебування на території комплексу та сервісного збору описані у правилах перебування та в умовах оплати і повернення.',
    noteLink: 'Правила перебування',
    noteHref: '/rules',
    sections: [
      { title: '1. Які дані ми можемо збирати', body: 'Ми можемо обробляти імʼя, номер телефону, email, дату і час бронювання, кількість гостей, обрану позицію або подію, коментар до замовлення, суму та статус оплати, технічні дані пристрою, IP-адресу, cookies, а також зміст звернень до адміністрації.' },
      { title: '2. Для чого ми використовуємо дані', body: 'Дані використовуються для створення й супроводу бронювань, підтвердження платежів, надсилання квитків і документів, звʼязку з гостем, захисту від помилкових або дубльованих операцій, ведення внутрішнього обліку та виконання вимог законодавства.' },
      { title: '3. Дані про оплату', body: 'Платежі можуть оброблятися сторонніми платіжними провайдерами. Ми не зберігаємо повні реквізити банківських карток на сайті, але можемо зберігати суму, валюту, статус, ідентифікатор транзакції, дату платежу та повʼязані з ним дані бронювання або замовлення.' },
      { title: '4. Дані про погодження з правилами', body: 'Під час бронювання ми можемо фіксувати факт погодження гостя з правилами перебування, умовами оплати і повернення та політикою конфіденційності. Це потрібно для належного оформлення замовлення і підтвердження прийняття умов сервісу.' },
      { title: '5. Передача третім сторонам', body: 'Ми можемо передавати дані платіжним провайдерам, сервісам email-розсилок, месенджерам, хостинговим і технічним сервісам лише в обсязі, необхідному для роботи сайту, бронювання, оплати, доставки квитків і підтримки гостей.' },
      { title: '6. Cookies і технічні дані', body: 'Сайт може використовувати cookies та локальне сховище для збереження мови, сеансу, кошика, статусу бронювання та базової аналітики. Обмеження cookies у браузері може вплинути на коректну роботу окремих функцій.' },
      { title: '7. Строк зберігання', body: 'Ми зберігаємо дані не довше, ніж це потрібно для надання послуг, розгляду звернень, бухгалтерського обліку, виконання договірних та законодавчих обовʼязків, а також захисту наших законних інтересів у спірних ситуаціях.' },
      { title: '8. Захист даних', body: 'Ми застосовуємо організаційні та технічні заходи для захисту інформації від втрати, несанкціонованого доступу, зміни або розголошення. Водночас жоден спосіб передачі даних через інтернет не гарантує абсолютної безпеки.' },
      { title: '9. Ваші права', body: 'Ви можете звернутися до адміністрації, щоб уточнити, виправити або видалити персональні дані, відкликати згоду, обмежити окремі види обробки або отримати додаткову інформацію, якщо це не суперечить обовʼязкам закладу за законом.' },
      { title: '10. Зміни політики', body: 'Ми можемо оновлювати цю політику у разі зміни сервісів, правил бронювання, способів оплати або законодавчих вимог. Актуальна редакція завжди публікується на цій сторінці з датою останнього оновлення.' }
    ]
  },
  ru: {
    title: 'Политика конфиденциальности',
    description: 'Политика конфиденциальности ГорПляж о сборе, использовании, хранении и защите персональных данных.',
    updated: 'Последнее обновление: 20 июня 2026',
    intro: 'Эта политика объясняет, какие персональные и технические данные ГорПляж может обрабатывать при бронировании, оплате, покупке билетов, обращении к администрации и использовании сайта.',
    note: 'Отдельные условия оказания услуг, предоплаты, отмены, пребывания на территории комплекса и сервисного сбора описаны в правилах пребывания и в условиях оплаты и возврата.',
    noteLink: 'Правила пребывания',
    noteHref: '/rules',
    sections: [
      { title: '1. Какие данные мы можем собирать', body: 'Мы можем обрабатывать имя, номер телефона, email, дату и время бронирования, количество гостей, выбранную позицию или событие, комментарий к заказу, сумму и статус оплаты, технические данные устройства, IP-адрес, cookies, а также содержание обращений к администрации.' },
      { title: '2. Для чего мы используем данные', body: 'Данные используются для создания и сопровождения бронирований, подтверждения платежей, отправки билетов и документов, связи с гостем, защиты от ошибочных или дублирующих операций, внутреннего учета и выполнения требований законодательства.' },
      { title: '3. Данные об оплате', body: 'Платежи могут обрабатываться сторонними платежными провайдерами. Мы не храним полные реквизиты банковских карт на сайте, но можем хранить сумму, валюту, статус, идентификатор транзакции, дату платежа и связанные с ним данные бронирования или заказа.' },
      { title: '4. Данные о согласии с правилами', body: 'При бронировании мы можем фиксировать факт согласия гостя с правилами пребывания, условиями оплаты и возврата и политикой конфиденциальности. Это нужно для корректного оформления заказа и подтверждения принятия условий сервиса.' },
      { title: '5. Передача третьим сторонам', body: 'Мы можем передавать данные платежным провайдерам, сервисам email-рассылок, мессенджерам, хостинговым и техническим сервисам только в объеме, необходимом для работы сайта, бронирования, оплаты, доставки билетов и поддержки гостей.' },
      { title: '6. Cookies и технические данные', body: 'Сайт может использовать cookies и локальное хранилище для сохранения языка, сессии, корзины, статуса бронирования и базовой аналитики. Ограничение cookies в браузере может повлиять на корректную работу отдельных функций.' },
      { title: '7. Срок хранения', body: 'Мы храним данные не дольше, чем это необходимо для оказания услуг, рассмотрения обращений, бухгалтерского учета, выполнения договорных и законодательных обязанностей, а также защиты наших законных интересов в спорных ситуациях.' },
      { title: '8. Защита данных', body: 'Мы применяем организационные и технические меры для защиты информации от потери, несанкционированного доступа, изменения или раскрытия. При этом ни один способ передачи данных через интернет не гарантирует абсолютную безопасность.' },
      { title: '9. Ваши права', body: 'Вы можете обратиться к администрации, чтобы уточнить, исправить или удалить персональные данные, отозвать согласие, ограничить отдельные виды обработки или получить дополнительную информацию, если это не противоречит обязанностям заведения по закону.' },
      { title: '10. Изменения политики', body: 'Мы можем обновлять эту политику при изменении сервисов, правил бронирования, способов оплаты или требований законодательства. Актуальная редакция всегда публикуется на этой странице с датой последнего обновления.' }
    ]
  },
  en: {
    title: 'Privacy Policy',
    description: 'GorPliaj privacy policy on collecting, using, storing, and protecting personal data.',
    updated: 'Last updated: June 20, 2026',
    intro: 'This policy explains what personal and technical data GorPliaj may process when you book services, make payments, buy tickets, contact the venue, or use the website.',
    note: 'Separate conditions for service delivery, prepayment, cancellations, venue access, and the service charge are described in the venue rules and the payment and refund terms.',
    noteLink: 'Venue rules',
    noteHref: '/rules',
    sections: [
      { title: '1. Data we may collect', body: 'We may process your name, phone number, email, booking date and time, number of guests, selected position or event, order comments, payment amount and status, device technical data, IP address, cookies, and messages sent to the venue administration.' },
      { title: '2. Why we use data', body: 'Data is used to create and manage bookings, confirm payments, send tickets and documents, contact guests, protect against mistaken or duplicate transactions, keep internal records, and comply with legal obligations.' },
      { title: '3. Payment data', body: 'Payments may be processed by third-party payment providers. We do not store full bank card details on the website, but we may store the payment amount, currency, status, transaction identifier, payment date, and related booking or order details.' },
      { title: '4. Consent records', body: 'When a guest places a booking, we may record their acceptance of the venue rules, payment and refund terms, and privacy policy. This helps us properly process the order and confirm acceptance of the service terms.' },
      { title: '5. Sharing with third parties', body: 'We may share data with payment providers, email services, messengers, hosting providers, and technical vendors only to the extent needed to operate the website, process bookings, receive payments, deliver tickets, and support guests.' },
      { title: '6. Cookies and technical data', body: 'The website may use cookies and local storage to save language preferences, session data, cart details, booking status, and basic analytics. Restricting cookies in your browser may affect some website functions.' },
      { title: '7. Retention period', body: 'We keep data no longer than necessary to provide services, review requests, maintain accounting records, meet contractual and legal duties, and protect our legitimate interests in case of disputes.' },
      { title: '8. Data protection', body: 'We apply organizational and technical safeguards to protect information from loss, unauthorized access, alteration, or disclosure. However, no method of internet transmission can be guaranteed to be absolutely secure.' },
      { title: '9. Your rights', body: 'You may contact the venue administration to clarify, correct, or delete personal data, withdraw consent, limit certain processing, or request more information where this does not conflict with the venue’s legal obligations.' },
      { title: '10. Policy changes', body: 'We may update this policy if services, booking rules, payment methods, or legal requirements change. The current version is always published on this page with the latest update date.' }
    ]
  }
};

export default function PrivacyPage() {
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
