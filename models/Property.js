// models/Property.js
const db = require('../config/database');

class Property {
    // Create new property
    static async create(propertyData) {
        try {
            console.log('Creating property with data:', {
                title: propertyData.title,
                property_type: propertyData.property_type,
                bedrooms: propertyData.bedrooms,
                price: propertyData.price
            });

            // SIMPLE और SAFE query
            const query = `
                INSERT INTO properties (
                    owner_id, title, description, property_type, property_for,
                    address, city, state, pincode, locality, landmark,
                    bedrooms, bathrooms, total_floors, floor_number,
                    built_up_area, price, currency, price_type,
                    maintenance_charge, security_deposit, furnishing_status,
                    facing, property_age, available_from,
                    preferred_tenant_type, additional_features,
                    contact_person_name, contact_person_phone,
                    contact_person_email, contact_person_whatsapp,
                    verification_agreement, terms_agreement, accuracy_agreement,
                    status, verification_status, is_active, is_featured,
                    views, inquiries, rejection_reason, area_unit,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `;

            // Values array - 42 values for 42 placeholders
            const values = [
                // Basic (1-5)
                propertyData.owner_id || 1,
                propertyData.title || '',
                propertyData.description || '',
                propertyData.property_type || 'apartment',
                propertyData.property_for || 'Rent',

                // Location (6-11)
                propertyData.address || '',
                propertyData.city || '',
                propertyData.state || '',
                propertyData.pincode || '',
                propertyData.locality || '',
                propertyData.landmark || null,

                // Details (12-16)
                parseInt(propertyData.bedrooms) || 1,
                parseInt(propertyData.bathrooms) || 1,
                parseInt(propertyData.total_floors) || null,
                parseInt(propertyData.floor_number) || null,
                parseInt(propertyData.built_up_area) || 0,

                // Price (17-21)
                parseFloat(propertyData.price) || 0,
                propertyData.currency || 'INR',
                propertyData.price_type || 'Monthly',
                parseFloat(propertyData.maintenance_charge) || null,
                parseFloat(propertyData.security_deposit) || null,

                // Furnishing & Facing (22-24)
                propertyData.furnishing_status || 'semi',
                propertyData.facing || null,
                propertyData.property_age || null,

                // Availability (25-27)
                propertyData.available_from || null,
                propertyData.preferred_tenant_type || 'any',
                propertyData.additional_features || null,

                // Contact (28-32)
                propertyData.contact_person_name || '',
                propertyData.contact_person_phone || '',
                propertyData.contact_person_email || '',
                propertyData.contact_person_whatsapp || null,

                // Agreements (33-35)
                propertyData.verification_agreement ? 1 : 0,
                propertyData.terms_agreement ? 1 : 0,
                propertyData.accuracy_agreement ? 1 : 0,

                // Status (36-43)
                'pending', // status
                'pending', // verification_status
                1, // is_active
                0, // is_featured
                0, // views
                0, // inquiries
                null, // rejection_reason
                propertyData.area_unit || 'sq ft'
            ];

            console.log(`🔢 Executing query with ${values.length} values`);

            const [result] = await db.execute(query, values);
            const propertyId = result.insertId;
            console.log('✅ Property created with ID:', propertyId);

            // Generate property ID
            const propId = `PROP${propertyId.toString().padStart(6, '0')}`;
            await db.execute('UPDATE properties SET property_id = ? WHERE id = ?', [propId, propertyId]);

            // Insert amenities
            if (propertyData.amenities && propertyData.amenities.length > 0) {
                const amenityValues = propertyData.amenities.map(amenity => [propertyId, amenity]);
                await db.query('INSERT INTO property_amenities (property_id, amenity) VALUES ?', [amenityValues]);
                console.log(`✅ Added ${propertyData.amenities.length} amenities`);
            }

            // Insert images
            if (propertyData.images && propertyData.images.length > 0) {
                const imageValues = propertyData.images.map((image, index) => [
                    propertyId,
                    image.url,
                    image.caption || '',
                    image.public_id || null,
                    'image',
                    image.format || null,
                    image.width || null,
                    image.height || null,
                    image.bytes || null,
                    index === 0 ? 1 : 0,
                    1
                ]);
                await db.query(
                    `INSERT INTO property_images 
                     (property_id, url, caption, public_id, resource_type, format, 
                      width, height, bytes, is_primary, is_cloudinary) 
                     VALUES ?`,
                    [imageValues]
                );
                console.log(`✅ Added ${propertyData.images.length} images`);
            }

            // Return the created property
            return await this.findById(propertyId);

        } catch (error) {
            console.error('❌ Error in Property.create:', error.message);
            throw error;
        }
    }

    // Find property by ID
    static async findById(id) {
        try {
            const [rows] = await db.execute(
                `SELECT p.* FROM properties p WHERE p.id = ?`,
                [id]
            );

            if (rows.length === 0) return null;

            const property = rows[0];

            // Get amenities
            const [amenities] = await db.execute(
                'SELECT amenity FROM property_amenities WHERE property_id = ?',
                [id]
            );
            property.amenities = amenities.map(a => a.amenity);

            // Get images
            const [images] = await db.execute(
                `SELECT id, url, caption, public_id, is_primary 
                 FROM property_images WHERE property_id = ? 
                 ORDER BY is_primary DESC, id ASC`,
                [id]
            );
            property.images = images;

            return property;
        } catch (error) {
            console.error('Error in findById:', error);
            throw error;
        }
    }

