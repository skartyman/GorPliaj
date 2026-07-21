// All calendar-based business rules (days, hours, reports and bookings) belong
// to the venue in Kyiv, regardless of the server's operating-system timezone.
process.env.TZ = 'Europe/Kyiv';

const { startServer } = require('./src/server');

startServer();
