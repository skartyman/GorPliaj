const reportService = require('../services/reportService');
const { getFinancialReport, getReservationsReport, getTicketSalesReport, getMenuReport, getEventsReport, getStaffReport, getSummaryReport, getOccupancyReport } = require('../services/reportService');
const prisma = require('../lib/prisma');
const { sendReportEmail } = require('../services/reportEmailService');

function parseRange(req) {
  const period = req.query.period ? String(req.query.period) : null;
  if (period) return reportService.resolveRange(period);
  const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const to = req.query.to ? new Date(req.query.to) : new Date();
  return { from, to };
}

async function getFinancialReportController(req, res) {
  try {
    const { from, to } = parseRange(req);
    const report = await getFinancialReport({ from, to });
    return res.json(report);
  } catch (error) {
    console.error('[adminReportController.financial] Failed.', error);
    return res.status(500).json({ message: 'Unable to load financial report.' });
  }
}

async function getReservationsReportController(req, res) {
  try {
    const { from, to } = parseRange(req);
    const report = await getReservationsReport({ from, to });
    return res.json(report);
  } catch (error) {
    console.error('[adminReportController.reservations] Failed.', error);
    return res.status(500).json({ message: 'Unable to load reservations report.' });
  }
}

async function getTicketSalesReportController(req, res) {
  try {
    const { from, to } = parseRange(req);
    const report = await getTicketSalesReport({ from, to });
    return res.json(report);
  } catch (error) {
    console.error('[adminReportController.tickets] Failed.', error);
    return res.status(500).json({ message: 'Unable to load ticket sales report.' });
  }
}

async function getMenuReportController(req, res) {
  try {
    const { from, to } = parseRange(req);
    const report = await getMenuReport({ from, to });
    return res.json(report);
  } catch (error) {
    console.error('[adminReportController.menu] Failed.', error);
    return res.status(500).json({ message: 'Unable to load menu report.' });
  }
}

async function getEventsReportController(req, res) {
  try {
    const { from, to } = parseRange(req);
    const report = await getEventsReport({ from, to });
    return res.json(report);
  } catch (error) {
    console.error('[adminReportController.events] Failed.', error);
    return res.status(500).json({ message: 'Unable to load events report.' });
  }
}

async function getStaffReportController(req, res) {
  try {
    const { from, to } = parseRange(req);
    const report = await getStaffReport({ from, to });
    return res.json(report);
  } catch (error) {
    console.error('[adminReportController.staff] Failed.', error);
    return res.status(500).json({ message: 'Unable to load staff report.' });
  }
}

async function getSummaryReportController(req, res) {
  try {
    const { from, to } = parseRange(req);
    const report = await getSummaryReport({ from, to });
    return res.json(report);
  } catch (error) {
    console.error('[adminReportController.summary] Failed.', error);
    return res.status(500).json({ message: 'Unable to load summary report.' });
  }
}

async function sendManualReportController(req, res) {
  try {
    const reportType = String(req.body.reportType || '').trim().toUpperCase();
    const email = String(req.body.email || '').trim();
    if (!reportType || !email) {
      return res.status(400).json({ message: 'reportType and email are required.' });
    }

    const { from, to } = parseRange(req);
    const result = await sendReportEmail({ reportType, email, from, to });
    return res.json({ success: true, sent: result.sent, reason: result.reason || null });
  } catch (error) {
    console.error('[adminReportController.sendManual] Failed.', error);
    return res.status(500).json({ message: 'Unable to send report.' });
  }
}

async function listSchedulesController(req, res) {
  try {
    const schedules = await prisma.reportSchedule.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json({ schedules });
  } catch (error) {
    console.error('[adminReportController.listSchedules] Failed.', error);
    return res.status(500).json({ message: 'Unable to load report schedules.' });
  }
}