    async getOwnerProperties(req, res) {
        try {
            const ownerId = req.user?.userId || req.user?.id;
            console.log(`Fetching properties for owner ID: ${ownerId}`);

            if (!ownerId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required. Please login first.'
                });
            }

            // Extract query parameters
            const {
                status,
                property_type,
                property_for,
                search,
                sortBy = 'newest',
                page = 1,
                limit = 10
            } = req.query;

            let query = `
            SELECT p.*
            FROM properties p
            WHERE p.owner_id = ?
        `;

            const values = [ownerId];

            // Apply filters
            if (status && status !== 'null') {
                query += ' AND p.status = ?';
                values.push(status);
            }

            if (property_type && property_type !== 'null') {
                query += ' AND p.property_type = ?';
                values.push(property_type);
            }

            if (property_for && property_for !== 'null') {
                query += ' AND p.property_for = ?';
                values.push(property_for);
            }

            if (search && search !== 'null') {
                query += ' AND (p.title LIKE ? OR p.description LIKE ? OR p.address LIKE ? OR p.city LIKE ?)';
                const searchTerm = `%${search}%`;
                values.push(searchTerm, searchTerm, searchTerm, searchTerm);
            }

            // Apply sorting
            const sortOptions = {
                'newest': 'p.created_at DESC',
                'oldest': 'p.created_at ASC',
                'price-low': 'p.price ASC',
                'price-high': 'p.price DESC',
                'views': 'p.views DESC'
            };

            query += ` ORDER BY ${sortOptions[sortBy] || 'p.created_at DESC'}`;

            // Get total count for pagination
            let countQuery = query.replace('SELECT p.*', 'SELECT COUNT(*) as total');
            const [countResult] = await db.execute(countQuery, values);
            const total = countResult[0]?.total || 0;

            // Apply pagination
            const offset = (parseInt(page) - 1) * parseInt(limit);
            query += ' LIMIT ? OFFSET ?';
            values.push(parseInt(limit), offset);

            // Execute main query
            const [properties] = await db.execute(query, values);

            // Get images for each property
            for (const property of properties) {
                const [images] = await db.execute(
                    'SELECT url, is_primary FROM property_images WHERE property_id = ? ORDER BY is_primary DESC LIMIT 1',
                    [property.id]
                );
                property.primary_image = images[0]?.url || null;

                // Get image count
                const [imageCount] = await db.execute(
                    'SELECT COUNT(*) as count FROM property_images WHERE property_id = ?',
                    [property.id]
                );
                property.image_count = imageCount[0]?.count || 0;
            }

            res.status(200).json({
                success: true,
                data: properties,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / parseInt(limit)),
                    limit: parseInt(limit)
                },
                filters: {
                    status,
                    property_type,
                    property_for,
                    search,
                    sortBy
                }
            });

        } catch (error) {
            console.error('Get owner properties error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching properties',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Update property
    static async update(id, ownerId, updateData) {
        try {
            // Check ownership
            const [property] = await db.execute(
                'SELECT id FROM properties WHERE id = ? AND owner_id = ?',
                [id, ownerId]
            );

            if (property.length === 0) return null;

            // Build update
            const updates = [];
            const values = [];

            Object.keys(updateData).forEach(key => {
                if (key !== 'amenities' && key !== 'images') {
                    updates.push(`${key} = ?`);
                    values.push(updateData[key]);
                }
            });

            if (updates.length === 0) {
                return await this.findById(id);
            }

            values.push(id);
            const query = `UPDATE properties SET ${updates.join(', ')} WHERE id = ?`;
            await db.execute(query, values);

            return await this.findById(id);
        } catch (error) {
            console.error('Error in update:', error);
            throw error;
        }
    }

    // Delete property (soft delete)
    static async delete(id, ownerId) {
        try {
            const [result] = await db.execute(
                'UPDATE properties SET is_active = 0 WHERE id = ? AND owner_id = ?',
                [id, ownerId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in delete:', error);
            throw error;
        }
    }

    // Increment views
    static async incrementViews(id) {
        try {
            await db.execute(
                'UPDATE properties SET views = views + 1 WHERE id = ?',
                [id]
            );
        } catch (error) {
            console.error('Error in incrementViews:', error);
        }
    }

    // Get owner stats
    static async getOwnerStats(ownerId) {
        try {
            const [stats] = await db.execute(
                `SELECT 
                    COUNT(*) as total_properties,
                    SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                    SUM(views) as total_views,
                    SUM(inquiries) as total_inquiries
                 FROM properties 
                 WHERE owner_id = ? AND is_active = 1`,
                [ownerId]
            );

            return stats[0] || {
                total_properties: 0,
                approved: 0,
                pending: 0,
                rejected: 0,
                total_views: 0,
                total_inquiries: 0
            };
        } catch (error) {
            console.error('Error in getOwnerStats:', error);
            throw error;
        }
    }

    // Add image
    static async addImage(propertyId, imageData) {
        const { url, caption = '', public_id = null, is_primary = false } = imageData;

        if (is_primary) {
            await db.execute(
                'UPDATE property_images SET is_primary = 0 WHERE property_id = ?',
                [propertyId]
            );
        }

        await db.execute(
            `INSERT INTO property_images 
             (property_id, url, caption, public_id, is_primary, is_cloudinary) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [propertyId, url, caption, public_id, is_primary ? 1 : 0, 1]
        );
    }
}

// ✅ Export करना न भूलें
module.exports = Property;