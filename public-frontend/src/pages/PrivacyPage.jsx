import { useLocale } from '../state/locale';
import { useMeta } from '../hooks/useMeta';

const content = {
  ua: {
    title: 'Політика конфіденційності',
    description: 'Розширена політика конфіденційності ГорПляж щодо збору, використання, зберігання та захисту персональних даних.',
    updated: 'Останнє оновлення: 17 червня 2026',
    sections: [
      {
        title: '1. Хто ми',
        body: 'ГорПляж надає інформацію про заклад, меню, події, бронювання, квитки та повʼязані сервіси. Ця політика пояснює, які дані ми можемо обробляти під час користування сайтом і нашими офіційними каналами.'
      },
      {
        title: '2. Які дані ми збираємо',
        body: 'Ми можемо отримувати імʼя, номер телефону, електронну адресу, дату та час бронювання, кількість гостей, обраний стіл або подію, деталі замовлення, платіжний статус, технічні дані пристрою, IP-адресу, cookies та повідомлення, які ви надсилаєте адміністрації.'
      },
      {
        title: '3. Як ми використовуємо дані',
        body: 'Дані використовуються для обробки бронювань і замовлень, підтвердження оплати, видачі квитків, звʼязку з гостем, підтримки сервісу, покращення сайту, безпеки, аналітики та виконання юридичних або бухгалтерських обовʼязків.'
      },
      {
        title: '4. Платежі',
        body: 'Платежі можуть оброблятися сторонніми платіжними провайдерами. Ми не зберігаємо повні реквізити банківських карток на сайті. Для підтвердження платежу ми можемо зберігати суму, статус, ідентифікатор транзакції, дату та повʼязані дані замовлення.'
      },
      {
        title: '5. Передача даних третім сторонам',
        body: 'Ми можемо передавати дані сервісам, які допомагають працювати сайту: хостингу, платіжним провайдерам, сервісам електронної пошти, месенджерам, аналітиці, системам бронювання та технічній підтримці. Такі сторони отримують лише дані, необхідні для виконання їхніх функцій.'
      },
      {
        title: '6. Cookies і технічні дані',
        body: 'Сайт може використовувати cookies та локальне сховище для збереження мови, теми інтерфейсу, кошика, сесії та базової аналітики. Ви можете обмежити cookies у налаштуваннях браузера, але частина функцій сайту може працювати некоректно.'
      },
      {
        title: '7. Зберігання даних',
        body: 'Ми зберігаємо персональні дані не довше, ніж потрібно для надання послуг, вирішення звернень, бухгалтерського обліку, безпеки та дотримання законодавства. Строк зберігання може відрізнятися залежно від типу даних і підстави обробки.'
      },
      {
        title: '8. Захист інформації',
        body: 'Ми застосовуємо організаційні та технічні заходи для захисту даних від втрати, несанкціонованого доступу, зміни або розголошення. Водночас жоден спосіб передачі даних через інтернет не може бути гарантовано абсолютно безпечним.'
      },
      {
        title: '9. Ваші права',
        body: 'Ви можете звернутися до нас, щоб уточнити, виправити або видалити свої персональні дані, відкликати згоду на обробку, обмежити окремі види обробки або отримати інформацію про те, як використовуються ваші дані, якщо це не суперечить законним обовʼязкам закладу.'
      },
      {
        title: '10. Зміни політики',
        body: 'Ми можемо оновлювати цю політику, якщо змінюються сервіси, законодавчі вимоги або технічні процеси. Актуальна редакція завжди публікується на цій сторінці із зазначенням дати останнього оновлення.'
      },
      {
        title: '11. Контакти',
        body: 'З питань конфіденційності та обробки персональних даних звертайтеся до адміністрації за контактами, вказаними на сайті.'
      }
    ]
  },
  ru: {
    title: 'Политика конфиденциальности',
    description: 'Расширенная политика конфиденциальности ГорПляж о сборе, использовании, хранении и защите персональных данных.',
    updated: 'Последнее обновление: 17 июня 2026',
    sections: [
      {
        title: '1. Кто мы',
        body: 'ГорПляж предоставляет информацию о заведении, меню, событиях, бронировании, билетах и связанных сервисах. Эта политика объясняет, какие данные мы можем обрабатывать при использовании сайта и наших официальных каналов.'
      },
      {
        title: '2. Какие данные мы собираем',
        body: 'Мы можем получать имя, номер телефона, электронную почту, дату и время бронирования, количество гостей, выбранный стол или событие, детали заказа, платежный статус, технические данные устройства, IP-адрес, cookies и сообщения, которые вы отправляете администрации.'
      },
      {
        title: '3. Как мы используем данные',
        body: 'Данные используются для обработки бронирований и заказов, подтверждения оплаты, выдачи билетов, связи с гостем, поддержки сервиса, улучшения сайта, безопасности, аналитики и выполнения юридических или бухгалтерских обязанностей.'
      },
      {
        title: '4. Платежи',
        body: 'Платежи могут обрабатываться сторонними платежными провайдерами. Мы не храним полные реквизиты банковских карт на сайте. Для подтверждения платежа мы можем хранить сумму, статус, идентификатор транзакции, дату и связанные данные заказа.'
      },
      {
        title: '5. Передача данных третьим сторонам',
        body: 'Мы можем передавать данные сервисам, которые помогают работе сайта: хостингу, платежным провайдерам, сервисам электронной почты, мессенджерам, аналитике, системам бронирования и технической поддержке. Такие стороны получают только данные, необходимые для выполнения их функций.'
      },
      {
        title: '6. Cookies и технические данные',
        body: 'Сайт может использовать cookies и локальное хранилище для сохранения языка, темы интерфейса, корзины, сессии и базовой аналитики. Вы можете ограничить cookies в настройках браузера, но часть функций сайта может работать некорректно.'
      },
      {
        title: '7. Хранение данных',
        body: 'Мы храним персональные данные не дольше, чем нужно для оказания услуг, обработки обращений, бухгалтерского учета, безопасности и соблюдения законодательства. Срок хранения может отличаться в зависимости от типа данных и основания обработки.'
      },
      {
        title: '8. Защита информации',
        body: 'Мы применяем организационные и технические меры для защиты данных от потери, несанкционированного доступа, изменения или раскрытия. При этом ни один способ передачи данных через интернет не может быть гарантированно абсолютно безопасным.'
      },
      {
        title: '9. Ваши права',
        body: 'Вы можете обратиться к нам, чтобы уточнить, исправить или удалить свои персональные данные, отозвать согласие на обработку, ограничить отдельные виды обработки или получить информацию о том, как используются ваши данные, если это не противоречит законным обязанностям заведения.'
      },
      {
        title: '10. Изменения политики',
        body: 'Мы можем обновлять эту политику, если меняются сервисы, законодательные требования или технические процессы. Актуальная редакция всегда публикуется на этой странице с указанием даты последнего обновления.'
      },
      {
        title: '11. Контакты',
        body: 'По вопросам конфиденциальности и обработки персональных данных обращайтесь к администрации по контактам, указанным на сайте.'
      }
    ]
  },
  en: {
    title: 'Privacy Policy',
    description: 'Extended GorPliaj privacy policy about collecting, using, storing and protecting personal data.',
    updated: 'Last updated: June 17, 2026',
    sections: [
      {
        title: '1. Who We Are',
        body: 'GorPliaj provides information about the venue, menu, events, bookings, tickets and related services. This policy explains what data we may process when you use the website and our official channels.'
      },
      {
        title: '2. Data We Collect',
        body: 'We may receive your name, phone number, email address, booking date and time, number of guests, selected table or event, order details, payment status, device technical data, IP address, cookies and messages you send to the administration.'
      },
      {
        title: '3. How We Use Data',
        body: 'Data is used to process bookings and orders, confirm payments, issue tickets, contact guests, support the service, improve the website, maintain security, run analytics and meet legal or accounting obligations.'
      },
      {
        title: '4. Payments',
        body: 'Payments may be processed by third-party payment providers. We do not store full bank card details on the website. To confirm payments, we may store the amount, status, transaction identifier, date and related order data.'
      },
      {
        title: '5. Sharing Data With Third Parties',
        body: 'We may share data with services that help operate the website, including hosting, payment providers, email services, messengers, analytics, booking systems and technical support. These parties receive only the data needed to perform their functions.'
      },
      {
        title: '6. Cookies and Technical Data',
        body: 'The website may use cookies and local storage to save language, interface theme, cart, session and basic analytics. You can restrict cookies in browser settings, but some website functions may not work correctly.'
      },
      {
        title: '7. Data Retention',
        body: 'We retain personal data only as long as needed to provide services, handle requests, keep accounting records, maintain security and comply with law. Retention periods may vary depending on the data type and processing basis.'
      },
      {
        title: '8. Information Security',
        body: 'We use organizational and technical measures to protect data from loss, unauthorized access, alteration or disclosure. However, no method of data transmission over the internet can be guaranteed to be absolutely secure.'
      },
      {
        title: '9. Your Rights',
        body: 'You may contact us to clarify, correct or delete your personal data, withdraw consent, restrict certain processing or receive information about how your data is used, provided this does not conflict with the venueʼs legal obligations.'
      },
      {
        title: '10. Policy Changes',
        body: 'We may update this policy if services, legal requirements or technical processes change. The current version is always published on this page with the last updated date.'
      },
      {
        title: '11. Contacts',
        body: 'For privacy and personal data questions, contact the administration using the contact details shown on the website.'
      }
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