async function createScheduleController(req, res) {
  try {
    const { name, reportType, frequency, recipientEmail, recipientName, dayOfWeek, hour } = req.body;
    if (!name || !reportType || !recipientEmail) {
      return res.status(400).json({ message: 'name, reportType, recipientEmail are required.' });
    }

    const schedule = await prisma.reportSchedule.create({
      data: {
        name,
        reportType: String(reportType).toUpperCase(),
        frequency: String(frequency || 'WEEKLY').toUpperCase(),
        recipientEmail,
        recipientName: recipientName || null,
        dayOfWeek: dayOfWeek != null ? Number(dayOfWeek) : 1,
        hour: hour != null ? Number(hour) : 9,
        isActive: true
      }
    });

    return res.status(201).json({ schedule });
  } catch (error) {
    console.error('[adminReportController.createSchedule] Failed.', error);
    return res.status(500).json({ message: 'Unable to create report schedule.' });
  }
}

async function batchCreateScheduleController(req, res) {
  try {
    const { name, reportType, frequency, dayOfWeek, hour, recipients } = req.body;
    if (!name || !reportType || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ message: 'name, reportType and recipients[] are required.' });
    }

    const created = [];
    for (const r of recipients) {
      if (!r.email) continue;
      const schedule = await prisma.reportSchedule.create({
        data: {
          name: `${name}${recipients.length > 1 ? ` — ${r.name || r.email}` : ''}`,
          reportType: String(reportType).toUpperCase(),
          frequency: String(frequency || 'WEEKLY').toUpperCase(),
          recipientEmail: r.email,
          recipientName: r.name || null,
          dayOfWeek: dayOfWeek != null ? Number(dayOfWeek) : 1,
          hour: hour != null ? Number(hour) : 9,
          isActive: true
        }
      });
      created.push(schedule);
    }

    return res.status(201).json({ schedules: created });
  } catch (error) {
    console.error('[adminReportController.batchCreateSchedule] Failed.', error);
    return res.status(500).json({ message: 'Unable to create schedules.' });
  }
}

async function updateScheduleController(req, res) {
  try {
    const id = Number(req.params.id);
    const schedule = await prisma.reportSchedule.update({
      where: { id },
      data: req.body
    });
    return res.json({ schedule });
  } catch (error) {
    console.error('[adminReportController.updateSchedule] Failed.', error);
    return res.status(500).json({ message: 'Unable to update schedule.' });
  }
}

async function deleteScheduleController(req, res) {
  try {
    const id = Number(req.params.id);
    await prisma.reportSchedule.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error('[adminReportController.deleteSchedule] Failed.', error);
    return res.status(500).json({ message: 'Unable to delete schedule.' });
  }
}

async function triggerScheduleController(req, res) {
  try {
    const id = Number(req.params.id);
    const schedule = await prisma.reportSchedule.findUnique({ where: { id } });
    if (!schedule) return res.status(404).json({ message: 'Schedule not found.' });

    const now = new Date();
    const from = new Date(now); from.setDate(from.getDate() - 7);
    const result = await sendReportEmail({
      reportType: schedule.reportType,
      email: schedule.recipientEmail,
      from,
      to: now
    });

    return res.json({ success: true, sent: result.sent, reason: result.reason || null });
  } catch (error) {
    console.error('[adminReportController.triggerSchedule] Failed.', error);
    return res.status(500).json({ message: 'Unable to trigger report.' });
  }
}

async function getOccupancyReportController(req, res) {
  try {
    const { from, to } = parseRange(req);
    const report = await getOccupancyReport({ from, to });
    return res.json(report);
  } catch (error) {
    console.error('[adminReportController.occupancy] Failed.', error);
    return res.status(500).json({ message: 'Unable to load occupancy report.' });
  }
}

module.exports = {
  getFinancialReportController,
  getReservationsReportController,
  getTicketSalesReportController,
  getMenuReportController,
  getEventsReportController,
  getStaffReportController,
  getSummaryReportController,
  getOccupancyReportController,
  sendManualReportController,
  listSchedulesController,
  createScheduleController,
  batchCreateScheduleController,
  updateScheduleController,
  deleteScheduleController,
  triggerScheduleController
};
