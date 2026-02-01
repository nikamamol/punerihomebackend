const db = require('../config/database');

class Viewing {
    // Create viewing request
    static async create(viewingData) {
        try {
            const query = `
                INSERT INTO viewing_requests (
                    preferred_date, 
                    preferred_time, 
                    property_type, 
                    location, 
                    name, 
                    phone, 
                    property_link,
                    status,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
            `;
            
            const [result] = await db.execute(query, [
                viewingData.preferred_date,
                viewingData.preferred_time,
                viewingData.property_type,
                viewingData.location,
                viewingData.name,
                viewingData.phone,
                viewingData.property_link
            ]);

            return {
                id: result.insertId,
                ...viewingData,
                status: 'pending',
                created_at: new Date()
            };
        } catch (error) {
            console.error('Create viewing request error:', error);
            throw error;
        }
    }

    // Get all viewing requests (for admin/owner)
    static async getAll(limit = 50, offset = 0) {
        try {
            const query = `
                SELECT * FROM viewing_requests 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            `;
            
            const [requests] = await db.execute(query, [limit, offset]);
            return requests;
        } catch (error) {
            console.error('Get all viewing requests error:', error);
            throw error;
        }
    }

    // Get viewing request by ID
    static async getById(id) {
        try {
            const query = 'SELECT * FROM viewing_requests WHERE id = ?';
            const [request] = await db.execute(query, [id]);
            
            return request.length > 0 ? request[0] : null;
        } catch (error) {
            console.error('Get viewing request by ID error:', error);
            throw error;
        }
    }

    // Update viewing request status
    static async updateStatus(id, status) {
        try {
            const query = `
                UPDATE viewing_requests 
                SET status = ?, updated_at = NOW() 
                WHERE id = ?
            `;
            
            const [result] = await db.execute(query, [status, id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Update viewing status error:', error);
            throw error;
        }
    }

    // Get viewing requests by phone
    static async getByPhone(phone) {
        try {
            const query = `
                SELECT * FROM viewing_requests 
                WHERE phone = ? 
                ORDER BY created_at DESC
            `;
            
            const [requests] = await db.execute(query, [phone]);
            return requests;
        } catch (error) {
            console.error('Get viewing by phone error:', error);
            throw error;
        }
    }
}

module.exports = Viewing;