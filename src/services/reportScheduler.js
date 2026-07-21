const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { sendReportEmail } = require('./reportEmailService');
const { getOccupancyLive } = require('./reportService');
const { getVenueClockParts } = require('../utils/venueTime');

let scheduledJobs = [];

function scheduleReportJobs() {
  scheduledJobs.forEach(job => job.stop());
  scheduledJobs = [];

  const cronExpression = '0 * * * *';

  const job = cron.schedule(cronExpression, async () => {
    try {
      await runScheduledReports();
    } catch (error) {
      console.error('[report-scheduler] Error running scheduled reports:', error.message);
    }
  }, { timezone: 'Europe/Kyiv' });

  scheduledJobs.push(job);

  const snapshotJob = cron.schedule('59 23 * * *', async () => {
    try {
      await runDailyOccupancySnapshot();
    } catch (error) {
      console.error('[report-scheduler] Error running daily occupancy snapshot:', error.message);
    }
  }, { timezone: 'Europe/Kyiv' });

  scheduledJobs.push(snapshotJob);
  console.log('[report-scheduler] Scheduled report jobs + occupancy snapshot started.');
}

async function runScheduledReports() {
  const now = new Date();
  const clock = getVenueClockParts(now);
  const currentHour = clock.hour;
  const currentDay = new Date(Date.UTC(clock.year, clock.month - 1, clock.day, 12)).getUTCDay();

  const schedules = await prisma.reportSchedule.findMany({
    where: { isActive: true }
  });

  for (const schedule of schedules) {
    let shouldRun = false;

    if (schedule.frequency === 'DAILY' && schedule.hour === currentHour) {
      shouldRun = true;
    } else if (schedule.frequency === 'WEEKLY' && schedule.dayOfWeek === currentDay && schedule.hour === currentHour) {
      shouldRun = true;
    } else if (schedule.frequency === 'MONTHLY' && clock.day === 1 && schedule.hour === currentHour) {
      shouldRun = true;
    }

    if (shouldRun) {
      try {
        const to = new Date();
        const from = new Date();

        if (schedule.frequency === 'DAILY') {
          from.setDate(from.getDate() - 1);
        } else if (schedule.frequency === 'WEEKLY') {
          from.setDate(from.getDate() - 7);
        } else if (schedule.frequency === 'MONTHLY') {
          from.setMonth(from.getMonth() - 1);
        }

        const result = await sendReportEmail({
          reportType: schedule.reportType,
          email: schedule.recipientEmail,
          from,
          to
        });

        if (result.sent) {
          await prisma.reportSchedule.update({
            where: { id: schedule.id },
            data: { lastSentAt: new Date() }
          });
          console.log(`[report-scheduler] Sent ${schedule.reportType} to ${schedule.recipientEmail}`);
        } else {
          console.warn(`[report-scheduler] Failed to send ${schedule.reportType}: ${result.reason}`);
        }
      } catch (error) {
        console.error(`[report-scheduler] Error processing schedule ${schedule.id}:`, error.message);
      }
    }
  }
}

function stopScheduledJobs() {
  scheduledJobs.forEach(job => job.stop());
  scheduledJobs = [];
  console.log('[report-scheduler] Stopped all scheduled jobs.');
}

async function runDailyOccupancySnapshot() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const live = await getOccupancyLive({ date: today });

  await prisma.occupancySnapshot.upsert({
    where: { date: today },
    create: {
      date: today,
      beachOccupied: live.byKind.beach.occupied,
      beachCapacity: live.byKind.beach.capacity,
      beachPct: live.byKind.beach.pct,
      beachGuests: live.byKind.beach.guests,
      tableOccupied: live.byKind.table.occupied,
      tableCapacity: live.byKind.table.capacity,
      tablePct: live.byKind.table.pct,
      tableGuests: live.byKind.table.guests,
      eveningEvents: live.byKind.table.eveningEvents,
      totalGuests: live.total.guests,
      onPremises: live.onPremises,
      arrived: live.total.occupied,
      totalReservations: live.busyTableIds.length
    },
    update: {
      beachOccupied: live.byKind.beach.occupied,
      beachCapacity: live.byKind.beach.capacity,
      beachPct: live.byKind.beach.pct,
      beachGuests: live.byKind.beach.guests,
      tableOccupied: live.byKind.table.occupied,
      tableCapacity: live.byKind.table.capacity,
      tablePct: live.byKind.table.pct,
      tableGuests: live.byKind.table.guests,
      eveningEvents: live.byKind.table.eveningEvents,
      totalGuests: live.total.guests,
      onPremises: live.onPremises,
      arrived: live.total.occupied,
      totalReservations: live.busyTableIds.length
    }
  });

  console.log(`[report-scheduler] Daily occupancy snapshot saved for ${today.toISOString().slice(0, 10)}.`);
}

module.exports = { scheduleReportJobs, runScheduledReports, runDailyOccupancySnapshot, stopScheduledJobs };
