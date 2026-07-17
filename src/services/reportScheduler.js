const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { sendReportEmail } = require('./reportEmailService');

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
  console.log('[report-scheduler] Scheduled report jobs started.');
}

async function runScheduledReports() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();

  const schedules = await prisma.reportSchedule.findMany({
    where: { isActive: true }
  });

  for (const schedule of schedules) {
    let shouldRun = false;

    if (schedule.frequency === 'DAILY' && schedule.hour === currentHour) {
      shouldRun = true;
    } else if (schedule.frequency === 'WEEKLY' && schedule.dayOfWeek === currentDay && schedule.hour === currentHour) {
      shouldRun = true;
    } else if (schedule.frequency === 'MONTHLY' && now.getDate() === 1 && schedule.hour === currentHour) {
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

module.exports = { scheduleReportJobs, runScheduledReports, stopScheduledJobs };
