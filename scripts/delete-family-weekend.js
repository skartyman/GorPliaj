require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Searching for 'Family Weekend' events...");
  
  const events = await prisma.event.findMany();
  const targetEvents = events.filter(e => {
    const slugLower = (e.slug || '').toLowerCase();
    const titleObj = e.title || {};
    const titleStr = typeof titleObj === 'string' 
      ? titleObj 
      : `${titleObj.ua || ''} ${titleObj.ru || ''} ${titleObj.en || ''}`;
    const titleLower = titleStr.toLowerCase();
    
    return slugLower.includes('family') || slugLower.includes('weekend') || 
           titleLower.includes('family') || titleLower.includes('weekend') ||
           titleLower.includes('семейн') || titleLower.includes('сімейн');
  });

  if (targetEvents.length === 0) {
    console.log("No matching events found.");
    return;
  }

  console.log(`Found ${targetEvents.length} matching event(s):`);
  for (const e of targetEvents) {
    console.log(`- ID: ${e.id}, Slug: ${e.slug}, Title: ${JSON.stringify(e.title)}`);
  }

  for (const e of targetEvents) {
    console.log(`\nDeleting related records for Event ID ${e.id}...`);
    
    const deletedTickets = await prisma.ticket.deleteMany({ where: { eventId: e.id } });
    console.log(`Deleted ${deletedTickets.count} tickets.`);

    const deletedOrders = await prisma.ticketOrder.deleteMany({ where: { eventId: e.id } });
    console.log(`Deleted ${deletedOrders.count} ticket orders.`);

    const deletedHolds = await prisma.tableHold.deleteMany({ where: { eventId: e.id } });
    console.log(`Deleted ${deletedHolds.count} table holds.`);

    const deletedOverrides = await prisma.venueTableOverride.deleteMany({ where: { eventId: e.id } });
    console.log(`Deleted ${deletedOverrides.count} table overrides.`);

    const deletedReservations = await prisma.reservation.deleteMany({ where: { eventId: e.id } });
    console.log(`Deleted ${deletedReservations.count} reservations.`);

    const deletedSessions = await prisma.eventSession.deleteMany({ where: { eventId: e.id } });
    console.log(`Deleted ${deletedSessions.count} sessions.`);

    const deletedTicketTypes = await prisma.ticketType.deleteMany({ where: { eventId: e.id } });
    console.log(`Deleted ${deletedTicketTypes.count} ticket types.`);

    await prisma.event.delete({ where: { id: e.id } });
    console.log(`Successfully deleted Event ID ${e.id} (${e.slug}).`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
