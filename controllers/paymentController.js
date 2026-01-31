const db = require('../config/database');
const crypto = require('crypto');
require('dotenv').config();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

class PaymentController {
    // 1. Create Razorpay Order
    async createOrder(req, res) {
        try {
            const userId = req.user.id;
            const { planType, credits, basePrice, validityDays } = req.body;

            console.log('Creating order for user:', userId, req.body);

            // Validate input
            if (!planType || !credits || !basePrice) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }

            // Calculate GST and total
            const gstPercentage = 18;
            const gstAmount = (basePrice * gstPercentage) / 100;
            const totalAmount = Math.round(basePrice + gstAmount);

            // Create expiry date
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + (validityDays || 30));

            // If Razorpay credentials are not set, return demo mode
            if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
                console.log('Using demo mode for payment');

                // Create demo order
                const demoOrderId = `demo_ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // Save payment record in database
                await db.execute(
                    `INSERT INTO payments 
                     (user_id, payment_id, order_id, signature, plan_type, credits, amount, 
                      base_price, gst_amount, gst_percentage, validity_days, expires_at, 
                      status, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
                    [
                        userId,
                        `demo_pay_${Date.now()}`,
                        demoOrderId,
                        'demo_signature',
                        planType,
                        credits,
                        totalAmount,
                        basePrice,
                        gstAmount,
                        gstPercentage,
                        validityDays || 30,
                        expiresAt
                    ]
                );

