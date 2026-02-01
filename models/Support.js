const db = require('../config/database');

class Support {
    // Create support ticket
    static async create(supportData) {
        try {
            const query = `
                INSERT INTO support_tickets (
                    name, 
                    email, 
                    phone, 
                    message, 
                    status,
                    created_at
                ) VALUES (?, ?, ?, ?, 'pending', NOW())
            `;

            const [result] = await db.execute(query, [
                supportData.name,
                supportData.email,
                supportData.phone || null,
                supportData.message
            ]);

            return {
                id: result.insertId,
                ...supportData,
                status: 'pending',
                created_at: new Date()
            };
        } catch (error) {
            console.error('Create support ticket error:', error);
            throw error;
        }
    }

    // Get all support tickets (for admin)
    static async getAll(limit = 50, offset = 0) {
        try {
            const query = `
                SELECT * FROM support_tickets 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            `;

            const [tickets] = await db.execute(query, [limit, offset]);
            return tickets;
        } catch (error) {
            console.error('Get all support tickets error:', error);
            throw error;
        }
    }

    // Get ticket by ID
    static async getById(id) {
        try {
            const query = 'SELECT * FROM support_tickets WHERE id = ?';
            const [ticket] = await db.execute(query, [id]);

            return ticket.length > 0 ? ticket[0] : null;
        } catch (error) {
            console.error('Get ticket by ID error:', error);
            throw error;
        }
    }

    // Update ticket status
    static async updateStatus(id, status) {
        try {
            const query = `
                UPDATE support_tickets 
                SET status = ?, updated_at = NOW() 
                WHERE id = ?
            `;

            const [result] = await db.execute(query, [status, id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Update ticket status error:', error);
            throw error;
        }
    }
}

module.exports = Support;