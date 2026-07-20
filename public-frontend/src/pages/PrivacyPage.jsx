import { Link } from 'react-router-dom';
import { useLocale } from '../state/locale';
import { useMeta } from '../hooks/useMeta';

const content = {
  ua: {
    title: 'Політика конфіденційності',
    description: 'Політика конфіденційності ГорПляж щодо збору, використання, зберігання та захисту персональних даних.',
    updated: 'Останнє оновлення: 20 липня 2026',
    intro: 'Ця політика пояснює, які персональні та технічні дані ГорПляж може обробляти під час реєстрації та користування кабінетом гостя, бронювання, оплати, купівлі квитків, звернення до адміністрації та користування сайтом.',
    note: 'Окремі умови надання послуг, передоплати, скасування, перебування на території комплексу та сервісного збору описані у правилах перебування та в умовах оплати і повернення.',
    noteLink: 'Правила перебування',
    noteHref: '/rules',
    sections: [
      { title: '1. Які дані ми можемо збирати', body: 'Ми можемо обробляти імʼя, номер телефону, email, дату реєстрації та останнього входу, дату і час бронювання, кількість гостей, обрану позицію або подію, коментар до замовлення, суму та статус оплати, баланс і історію операцій з мушлями, улюблені позиції та збережені замовлення, технічні дані пристрою, IP-адресу, cookies, а також зміст звернень до адміністрації.' },
      { title: '2. Для чого ми використовуємо дані', body: 'Дані використовуються для створення кабінету гостя та авторизації, відображення історії бронювань, покупок і операцій, збереження обраного, створення й супроводу бронювань, підтвердження платежів, надсилання квитків і документів, звʼязку з гостем, захисту від помилкових або дубльованих операцій, ведення внутрішнього обліку та виконання вимог законодавства.' },
      { title: '2.1. Реєстрація та вхід до кабінету', body: 'Під час реєстрації гість вказує імʼя, телефон та email. Для повторного входу достатньо email: на нього надсилається одноразове посилання з обмеженим строком дії. Після успішного входу сайт зберігає на пристрої токен авторизації, щоб не вимагати повторного введення даних під час кожного відвідування. Вийти з кабінету можна у будь-який момент.' },
      { title: '3. Дані про оплату', body: 'Платежі можуть оброблятися сторонніми платіжними провайдерами. Ми не зберігаємо повні реквізити банківських карток на сайті, але можемо зберігати суму, валюту, статус, ідентифікатор транзакції, дату платежу та повʼязані з ним дані бронювання або замовлення.' },
      { title: '4. Дані про погодження з правилами', body: 'Під час бронювання ми можемо фіксувати факт погодження гостя з правилами перебування, умовами оплати і повернення та політикою конфіденційності. Це потрібно для належного оформлення замовлення і підтвердження прийняття умов сервісу.' },
      { title: '5. Передача третім сторонам', body: 'Ми можемо передавати дані платіжним провайдерам, сервісам email-розсилок, месенджерам, хостинговим і технічним сервісам лише в обсязі, необхідному для роботи сайту, бронювання, оплати, доставки квитків і підтримки гостей.' },
      { title: '6. Cookies, локальне сховище і технічні дані', body: 'Сайт може використовувати cookies та локальне сховище для збереження мови, токена входу до кабінету, кошика, статусу бронювання та базової аналітики. Токен використовується для підтримання авторизованого сеансу та не містить пароля. Обмеження cookies або очищення локального сховища може призвести до виходу з кабінету чи вплинути на роботу окремих функцій.' },
      { title: '7. Строк зберігання', body: 'Дані кабінету зберігаються, поки обліковий запис використовується або поки вони потрібні для надання сервісів. Дані про платежі, бронювання та покупки можуть зберігатися довше в обсязі, необхідному для бухгалтерського обліку, виконання договірних і законодавчих обовʼязків, розгляду звернень та захисту законних інтересів у спірних ситуаціях.' },
      { title: '8. Захист даних', body: 'Ми застосовуємо організаційні та технічні заходи для захисту інформації від втрати, несанкціонованого доступу, зміни або розголошення. Водночас жоден спосіб передачі даних через інтернет не гарантує абсолютної безпеки.' },
      { title: '9. Ваші права', body: 'Ви можете звернутися до адміністрації, щоб отримати інформацію про обробку, уточнити або виправити персональні дані, попросити видалити кабінет і дані, відкликати згоду чи обмежити окремі види обробки. Частина відомостей про платежі, бронювання та покупки може зберігатися після видалення кабінету, якщо цього вимагає закон або вони необхідні для захисту прав сторін.' },
      { title: '10. Зміни політики', body: 'Ми можемо оновлювати цю політику у разі зміни сервісів, правил бронювання, способів оплати або законодавчих вимог. Актуальна редакція завжди публікується на цій сторінці з датою останнього оновлення.' }
    ]
  },
  ru: {
    title: 'Политика конфиденциальности',
    description: 'Политика конфиденциальности ГорПляж о сборе, использовании, хранении и защите персональных данных.',
    updated: 'Последнее обновление: 20 июля 2026',
    intro: 'Эта политика объясняет, какие персональные и технические данные ГорПляж может обрабатывать при регистрации и использовании кабинета гостя, бронировании, оплате, покупке билетов, обращении к администрации и использовании сайта.',
    note: 'Отдельные условия оказания услуг, предоплаты, отмены, пребывания на территории комплекса и сервисного сбора описаны в правилах пребывания и в условиях оплаты и возврата.',
    noteLink: 'Правила пребывания',
    noteHref: '/rules',
    sections: [
      { title: '1. Какие данные мы можем собирать', body: 'Мы можем обрабатывать имя, номер телефона, email, дату регистрации и последнего входа, дату и время бронирования, количество гостей, выбранную позицию или событие, комментарий к заказу, сумму и статус оплаты, баланс и историю операций с ракушками, избранные позиции и сохранённые заказы, технические данные устройства, IP-адрес, cookies, а также содержание обращений к администрации.' },
      { title: '2. Для чего мы используем данные', body: 'Данные используются для создания кабинета гостя и авторизации, отображения истории бронирований, покупок и операций, сохранения избранного, создания и сопровождения бронирований, подтверждения платежей, отправки билетов и документов, связи с гостем, защиты от ошибочных или дублирующих операций, внутреннего учета и выполнения требований законодательства.' },
      { title: '2.1. Регистрация и вход в кабинет', body: 'При регистрации гость указывает имя, телефон и email. Для повторного входа достаточно email: на него отправляется одноразовая ссылка с ограниченным сроком действия. После успешного входа сайт сохраняет на устройстве токен авторизации, чтобы не требовать повторного ввода данных при каждом посещении. Выйти из кабинета можно в любой момент.' },
      { title: '3. Данные об оплате', body: 'Платежи могут обрабатываться сторонними платежными провайдерами. Мы не храним полные реквизиты банковских карт на сайте, но можем хранить сумму, валюту, статус, идентификатор транзакции, дату платежа и связанные с ним данные бронирования или заказа.' },
      { title: '4. Данные о согласии с правилами', body: 'При бронировании мы можем фиксировать факт согласия гостя с правилами пребывания, условиями оплаты и возврата и политикой конфиденциальности. Это нужно для корректного оформления заказа и подтверждения принятия условий сервиса.' },
      { title: '5. Передача третьим сторонам', body: 'Мы можем передавать данные платежным провайдерам, сервисам email-рассылок, мессенджерам, хостинговым и техническим сервисам только в объеме, необходимом для работы сайта, бронирования, оплаты, доставки билетов и поддержки гостей.' },
      { title: '6. Cookies, локальное хранилище и технические данные', body: 'Сайт может использовать cookies и локальное хранилище для сохранения языка, токена входа в кабинет, корзины, статуса бронирования и базовой аналитики. Токен используется для поддержания авторизованного сеанса и не содержит пароль. Ограничение cookies или очистка локального хранилища может привести к выходу из кабинета либо повлиять на работу отдельных функций.' },
      { title: '7. Срок хранения', body: 'Данные кабинета хранятся, пока учетная запись используется или пока они необходимы для предоставления сервисов. Данные о платежах, бронированиях и покупках могут храниться дольше в объеме, необходимом для бухгалтерского учета, выполнения договорных и законодательных обязанностей, рассмотрения обращений и защиты законных интересов в спорных ситуациях.' },
      { title: '8. Защита данных', body: 'Мы применяем организационные и технические меры для защиты информации от потери, несанкционированного доступа, изменения или раскрытия. При этом ни один способ передачи данных через интернет не гарантирует абсолютную безопасность.' },
      { title: '9. Ваши права', body: 'Вы можете обратиться к администрации, чтобы получить информацию об обработке, уточнить или исправить персональные данные, попросить удалить кабинет и данные, отозвать согласие либо ограничить отдельные виды обработки. Часть сведений о платежах, бронированиях и покупках может храниться после удаления кабинета, если этого требует закон или они необходимы для защиты прав сторон.' },
      { title: '10. Изменения политики', body: 'Мы можем обновлять эту политику при изменении сервисов, правил бронирования, способов оплаты или требований законодательства. Актуальная редакция всегда публикуется на этой странице с датой последнего обновления.' }
    ]
  },
  en: {
    title: 'Privacy Policy',
    description: 'GorPliaj privacy policy on collecting, using, storing, and protecting personal data.',
    updated: 'Last updated: July 20, 2026',
    intro: 'This policy explains what personal and technical data GorPliaj may process when you register for and use the guest account, book services, make payments, buy tickets, contact the venue, or use the website.',
    note: 'Separate conditions for service delivery, prepayment, cancellations, venue access, and the service charge are described in the venue rules and the payment and refund terms.',
    noteLink: 'Venue rules',
    noteHref: '/rules',
    sections: [
      { title: '1. Data we may collect', body: 'We may process your name, phone number, email, registration and last-login dates, booking date and time, number of guests, selected position or event, order comments, payment amount and status, shell balance and transaction history, favorites and saved orders, device technical data, IP address, cookies, and messages sent to the venue administration.' },
      { title: '2. Why we use data', body: 'Data is used to create and authenticate the guest account, display booking, purchase and transaction history, save favorites, create and manage bookings, confirm payments, send tickets and documents, contact guests, protect against mistaken or duplicate transactions, keep internal records, and comply with legal obligations.' },
      { title: '2.1. Registration and account access', body: 'During registration, a guest provides a name, phone number, and email. Returning guests can log in with email only: a time-limited one-time link is sent to that address. After login, the website stores an authentication token on the device so the guest does not need to enter the same details on every visit. The guest can log out at any time.' },
      { title: '3. Payment data', body: 'Payments may be processed by third-party payment providers. We do not store full bank card details on the website, but we may store the payment amount, currency, status, transaction identifier, payment date, and related booking or order details.' },
      { title: '4. Consent records', body: 'When a guest places a booking, we may record their acceptance of the venue rules, payment and refund terms, and privacy policy. This helps us properly process the order and confirm acceptance of the service terms.' },
      { title: '5. Sharing with third parties', body: 'We may share data with payment providers, email services, messengers, hosting providers, and technical vendors only to the extent needed to operate the website, process bookings, receive payments, deliver tickets, and support guests.' },
      { title: '6. Cookies, local storage, and technical data', body: 'The website may use cookies and local storage to save language preferences, the guest-account login token, cart details, booking status, and basic analytics. The token maintains the authenticated session and does not contain a password. Restricting cookies or clearing local storage may sign the guest out or affect some website functions.' },
      { title: '7. Retention period', body: 'Account data is kept while the account is used or while it is needed to provide the services. Payment, booking, and purchase records may be retained longer to the extent required for accounting, contractual and legal duties, handling requests, and protecting legitimate interests in disputes.' },
      { title: '8. Data protection', body: 'We apply organizational and technical safeguards to protect information from loss, unauthorized access, alteration, or disclosure. However, no method of internet transmission can be guaranteed to be absolutely secure.' },
      { title: '9. Your rights', body: 'You may contact the venue administration to request information about processing, clarify or correct personal data, request deletion of the account and data, withdraw consent, or restrict certain processing. Some payment, booking, and purchase records may be retained after account deletion where required by law or necessary to protect the parties’ rights.' },
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
