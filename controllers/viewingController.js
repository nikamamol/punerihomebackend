const Viewing = require('../models/Viewing');

class ViewingController {
    // Create new viewing request
    async createViewingRequest(req, res) {
        try {
            const {
                preferred_date,
                preferred_time,
                property_type,
                location,
                name,
                phone,
                property_link
            } = req.body;

            const viewingData = {
                preferred_date: preferred_date || null,
                preferred_time: preferred_time || null,
                property_type: property_type || '',
                location: location || '',
                name: name || '',
                phone: phone || '',
                property_link: property_link || ''
            };

            const viewing = await Viewing.create(viewingData);

            // In real scenario, you would send SMS/Email here
            console.log('New viewing request created:', {
                id: viewing.id,
                name: viewing.name,
                phone: viewing.phone,
                date: viewing.preferred_date,
                time: viewing.preferred_time
            });

            res.status(201).json({
                success: true,
                message: 'Viewing scheduled successfully! We will confirm your appointment within 2 hours.',
                data: {
                    requestId: viewing.id,
                    name: viewing.name,
                    phone: viewing.phone,
                    date: viewing.preferred_date,
                    time: viewing.preferred_time,
                    status: viewing.status,
                    submittedAt: viewing.created_at
                }
            });

        } catch (error) {
            console.error('Create viewing request error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while scheduling viewing'
            });
        }
    }

    // Get all viewing requests (Admin/Owner only)
    async getAllViewingRequests(req, res) {
        try {
            const { page = 1, limit = 20 } = req.query;
            const offset = (page - 1) * limit;

            const requests = await Viewing.getAll(parseInt(limit), parseInt(offset));

            res.status(200).json({
                success: true,
                count: requests.length,
                data: requests
            });

        } catch (error) {
            console.error('Get all viewing requests error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching viewing requests'
            });
        }
    }

    // Get viewing request by ID (Admin/Owner only)
    async getViewingRequestById(req, res) {
        try {
            const { id } = req.params;

            const request = await Viewing.getById(id);

            if (!request) {
                return res.status(404).json({
                    success: false,
                    message: 'Viewing request not found'
                });
            }

            res.status(200).json({
                success: true,
                data: request
            });

        } catch (error) {
            console.error('Get viewing request by ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching viewing request'
            });
        }
    }

    // Update viewing request status (Admin/Owner only)
    async updateViewingStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            const updated = await Viewing.updateStatus(id, status);

            if (!updated) {
                return res.status(404).json({
                    success: false,
                    message: 'Viewing request not found'
                });
            }

            res.status(200).json({
                success: true,
                message: `Viewing request marked as ${status}`
            });

        } catch (error) {
            console.error('Update viewing status error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while updating viewing status'
            });
        }
    }

    // Get user's viewing requests by phone
    async getUserViewingRequests(req, res) {
        try {
            const { phone } = req.params;

            const requests = await Viewing.getByPhone(phone);

            res.status(200).json({
                success: true,
                count: requests.length,
                data: requests
            });

        } catch (error) {
            console.error('Get user viewing requests error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching user viewing requests'
            });
        }
    }
}

module.exports = new ViewingController();