                return res.status(200).json({
                    success: true,
                    data: {
                        id: demoOrderId,
                        amount: totalAmount * 100, // Razorpay expects amount in paise
                        currency: 'INR',
                        demoMode: true,
                        key: 'rzp_test_demo_key',
                        orderId: demoOrderId,
                        userId: userId,
                        credits: credits,
                        planType: planType,
                        totalAmount: totalAmount
                    }
                });
            }

            // Real Razorpay Integration
            const Razorpay = require('razorpay');
            const razorpay = new Razorpay({
                key_id: RAZORPAY_KEY_ID,
                key_secret: RAZORPAY_KEY_SECRET
            });

            const options = {
                amount: totalAmount * 100, // amount in paise
                currency: 'INR',
                receipt: `receipt_${Date.now()}`,
                notes: {
                    userId: userId.toString(),
                    planType: planType,
                    credits: credits.toString(),
                    basePrice: basePrice.toString(),
                    validityDays: (validityDays || 30).toString()
                }
            };

            console.log('Creating Razorpay order with options:', options);

            const order = await razorpay.orders.create(options);

            // Save payment record in database
            const [result] = await db.execute(
                `INSERT INTO payments 
                 (user_id, payment_id, order_id, signature, plan_type, credits, amount, 
                  base_price, gst_amount, gst_percentage, validity_days, expires_at, 
                  razorpay_order_id, status, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
                [
                    userId,
                    `pay_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                    order.id,
                    '', // signature will be updated after verification
                    planType,
                    credits,
                    totalAmount,
                    basePrice,
                    gstAmount,
                    gstPercentage,
                    validityDays || 30,
                    expiresAt,
                    order.id
                ]
            );

            console.log('Order created successfully:', order.id);

            res.status(200).json({
                success: true,
                data: {
                    id: order.id,
                    amount: order.amount,
                    currency: order.currency,
                    demoMode: false,
                    key: RAZORPAY_KEY_ID,
                    orderId: order.id,
                    userId: userId,
                    credits: credits,
                    planType: planType,
                    totalAmount: totalAmount
                }
            });

        } catch (error) {
            console.error('Create order error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create order',
                error: error.message
            });
        }
    }

    async addCreditsToUser(userId, credits, validityDays, paymentId) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            console.log('Adding credits to user:', { userId, credits, validityDays });

            // Get current user credits
            const [users] = await connection.execute(
                'SELECT credits, credit_expiry FROM users WHERE id = ?',
                [userId]
            );

            let currentUser = users[0];
            let newCredits = credits;
            let newExpiry = new Date();
            newExpiry.setDate(newExpiry.getDate() + validityDays);

            // If user already has credits, add to existing
            if (currentUser.credits > 0 && currentUser.credit_expiry && new Date(currentUser.credit_expiry) > new Date()) {
                newCredits = currentUser.credits + credits;
                // Keep whichever expiry is later
                if (new Date(currentUser.credit_expiry) > newExpiry) {
                    newExpiry = currentUser.credit_expiry;
                }
            }

            // Update user credits
            await connection.execute(
                `UPDATE users SET 
                 credits = ?,
                 credit_expiry = ?,
                 active_credits = ?,
                 total_purchased_credits = total_purchased_credits + ?,
                 updated_at = NOW()
                 WHERE id = ?`,
                [newCredits, newExpiry, newCredits, credits, userId]
            );

            // Create credit transaction record
            await connection.execute(
                `INSERT INTO credit_transactions 
                 (user_id, transaction_type, credits, balance_after, 
                  payment_id, description, expires_at, created_at) 
                 VALUES (?, 'purchase', ?, ?, ?, ?, ?, NOW())`,
                [
                    userId,
                    credits,
                    newCredits,
                    paymentId,
                    `Purchased ${credits} credits via payment #${paymentId}`,
                    newExpiry
                ]
            );

            // Update payment record
            await connection.execute(
                'UPDATE payments SET status = "completed" WHERE id = ?',
                [paymentId]
            );

            await connection.commit();

            console.log('Credits added successfully to user:', userId);

        } catch (error) {
            await connection.rollback();
            console.error('Error adding credits:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // 2. Verify Payment
    // 2. Verify Payment
    async verifyPayment(req, res) {
        try {
            const userId = req.user.id;
            const { order_id, payment_id, signature, planType, credits } = req.body;

            console.log('Verifying payment for user:', userId, req.body);

            // Find the payment record
            const [payments] = await db.execute(
                'SELECT * FROM payments WHERE razorpay_order_id = ? AND user_id = ?',
                [order_id, userId]
            );

            if (payments.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment record not found'
                });
            }

            const payment = payments[0];

            // Verify signature for real payments
            const body = order_id + "|" + payment_id;
            const expectedSignature = crypto
                .createHmac('sha256', RAZORPAY_KEY_SECRET)
                .update(body.toString())
                .digest('hex');

            const isSignatureValid = expectedSignature === signature;

            console.log('Signature verification:', {
                expected: expectedSignature.substring(0, 20) + '...',
                received: signature.substring(0, 20) + '...',
                isValid: isSignatureValid
            });

            if (!isSignatureValid) {
                // Update payment status to failed
                await db.execute(
                    `UPDATE payments SET 
                 status = 'failed',
                 razorpay_payment_id = ?,
                 razorpay_signature = ?,
                 updated_at = NOW()
                 WHERE id = ?`,
                    [payment_id, signature, payment.id]
                );

                return res.status(400).json({
                    success: false,
                    message: 'Payment verification failed - Invalid signature'
                });
            }

            // Update payment status to completed
            await db.execute(
                `UPDATE payments SET 
             status = 'completed',
             razorpay_payment_id = ?,
             razorpay_signature = ?,
             updated_at = NOW()
             WHERE id = ?`,
                [payment_id, signature, payment.id]
            );

            // ================ INLINE CREDIT ADDING CODE ================
            const connection = await db.getConnection();

            try {
                await connection.beginTransaction();

                console.log('Adding credits to user:', { userId, credits: payment.credits, validityDays: payment.validity_days });

                // Get current user credits
                const [users] = await connection.execute(
                    'SELECT credits, credit_expiry FROM users WHERE id = ?',
                    [userId]
                );

                let currentUser = users[0];
                let newCredits = payment.credits;
                let newExpiry = new Date();
                newExpiry.setDate(newExpiry.getDate() + payment.validity_days);

                // If user already has credits, add to existing
                if (currentUser.credits > 0 && currentUser.credit_expiry && new Date(currentUser.credit_expiry) > new Date()) {
                    newCredits = currentUser.credits + payment.credits;
                    // Keep whichever expiry is later
                    if (new Date(currentUser.credit_expiry) > newExpiry) {
                        newExpiry = currentUser.credit_expiry;
                    }
                }

                // Update user credits
                await connection.execute(
                    `UPDATE users SET 
                 credits = ?,
                 credit_expiry = ?,
                 active_credits = ?,
                 total_purchased_credits = total_purchased_credits + ?,
                 updated_at = NOW()
                 WHERE id = ?`,
                    [newCredits, newExpiry, newCredits, payment.credits, userId]
                );

                // Create credit transaction record
                await connection.execute(
                    `INSERT INTO credit_transactions 
                 (user_id, transaction_type, credits, balance_after, 
                  payment_id, description, expires_at, created_at) 
                 VALUES (?, 'purchase', ?, ?, ?, ?, ?, NOW())`,
                    [
                        userId,
                        payment.credits,
                        newCredits,
                        payment.id,
                        `Purchased ${payment.credits} credits via payment #${payment.id}`,
                        newExpiry
                    ]
                );

                // Update payment record status to completed
                await connection.execute(
                    'UPDATE payments SET status = "completed" WHERE id = ?',
                    [payment.id]
                );

                await connection.commit();

                console.log('Credits added successfully to user:', userId);

            } catch (error) {
                await connection.rollback();
                console.error('Error adding credits:', error);
                throw error;
            } finally {
                connection.release();
            }
            // ================ END INLINE CODE ================

            console.log('Payment verified successfully for user:', userId);

            res.status(200).json({
                success: true,
                message: 'Payment verified successfully',
                data: {
                    paymentId: payment_id,
                    credits: payment.credits,
                    amount: payment.amount,
                    expiresAt: payment.expires_at
                }
            });

        } catch (error) {
            console.error('Verify payment error:', error);
            res.status(500).json({
                success: false,
                message: 'Payment verification failed',
                error: error.message
            });
        }
    }

    // 3. Add credits to user


    // 4. Get Payment History
    async getPaymentHistory(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 10 } = req.query;
            const offset = (page - 1) * limit;

            console.log('Getting payment history for user:', userId);

            const [payments] = await db.execute(
                `SELECT * FROM payments 
                 WHERE user_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT ? OFFSET ?`,
                [userId, parseInt(limit), offset]
            );

            const [totalCount] = await db.execute(
                'SELECT COUNT(*) as count FROM payments WHERE user_id = ?',
                [userId]
            );

            res.status(200).json({
                success: true,
                data: {
                    payments: payments,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(totalCount[0].count / limit),
                        totalItems: totalCount[0].count,
                        itemsPerPage: parseInt(limit)
                    }
                }
            });

        } catch (error) {
            console.error('Get payment history error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch payment history'
            });
        }
    }

    // 5. Use Credit for Property Contact
    // 5. Use Credit for Property Contact
    // 5. Use Credit for Property Contact
    async useCredit(req, res) {
        try {
            const userId = req.user.id;
            const { propertyId } = req.body;

            console.log('Using credit for property:', { userId, propertyId });

            // Handle if propertyId comes as an object (nested)
            let actualPropertyId = propertyId;
            if (propertyId && typeof propertyId === 'object' && propertyId.propertyId) {
                actualPropertyId = propertyId.propertyId;
                console.log('Extracted propertyId from object:', actualPropertyId);
            }

            if (!actualPropertyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Property ID is required'
                });
            }

            // Convert to integer if it's a string
            const propertyIdInt = parseInt(actualPropertyId);
            if (isNaN(propertyIdInt)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid Property ID format'
                });
            }

            const connection = await db.getConnection();

            try {
                await connection.beginTransaction();

                // Check user has valid credits
                const [users] = await connection.execute(
                    `SELECT credits, credit_expiry FROM users 
                 WHERE id = ? AND credits > 0 
                 AND (credit_expiry IS NULL OR credit_expiry > NOW()) 
                 FOR UPDATE`,
                    [userId]
                );

                if (users.length === 0) {
                    await connection.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'No valid credits available. Please purchase credits first.'
                    });
                }

                const user = users[0];
                const newBalance = user.credits - 1;

                if (newBalance < 0) {
                    await connection.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'Insufficient credits'
                    });
                }

                // Deduct credit
                await connection.execute(
                    `UPDATE users SET 
                 credits = ?,
                 total_used_credits = total_used_credits + 1,
                 updated_at = NOW()
                 WHERE id = ?`,
                    [newBalance, userId]
                );

                // Record transaction
                const [transactionResult] = await connection.execute(
                    `INSERT INTO credit_transactions 
                 (user_id, transaction_type, credits, balance_after, 
                  property_id, description, created_at) 
                 VALUES (?, 'used', -1, ?, ?, ?, NOW())`,
                    [
                        userId,
                        newBalance,
                        propertyIdInt,
                        `Used 1 credit to view property #${propertyIdInt} contact`
                    ]
                );

                // Get property contact details - UPDATED COLUMN NAMES
                const [properties] = await connection.execute(
                    'SELECT contact_person_name, contact_person_phone, contact_person_email, contact_person_whatsapp FROM properties WHERE id = ?',
                    [propertyIdInt]
                );

                if (properties.length === 0) {
                    await connection.rollback();
                    return res.status(404).json({
                        success: false,
                        message: 'Property not found'
                    });
                }

                const property = properties[0];

                // Check if user has already viewed this property
                const [existingViews] = await connection.execute(
                    'SELECT id FROM credit_transactions WHERE user_id = ? AND property_id = ? AND transaction_type = "used"',
                    [userId, propertyIdInt]
                );

                await connection.commit();

                res.status(200).json({
                    success: true,
                    data: {
                        contactDetails: {
                            name: property.contact_person_name,
                            phone: property.contact_person_phone,
                            email: property.contact_person_email,
                            whatsapp: property.contact_person_whatsapp
                        },
                        remainingCredits: newBalance,
                        firstTimeView: existingViews.length === 0,
                        message: 'Contact details unlocked successfully'
                    }
                });

                console.log('Credit used successfully by user:', userId);

            } catch (error) {
                await connection.rollback();
                console.error('Error in useCredit transaction:', error);

                // More detailed error logging
                console.error('Error details:', {
                    code: error.code,
                    errno: error.errno,
                    sqlMessage: error.sqlMessage,
                    sql: error.sql
                });

                throw error;
            } finally {
                connection.release();
            }

        } catch (error) {
            console.error('Use credit error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to use credit',
                error: error.message,
                sqlMessage: error.sqlMessage || null
            });
        }
    }
    // 6. Get Credit Balance
    async getCreditBalance(req, res) {
        try {
            const userId = req.user.id;

            console.log('Getting credit balance for user:', userId);

            const [users] = await db.execute(
                `SELECT 
                 credits,
                 credit_expiry,
                 active_credits,
                 total_purchased_credits,
                 total_used_credits,
                 default_plan
                 FROM users WHERE id = ?`,
                [userId]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const user = users[0];

            // Get recent transactions
            const [transactions] = await db.execute(
                `SELECT * FROM credit_transactions 
                 WHERE user_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT 10`,
                [userId]
            );

            // Check if credits are expired
            let validCredits = user.credits;
            let isExpired = false;

            if (user.credit_expiry && new Date(user.credit_expiry) < new Date()) {
                validCredits = 0;
                isExpired = true;
            }

            // Get upcoming expiry
            let expiryInfo = null;
            if (user.credit_expiry) {
                const expiryDate = new Date(user.credit_expiry);
                const now = new Date();
                const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

                expiryInfo = {
                    date: expiryDate,
                    daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
                    isExpired: daysRemaining <= 0
                };
            }

            res.status(200).json({
                success: true,
                data: {
                    balance: validCredits,
                    creditExpiry: user.credit_expiry,
                    expiryInfo: expiryInfo,
                    activeCredits: user.active_credits,
                    totalPurchased: user.total_purchased_credits,
                    totalUsed: user.total_used_credits,
                    defaultPlan: user.default_plan,
                    recentTransactions: transactions,
                    isExpired: isExpired
                }
            });

        } catch (error) {
            console.error('Get credit balance error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch credit balance'
            });
        }
    }

    // 7. Handle Payment Webhook (for Razorpay)
    async handleWebhook(req, res) {
        try {
            const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
            const signature = req.headers['x-razorpay-signature'];

            console.log('Webhook received:', req.body.event);

            // If no webhook secret, skip signature verification for testing
            if (!secret) {
                console.log('No webhook secret configured, skipping signature verification');
                // Still process the webhook for demo/testing
                await this.processWebhookEvent(req.body);
                return res.status(200).json({ success: true });
            }

            if (!signature) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing webhook signature'
                });
            }

            const body = JSON.stringify(req.body);
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(body)
                .digest('hex');

            if (expectedSignature !== signature) {
                console.error('Invalid webhook signature:', {
                    expected: expectedSignature.substring(0, 20) + '...',
                    received: signature.substring(0, 20) + '...'
                });
                return res.status(400).json({
                    success: false,
                    message: 'Invalid webhook signature'
                });
            }

            await this.processWebhookEvent(req.body);

            res.status(200).json({ success: true });

        } catch (error) {
            console.error('Webhook error:', error);
            res.status(500).json({
                success: false,
                message: 'Webhook processing failed'
            });
        }
    }

    async processWebhookEvent(webhookData) {
        const event = webhookData.event;
        const payment = webhookData.payload.payment.entity;

        console.log('Processing webhook event:', event, payment.id);

        switch (event) {
            case 'payment.captured':
                await this.handlePaymentCaptured(payment);
                break;
            case 'payment.failed':
                await this.handlePaymentFailed(payment);
                break;
            case 'refund.created':
                await this.handleRefundCreated(payment);
                break;
            default:
                console.log('Unhandled webhook event:', event);
        }
    }

    async handlePaymentCaptured(payment) {
        try {
            console.log('Payment captured:', payment.id);

            // Find payment by Razorpay order ID
            const [payments] = await db.execute(
                'SELECT * FROM payments WHERE razorpay_order_id = ?',
                [payment.order_id]
            );

            if (payments.length === 0) {
                console.error('Payment not found for order:', payment.order_id);
                return;
            }

            const paymentRecord = payments[0];

            // Update payment status
            await db.execute(
                `UPDATE payments SET 
                 status = 'completed',
                 razorpay_payment_id = ?,
                 payment_method = ?,
                 payment_details = ?,
                 updated_at = NOW()
                 WHERE id = ?`,
                [
                    payment.id,
                    payment.method,
                    JSON.stringify(payment),
                    paymentRecord.id
                ]
            );

            // Add credits to user
            await this.addCreditsToUser(
                paymentRecord.user_id,
                paymentRecord.credits,
                paymentRecord.validity_days,
                paymentRecord.id
            );

            console.log('Payment processed successfully via webhook:', payment.id);

        } catch (error) {
            console.error('Handle payment captured error:', error);
        }
    }

    async handlePaymentFailed(payment) {
        console.log('Payment failed:', payment.id);

        await db.execute(
            `UPDATE payments SET 
             status = 'failed',
             razorpay_payment_id = ?,
             updated_at = NOW()
             WHERE razorpay_order_id = ?`,
            [payment.id, payment.order_id]
        );
    }

    async handleRefundCreated(payment) {
        console.log('Refund created for payment:', payment.id);

        // Handle refund logic here
        // You might want to deduct credits from user
    }
}

module.exports = new PaymentController();