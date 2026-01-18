const express = require('express');
const { db } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get HRMS settings
router.get('/', authenticateToken, (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM hrms_settings WHERE id = 1').get();

    if (!settings) {
      return res.json({
        settings: {
          lateTime: '10:30 AM',
          halfDayTime: '11:00 AM',
          locationOptions: [],
          leaveTypes: [],
          weeklyOffSettings: {},
          holidays: [],
        },
      });
    }

    const settingsJson = settings.settings_json ? JSON.parse(settings.settings_json) : {};

    res.json({
      settings: {
        lateTime: settings.late_time,
        halfDayTime: settings.half_day_time,
        ...settingsJson,
      },
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update HRMS settings (admin only)
router.put('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { lateTime, halfDayTime, locationOptions, leaveTypes, weeklyOffSettings, holidays } = req.body;

    const existingSettings = db.prepare('SELECT * FROM hrms_settings WHERE id = 1').get();
    const existingJson = existingSettings?.settings_json ? JSON.parse(existingSettings.settings_json) : {};

    const newSettingsJson = JSON.stringify({
      locationOptions: locationOptions ?? existingJson.locationOptions ?? [],
      leaveTypes: leaveTypes ?? existingJson.leaveTypes ?? [],
      weeklyOffSettings: weeklyOffSettings ?? existingJson.weeklyOffSettings ?? {},
      holidays: holidays ?? existingJson.holidays ?? [],
    });

    if (existingSettings) {
      db.prepare(`
        UPDATE hrms_settings SET
          late_time = COALESCE(?, late_time),
          half_day_time = COALESCE(?, half_day_time),
          settings_json = ?
        WHERE id = 1
      `).run(lateTime, halfDayTime, newSettingsJson);
    } else {
      db.prepare(`
        INSERT INTO hrms_settings (id, late_time, half_day_time, settings_json)
        VALUES (1, ?, ?, ?)
      `).run(lateTime || '10:30 AM', halfDayTime || '11:00 AM', newSettingsJson);
    }

    const updatedSettings = db.prepare('SELECT * FROM hrms_settings WHERE id = 1').get();
    const updatedJson = JSON.parse(updatedSettings.settings_json);

    res.json({
      message: 'Settings updated successfully',
      settings: {
        lateTime: updatedSettings.late_time,
        halfDayTime: updatedSettings.half_day_time,
        ...updatedJson,
      },
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
