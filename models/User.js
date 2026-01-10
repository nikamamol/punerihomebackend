const db = require('../config/database');

class User {
    // Create new user
    static async create(userData) {
        const {
            name,
            email,
            phone,
            password,
            user_type,
            occupation,
            family_members,
            preferred_location,
            budget,
            move_in_date,
            property_type,
            total_properties,
            company_name,
            address,
            department,
            is_verified = 0,
            credits = 0,
            total_properties_allowed = 1
        } = userData;

        const query = `
            INSERT INTO users (
                name, email, phone, password, user_type, occupation, 
                family_members, preferred_location, budget, move_in_date,
                property_type, total_properties, company_name, address,
                department, is_verified, credits, total_properties_allowed,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;

        const values = [
            name, email, phone, password, user_type, occupation,
            family_members, preferred_location, budget, move_in_date,
            property_type, total_properties, company_name, address,
            department, is_verified, credits, total_properties_allowed
        ];

        try {
            const [result] = await db.execute(query, values);
            return {
                id: result.insertId,
                name,
                email,
                phone,
                user_type,
                ...userData
            };
        } catch (error) {
            throw error;
        }
    }

    // Find user by email
    static async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = ?';
        try {
            const [rows] = await db.execute(query, [email]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    // Find user by phone
    static async findByPhone(phone) {
        const query = 'SELECT * FROM users WHERE phone = ?';
        try {
            const [rows] = await db.execute(query, [phone]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    // Find user by ID
    static async findById(id) {
        const query = 'SELECT id, name, email, phone, user_type, created_at FROM users WHERE id = ?';
        try {
            const [rows] = await db.execute(query, [id]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    // Check if email exists
    static async emailExists(email) {
        const query = 'SELECT COUNT(*) as count FROM users WHERE email = ?';
        try {
            const [rows] = await db.execute(query, [email]);
            return rows[0].count > 0;
        } catch (error) {
            throw error;
        }
    }

    // Check if phone exists
    static async phoneExists(phone) {
        const query = 'SELECT COUNT(*) as count FROM users WHERE phone = ?';
        try {
            const [rows] = await db.execute(query, [phone]);
            return rows[0].count > 0;
        } catch (error) {
            throw error;
        }
    }

    // Get all users (for admin)
    static async getAll(limit = 50, offset = 0) {
        const query = 'SELECT id, name, email, phone, user_type, created_at FROM users LIMIT ? OFFSET ?';
        try {
            const [rows] = await db.execute(query, [limit, offset]);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    // Update user
    static async update(id, updateData) {
        const fields = Object.keys(updateData);
        const values = Object.values(updateData);
        
        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const query = `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = ?`;
        
        try {
            const [result] = await db.execute(query, [...values, id]);
            return result.affectedRows > 0;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = User;