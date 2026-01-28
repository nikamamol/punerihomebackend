// controllers/tenantController.js
const db = require('../config/database');

class TenantController {
  async getProfile(req, res) {
    try {
      const userId = req.user.id;

      const [user] = await db.execute(
        'SELECT id, name, email, phone, userType, created_at FROM users WHERE id = ?',
        [userId]
      );
      

      if (user.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        data: user[0]
      });

    } catch (error) {
      console.error('Get tenant profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { name, email, phone } = req.body;

      await db.execute(
        'UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?',
        [name, email, phone, userId]
      );

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully'
      });

    } catch (error) {
      console.error('Update tenant profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  async getCredits(req, res) {
    try {
      const userId = req.user.id;

      // Get credit balance from your credits table
      const [credits] = await db.execute(
        'SELECT balance FROM tenant_credits WHERE user_id = ?',
        [userId]
      );

      const creditBalance = credits[0]?.balance || 0;

      res.status(200).json({
        success: true,
        data: {
          balance: creditBalance
        }
      });

    } catch (error) {
      console.error('Get tenant credits error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
}

module.exports = new TenantController();