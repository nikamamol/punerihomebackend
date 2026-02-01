const Support = require('../models/Support');

class SupportController {
    // Create new support ticket
    async createTicket(req, res) {
        try {
            const { name, email, phone, message } = req.body;

            // No validation - as per your requirement
            const ticketData = {
                name: name,
                email: email,
                phone: phone || '', // Add phone (optional)
                message: message
            };

            const ticket = await Support.create(ticketData);

            res.status(201).json({
                success: true,
                message: 'Support ticket submitted successfully',
                data: {
                    ticketId: ticket.id,
                    name: ticket.name,
                    email: ticket.email,
                    phone: ticket.phone, // Include phone in response
                    status: ticket.status,
                    submittedAt: ticket.created_at
                }
            });

        } catch (error) {
            console.error('Create support ticket error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while creating support ticket'
            });
        }
    }

    // Get all support tickets (Admin only)
    async getAllTickets(req, res) {
        try {
            const { page = 1, limit = 20 } = req.query;
            const offset = (page - 1) * limit;

            const tickets = await Support.getAll(parseInt(limit), parseInt(offset));

            res.status(200).json({
                success: true,
                count: tickets.length,
                data: tickets
            });

        } catch (error) {
            console.error('Get all support tickets error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching tickets'
            });
        }
    }

    // Get ticket by ID (Admin only)
    async getTicketById(req, res) {
        try {
            const { id } = req.params;

            const ticket = await Support.getById(id);

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: 'Ticket not found'
                });
            }

            res.status(200).json({
                success: true,
                data: ticket
            });

        } catch (error) {
            console.error('Get ticket by ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching ticket'
            });
        }
    }

    // Update ticket status (Admin only)
    async updateTicketStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            const updated = await Support.updateStatus(id, status);

            if (!updated) {
                return res.status(404).json({
                    success: false,
                    message: 'Ticket not found'
                });
            }

            res.status(200).json({
                success: true,
                message: `Ticket marked as ${status}`
            });

        } catch (error) {
            console.error('Update ticket status error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while updating ticket status'
            });
        }
    }
}

module.exports = new SupportController();