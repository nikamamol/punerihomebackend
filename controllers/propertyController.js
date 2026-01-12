const Property = require('../models/Property');
const { uploadToCloudinary, getOptimizedUrl } = require('../utils/cloudinary');
const db = require('../config/database');

class PropertyController {
    // Create new property with Cloudinary upload
    // PropertyController.js में createProperty function को SIMPLIFY करें:

    async createProperty(req, res) {
        try {
            console.log('=== CREATE PROPERTY START ===');
            const ownerId = req.user?.userId || 1;
            const data = req.body;
            
            console.log('Owner ID:', ownerId);
            console.log('Form data received:', {
                title: data.title,
                propertyType: data.propertyType,
                price: data.price,
                city: data.city
            });

            // Handle images
            const images = [];
            if (req.files?.images) {
                console.log('Processing images...');
                const uploadedFiles = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
                
                for (const file of uploadedFiles) {
                    try {
                        console.log('Uploading to Cloudinary:', file.originalname);
                        const uploadResult = await uploadToCloudinary(file, 'properties');
                        images.push({
                            url: uploadResult.url,
                            public_id: uploadResult.public_id,
                            format: uploadResult.format,
                            width: uploadResult.width,
                            height: uploadResult.height,
                            bytes: uploadResult.bytes
                        });
                        console.log('Image uploaded successfully');
                    } catch (error) {
                        console.error('Image upload error:', error);
                    }
                }
            }

            // Prepare property data
            const propertyData = {
                owner_id: ownerId,
                title: data.title,
                description: data.description,
                property_type: data.propertyType,
                property_for: data.property_for || 'Rent',
                address: data.address,
                city: data.city,
                state: data.state,
                pincode: data.pincode,
                locality: data.locality,
                landmark: data.landmark,
                bedrooms: data.bedrooms,
                bathrooms: data.bathrooms,
                total_floors: data.totalFloors,
                floor_number: data.floorNumber,
                built_up_area: data.area,
                price: data.price,
                currency: data.currency || 'INR',
                price_type: data.price_type || 'Monthly',
                maintenance_charge: data.maintenance,
                security_deposit: data.deposit,
                furnishing_status: data.furnishing,
                facing: data.facing,
                property_age: data.propertyAge,
                available_from: data.availableFrom,
                preferred_tenant_type: data.tenantType,
                additional_features: data.additionalFeatures,
                contact_person_name: data.contactPersonName,
                contact_person_phone: data.contactPersonPhone,
                contact_person_email: data.contactPersonEmail,
                contact_person_whatsapp: data.contactPersonWhatsapp,
                verification_agreement: data.verificationAgreement === 'true' || data.verificationAgreement === true,
                terms_agreement: data.termsAgreement === 'true' || data.termsAgreement === true,
                accuracy_agreement: data.accuracyAgreement === 'true' || data.accuracyAgreement === true,
                area_unit: data.areaUnit || 'sq ft',
                amenities: data.amenities ? JSON.parse(data.amenities) : [],
                images: images
            };

            console.log('Calling Property.create()...');
            console.log('Property data keys:', Object.keys(propertyData));
            
            // ✅ यहाँ Property.create call हो रहा है
            const property = await Property.create(propertyData);
            
            console.log('=== CREATE PROPERTY SUCCESS ===');
            
            res.status(201).json({
                success: true,
                message: 'Property created successfully',
                data: property
            });

        } catch (error) {
            console.error('=== CREATE PROPERTY ERROR ===');
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }

    async getAllProperties(req, res) {
        try {
            const { page = 1, limit = 12, sort = 'newest', type, city, minPrice, maxPrice } = req.query;
            
            let query = `
                SELECT p.*, 
                    u.name as owner_name,
                    (SELECT url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) as image_url
                FROM properties p
                LEFT JOIN users u ON p.owner_id = u.id
                WHERE p.status = 'approved' AND p.is_active = 1
            `;
            
            const values = [];
            
            // Apply filters
            if (type) {
                query += ' AND p.property_type = ?';
                values.push(type);
            }
            
            if (city) {
                query += ' AND p.city = ?';
                values.push(city);
            }
            
            if (minPrice) {
                query += ' AND p.price >= ?';
                values.push(parseInt(minPrice));
            }
            
            if (maxPrice) {
                query += ' AND p.price <= ?';
                values.push(parseInt(maxPrice));
            }
            
            // Apply sorting
            const sortOptions = {
                'newest': 'p.created_at DESC',
                'oldest': 'p.created_at ASC',
                'price-low': 'p.price ASC',
                'price-high': 'p.price DESC',
                'views': 'p.views DESC'
            };
            
            query += ` ORDER BY ${sortOptions[sort] || 'p.created_at DESC'}`;
            
            // Apply pagination
            const offset = (parseInt(page) - 1) * parseInt(limit);
            query += ' LIMIT ? OFFSET ?';
            values.push(parseInt(limit), offset);
            
            const [properties] = await db.execute(query, values);
            
            // Get total count for pagination
            let countQuery = 'SELECT COUNT(*) as total FROM properties WHERE status = ? AND is_active = ?';
            const countValues = ['approved', 1];
            
            const [countResult] = await db.execute(countQuery, countValues);
            const total = countResult[0].total;
            
            res.status(200).json({
                success: true,
                data: properties,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / parseInt(limit)),
                    limit: parseInt(limit)
                }
            });
            
        } catch (error) {
            console.error('Get all properties error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }
    
    // 2. Get property by ID (Public)
    async getPropertyById(req, res) {
        try {
            const { id } = req.params;
            
            // Get property details
            const [propertyRows] = await db.execute(
                `SELECT p.*, u.name as owner_name, u.phone as owner_phone 
                 FROM properties p
                 LEFT JOIN users u ON p.owner_id = u.id
                 WHERE p.id = ? AND p.status = 'approved' AND p.is_active = 1`,
                [id]
            );
            
            if (propertyRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Property not found'
                });
            }
            
            const property = propertyRows[0];
            
            // Get amenities
            const [amenities] = await db.execute(
                'SELECT amenity FROM property_amenities WHERE property_id = ?',
                [id]
            );
            property.amenities = amenities.map(a => a.amenity);
            
            // Get images
            const [images] = await db.execute(
                'SELECT id, url, caption, is_primary FROM property_images WHERE property_id = ? ORDER BY is_primary DESC',
                [id]
            );
            property.images = images;
            
            // Increment view count
            await db.execute(
                'UPDATE properties SET views = views + 1 WHERE id = ?',
                [id]
            );
            
            res.status(200).json({
                success: true,
                data: property
            });
            
        } catch (error) {
            console.error('Get property by ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }
    
    // 3. Search properties
    async searchProperties(req, res) {
        try {
            const { q, city, type, minPrice, maxPrice } = req.query;
            
            let query = `
                SELECT p.*, 
                    (SELECT url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) as image_url
                FROM properties p
                WHERE p.status = 'approved' AND p.is_active = 1
            `;
            
            const values = [];
            
            if (q) {
                query += ' AND (p.title LIKE ? OR p.description LIKE ? OR p.locality LIKE ? OR p.address LIKE ?)';
                const searchTerm = `%${q}%`;
                values.push(searchTerm, searchTerm, searchTerm, searchTerm);
            }
            
            if (city) {
                query += ' AND p.city = ?';
                values.push(city);
            }
            
            if (type) {
                query += ' AND p.property_type = ?';
                values.push(type);
            }
            
            if (minPrice) {
                query += ' AND p.price >= ?';
                values.push(parseInt(minPrice));
            }
            
            if (maxPrice) {
                query += ' AND p.price <= ?';
                values.push(parseInt(maxPrice));
            }
            
            query += ' ORDER BY p.created_at DESC LIMIT 20';
            
            const [properties] = await db.execute(query, values);
            
            res.status(200).json({
                success: true,
                data: properties
            });
            
        } catch (error) {
            console.error('Search properties error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }
    
    // 4. Filter properties
    async filterProperties(req, res) {
        try {
            const filters = req.query;
            
            let query = `
                SELECT p.*,
                    (SELECT url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) as image_url
                FROM properties p
                WHERE p.status = 'approved' AND p.is_active = 1
            `;
            
            const values = [];
            
            // Apply filters dynamically
            const filterConditions = {
                city: 'p.city = ?',
                state: 'p.state = ?',
                property_type: 'p.property_type = ?',
                property_for: 'p.property_for = ?',
                bedrooms: 'p.bedrooms = ?',
                furnishing_status: 'p.furnishing_status = ?',
                minPrice: 'p.price >= ?',
                maxPrice: 'p.price <= ?',
                minArea: 'p.built_up_area >= ?',
                maxArea: 'p.built_up_area <= ?'
            };
            
            Object.keys(filters).forEach(key => {
                if (filterConditions[key] && filters[key]) {
                    query += ` AND ${filterConditions[key]}`;
                    values.push(filters[key]);
                }
            });
            
            query += ' ORDER BY p.created_at DESC LIMIT 50';
            
            const [properties] = await db.execute(query, values);
            
            res.status(200).json({
                success: true,
                data: properties
            });
            
        } catch (error) {
            console.error('Filter properties error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }
    
    // 5. Get properties by city
    async getPropertiesByCity(req, res) {
        try {
            const { city } = req.params;
            const { limit = 10 } = req.query;
            
            const [properties] = await db.execute(
                `SELECT p.*, 
                    (SELECT url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) as image_url
                FROM properties p
                WHERE p.city = ? AND p.status = 'approved' AND p.is_active = 1
                ORDER BY p.created_at DESC
                LIMIT ?`,
                [city, parseInt(limit)]
            );
            
            res.status(200).json({
                success: true,
                data: properties
            });
            
        } catch (error) {
            console.error('Get properties by city error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }
    
    // 6. Get properties by type
    async getPropertiesByType(req, res) {
        try {
            const { type } = req.params;
            const { limit = 10 } = req.query;
            
            const [properties] = await db.execute(
                `SELECT p.*, 
                    (SELECT url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) as image_url
                FROM properties p
                WHERE p.property_type = ? AND p.status = 'approved' AND p.is_active = 1
                ORDER BY p.created_at DESC
                LIMIT ?`,
                [type, parseInt(limit)]
            );
            
            res.status(200).json({
                success: true,
                data: properties
            });
            
        } catch (error) {
            console.error('Get properties by type error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }
    
    // 7. Get featured properties
    async getFeaturedProperties(req, res) {
        try {
            const { limit = 6 } = req.query;
            
            const [properties] = await db.execute(
                `SELECT p.*, 
                    (SELECT url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) as image_url
                FROM properties p
                WHERE p.is_featured = 1 AND p.status = 'approved' AND p.is_active = 1
                ORDER BY p.created_at DESC
                LIMIT ?`,
                [parseInt(limit)]
            );
            
            res.status(200).json({
                success: true,
                data: properties
            });
            
        } catch (error) {
            console.error('Get featured properties error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }
    
    // 8. Get properties by owner (public view)
    async getPropertiesByOwnerPublic(req, res) {
        try {
            const { ownerId } = req.params;
            const { limit = 10 } = req.query;
            
            const [properties] = await db.execute(
                `SELECT p.*, 
                    (SELECT url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) as image_url
                FROM properties p
                WHERE p.owner_id = ? AND p.status = 'approved' AND p.is_active = 1
                ORDER BY p.created_at DESC
                LIMIT ?`,
                [ownerId, parseInt(limit)]
            );
            
            res.status(200).json({
                success: true,
                data: properties
            });
            
        } catch (error) {
            console.error('Get properties by owner error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }
    
    // =============== PROTECTED GET METHODS ===============
    
    // 9. Get owner's properties (already exists in your code)
    async getOwnerProperties(req, res) {
        try {
            const ownerId = req.user.userId;
            const filters = req.query;
            
            // Your existing code...
            
        } catch (error) {
            console.error('Get owner properties error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }
    
    // 10. Get property by ID (owner's view - already exists)
    async getProperty(req, res) {
        try {
            const { id } = req.params;
            const ownerId = req.user.userId;
            
            // Your existing code...
            
        } catch (error) {
            console.error('Get property error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }
    
    // 11. Get property statistics (already exists)
    async getPropertyStats(req, res) {
        try {
            const ownerId = req.user.userId;
            
            // Your existing code...
            
        } catch (error) {
            console.error('Get stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }
    
    // 12. Get analytics overview
    async getAnalyticsOverview(req, res) {
        try {
            const ownerId = req.user.userId;
            
            const [overview] = await db.execute(
                `SELECT 
                    COUNT(*) as total_properties,
                    SUM(views) as total_views,
                    SUM(inquiries) as total_inquiries,
                    AVG(price) as avg_price,
                    MIN(price) as min_price,
                    MAX(price) as max_price
                FROM properties 
                WHERE owner_id = ? AND is_active = 1`,
                [ownerId]
            );
            
            res.status(200).json({
                success: true,
                data: overview[0] || {}
            });
            
        } catch (error) {
            console.error('Get analytics error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }
    
    // =============== ADMIN GET METHODS ===============
    
    // 13. Get all properties (admin view)
    async getAllPropertiesAdmin(req, res) {
        try {
            const { status, page = 1, limit = 20 } = req.query;
            const offset = (page - 1) * limit;
            
            let query = `
                SELECT p.*, u.name as owner_name, u.email as owner_email
                FROM properties p
                LEFT JOIN users u ON p.owner_id = u.id
                WHERE p.is_active = 1
            `;
            
            const values = [];
            
            if (status) {
                query += ' AND p.status = ?';
                values.push(status);
            }
            
            query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
            values.push(parseInt(limit), offset);
            
            const [properties] = await db.execute(query, values);
            
            // Get total count
            let countQuery = 'SELECT COUNT(*) as total FROM properties WHERE is_active = 1';
            if (status) {
                countQuery += ' AND status = ?';
            }
            
            const [countResult] = await status ? 
                await db.execute(countQuery, [status]) : 
                await db.execute(countQuery);
            
            res.status(200).json({
                success: true,
                data: properties,
                pagination: {
                    total: countResult[0].total,
                    page: parseInt(page),
                    pages: Math.ceil(countResult[0].total / parseInt(limit)),
                    limit: parseInt(limit)
                }
            });
            
        } catch (error) {
            console.error('Get all properties admin error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }
    
    // 14. Get admin statistics
    async getAdminStats(req, res) {
        try {
            const [stats] = await db.execute(
                `SELECT 
                    COUNT(*) as total_properties,
                    SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                    SUM(CASE WHEN is_featured = 1 THEN 1 ELSE 0 END) as featured,
                    SUM(views) as total_views,
                    SUM(inquiries) as total_inquiries,
                    COUNT(DISTINCT owner_id) as total_owners
                FROM properties 
                WHERE is_active = 1`
            );
            
            res.status(200).json({
                success: true,
                data: stats[0] || {}
            });
            
        } catch (error) {
            console.error('Get admin stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }
    // Get owner properties
    async getOwnerProperties(req, res) {
        try {
            const ownerId = req.user.userId;
            const filters = {
                status: req.query.status,
                property_type: req.query.propertyType,
                search: req.query.search,
                sortBy: req.query.sortBy || 'newest',
                page: req.query.page || 1,
                limit: req.query.limit || 10
            };

            const result = await Property.findByOwner(ownerId, filters);

            res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('Get properties error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }

    // Get property by ID
    async getProperty(req, res) {
        try {
            const { id } = req.params;
            const ownerId = req.user.userId;

            const property = await Property.findById(id);

            if (!property) {
                return res.status(404).json({
                    success: false,
                    message: 'Property not found'
                });
            }

            // Check if user owns the property
            if (property.owner_id !== ownerId && req.user.userType !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized access'
                });
            }

            // Increment view count
            await Property.incrementViews(id);

            res.status(200).json({
                success: true,
                data: property
            });

        } catch (error) {
            console.error('Get property error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }

    // Update property
    async updateProperty(req, res) {
        try {
            const { id } = req.params;
            const ownerId = req.user.userId;
            const updateData = req.body;

            // Parse arrays if they are strings
            if (updateData.amenities && typeof updateData.amenities === 'string') {
                updateData.amenities = JSON.parse(updateData.amenities);
            }

            if (updateData.tags && typeof updateData.tags === 'string') {
                updateData.tags = JSON.parse(updateData.tags);
            }

            if (updateData.nearby_landmarks && typeof updateData.nearby_landmarks === 'string') {
                updateData.nearby_landmarks = JSON.parse(updateData.nearby_landmarks);
            }

            // Handle new image uploads to Cloudinary
            if (req.files && req.files.images) {
                const uploadedFiles = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
                const newImages = [];

                for (const file of uploadedFiles) {
                    try {
                        const uploadResult = await uploadToCloudinary(file, 'properties');

                        newImages.push({
                            url: uploadResult.url,
                            public_id: uploadResult.public_id,
                            format: uploadResult.format,
                            resource_type: uploadResult.resource_type,
                            width: uploadResult.width,
                            height: uploadResult.height,
                            bytes: uploadResult.bytes,
                            caption: '',
                            is_primary: false,
                            is_cloudinary: true
                        });
                    } catch (uploadError) {
                        console.error(`Error uploading image ${file.originalname}:`, uploadError);
                    }
                }

                // Add images to update data
                updateData.images = newImages;
            }

            // Handle video upload
            if (req.files && req.files.video) {
                const videoFile = Array.isArray(req.files.video) ? req.files.video[0] : req.files.video;

                try {
                    const uploadResult = await uploadToCloudinary(videoFile, 'properties/videos');

                    updateData.virtual_tour = JSON.stringify({
                        url: uploadResult.url,
                        public_id: uploadResult.public_id,
                        format: uploadResult.format,
                        resource_type: uploadResult.resource_type,
                        duration: uploadResult.duration,
                        bytes: uploadResult.bytes,
                        is_cloudinary: true
                    });
                } catch (uploadError) {
                    console.error(`Error uploading video ${videoFile.originalname}:`, uploadError);
                }
            }

            // Handle audio upload
            if (req.files && req.files.audio) {
                const audioFile = Array.isArray(req.files.audio) ? req.files.audio[0] : req.files.audio;

                try {
                    const uploadResult = await uploadToCloudinary(audioFile, 'properties/audio');

                    updateData.audio_description = JSON.stringify({
                        url: uploadResult.url,
                        public_id: uploadResult.public_id,
                        format: uploadResult.format,
                        resource_type: uploadResult.resource_type,
                        bytes: uploadResult.bytes,
                        is_cloudinary: true
                    });
                } catch (uploadError) {
                    console.error(`Error uploading audio ${audioFile.originalname}:`, uploadError);
                }
            }

            // Update property
            const property = await Property.update(id, ownerId, updateData);

            if (!property) {
                return res.status(404).json({
                    success: false,
                    message: 'Property not found or unauthorized'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Property updated successfully',
                data: property
            });

        } catch (error) {
            console.error('Update property error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Delete property
    async deleteProperty(req, res) {
        try {
            const { id } = req.params;
            const ownerId = req.user.userId;

            const deleted = await Property.delete(id, ownerId);

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    message: 'Property not found or unauthorized'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Property deleted successfully'
            });

        } catch (error) {
            console.error('Delete property error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }

    // Get property statistics
    async getPropertyStats(req, res) {
        try {
            const ownerId = req.user.userId;

            const stats = await Property.getOwnerStats(ownerId);

            res.status(200).json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('Get stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }

    // Upload single image
    async uploadImage(req, res) {
        try {
            const { id } = req.params;
            const ownerId = req.user.userId;
            const { caption = '', isPrimary = false } = req.body;

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            // Check if property belongs to user
            const [property] = await db.execute(
                'SELECT id FROM properties WHERE id = ? AND owner_id = ?',
                [id, ownerId]
            );

            if (property.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Property not found or unauthorized'
                });
            }

            // Upload to Cloudinary
            const uploadResult = await uploadToCloudinary(req.file, 'properties');

            // Save to database
            const imageData = {
                url: uploadResult.url,
                public_id: uploadResult.public_id,
                format: uploadResult.format,
                resource_type: uploadResult.resource_type,
                width: uploadResult.width,
                height: uploadResult.height,
                bytes: uploadResult.bytes,
                caption: caption,
                is_primary: isPrimary === true || isPrimary === 'true',
                is_cloudinary: true
            };

            // Add image to property
            await Property.addImage(id, imageData);

            res.status(200).json({
                success: true,
                message: 'Image uploaded successfully',
                data: imageData
            });

        } catch (error) {
            console.error('Upload image error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Delete property image
    async deleteImage(req, res) {
        try {
            const { id, imageId } = req.params;
            const ownerId = req.user.userId;

            // Check if property belongs to user
            const [property] = await db.execute(
                'SELECT id FROM properties WHERE id = ? AND owner_id = ?',
                [id, ownerId]
            );

            if (property.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Property not found or unauthorized'
                });
            }

            // Get image details before deleting
            const [image] = await db.execute(
                'SELECT url, public_id, resource_type FROM property_images WHERE id = ? AND property_id = ?',
                [imageId, id]
            );

            if (image.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Image not found'
                });
            }

            // Delete from Cloudinary if it's a Cloudinary image
            if (image[0].public_id) {
                const { deleteFromCloudinary, deleteVideoFromCloudinary } = require('../utils/cloudinary');

                if (image[0].resource_type === 'video') {
                    await deleteVideoFromCloudinary(image[0].public_id);
                } else {
                    await deleteFromCloudinary(image[0].public_id);
                }
            }

            // Delete from database
            await db.execute(
                'DELETE FROM property_images WHERE id = ? AND property_id = ?',
                [imageId, id]
            );

            res.status(200).json({
                success: true,
                message: 'Image deleted successfully'
            });

        } catch (error) {
            console.error('Delete image error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

module.exports = new PropertyController();