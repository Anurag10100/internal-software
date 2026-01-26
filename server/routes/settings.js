const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get HRMS settings
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data: settings } = await supabase
      .from('hrms_settings')
      .select()
      .eq('id', 1)
      .single();

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
router.put('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { lateTime, halfDayTime, locationOptions, leaveTypes, weeklyOffSettings, holidays } = req.body;

    const { data: existingSettings } = await supabase
      .from('hrms_settings')
      .select()
      .eq('id', 1)
      .single();

    const existingJson = existingSettings?.settings_json ? JSON.parse(existingSettings.settings_json) : {};

    const newSettingsJson = JSON.stringify({
      locationOptions: locationOptions ?? existingJson.locationOptions ?? [],
      leaveTypes: leaveTypes ?? existingJson.leaveTypes ?? [],
      weeklyOffSettings: weeklyOffSettings ?? existingJson.weeklyOffSettings ?? {},
      holidays: holidays ?? existingJson.holidays ?? [],
    });

    if (existingSettings) {
      const { error } = await supabase
        .from('hrms_settings')
        .update({
          late_time: lateTime || existingSettings.late_time,
          half_day_time: halfDayTime || existingSettings.half_day_time,
          settings_json: newSettingsJson
        })
        .eq('id', 1);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('hrms_settings')
        .insert({
          id: 1,
          late_time: lateTime || '10:30 AM',
          half_day_time: halfDayTime || '11:00 AM',
          settings_json: newSettingsJson
        });

      if (error) throw error;
    }

    const { data: updatedSettings } = await supabase
      .from('hrms_settings')
      .select()
      .eq('id', 1)
      .single();

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
