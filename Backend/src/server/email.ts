import express, { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import PocketBase from 'pocketbase';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const pb = new PocketBase(POCKETBASE_URL);

type SMTPConfig = {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    fromEmail: string;
    fromName: string;
};

// Test SMTP connection
router.post('/email/test-connection', async (req: Request, res: Response) => {
    try {
        const config = req.body as SMTPConfig;

        if (!config.host || !config.port || !config.user || !config.password) {
            return res.status(400).json({
                success: false,
                message: 'Missing SMTP configuration parameters'
            });
        }

        // Create a test transporter
        const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.user,
                pass: config.password,
            },
            connectionTimeout: 10000, // 10 seconds
        });

        // Verify connection
        await transporter.verify();

        return res.json({
            success: true,
            message: 'SMTP connection successful',
        });
    } catch (error: any) {
        console.error('SMTP connection test failed:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'SMTP connection failed',
        });
    }
});

// Send test email
router.post('/email/send-test', async (req: Request, res: Response) => {
    try {
        const { to, subject, html, config } = req.body as {
            to: string;
            subject: string;
            html: string;
            config: SMTPConfig;
        };

        if (!to || !subject || !html) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: to, subject, html',
            });
        }

        if (!config?.host || !config?.user || !config?.password) {
            return res.status(400).json({
                success: false,
                message: 'SMTP configuration is incomplete',
            });
        }

        // Create transporter with provided config
        const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.user,
                pass: config.password,
            },
        });

        // Send email
        const info = await transporter.sendMail({
            from: `"${config.fromName || 'Zenthra Shop'}" <${config.fromEmail || config.user}>`,
            to,
            subject,
            html,
        });

        return res.json({
            success: true,
            messageId: info.messageId,
            message: 'Email sent successfully',
        });
    } catch (error: any) {
        console.error('Failed to send test email:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to send email',
        });
    }
});

// Send email (used by automation engine)
router.post('/email/send', async (req: Request, res: Response) => {
    try {
        const { to, subject, html, config, orderId, templateName } = req.body as {
            to: string;
            subject: string;
            html: string;
            config: SMTPConfig;
            orderId?: string;
            templateName?: string;
        };

        if (!to || !subject || !html) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: to, subject, html',
            });
        }

        if (!config?.host || !config?.user || !config?.password) {
            return res.status(400).json({
                success: false,
                message: 'SMTP configuration is incomplete',
            });
        }

        // Create transporter with provided config
        const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.user,
                pass: config.password,
            },
        });

        // Send email
        const info = await transporter.sendMail({
            from: `"${config.fromName || 'Zenthra Shop'}" <${config.fromEmail || config.user}>`,
            to,
            subject,
            html,
        });

        // Log to email_activity collection
        try {
            await pb.collection('email_activity').create({
                recipient: to,
                subject,
                template_name: templateName || 'CUSTOM',
                status: 'sent',
                order_id: orderId,
                created: new Date().toISOString(),
            });
        } catch (logError) {
            console.warn('Failed to log email activity:', logError);
        }

        return res.json({
            success: true,
            messageId: info.messageId,
            message: 'Email sent successfully',
        });
    } catch (error: any) {
        console.error('Failed to send email:', error);

        // Log failed attempt
        try {
            const { to, subject, templateName, orderId } = req.body;
            await pb.collection('email_activity').create({
                recipient: to,
                subject,
                template_name: templateName || 'CUSTOM',
                status: 'failed',
                error_message: error.message,
                order_id: orderId,
                created: new Date().toISOString(),
            });
        } catch (logError) {
            console.warn('Failed to log email error:', logError);
        }

        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to send email',
        });
    }
});

// Send email from template
router.post('/email/send-template', async (req: Request, res: Response) => {
    try {
        const { to, templateName, variables, orderId } = req.body as {
            to: string;
            templateName: string;
            variables?: Record<string, any>;
            orderId?: string;
        };

        if (!to || !templateName) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: to, templateName',
            });
        }

        // Get template from email_templates collection
        const template = await pb.collection('email_templates').getFirstListItem(`name="${templateName}"`);

        if (!template || !template.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Template not found or inactive',
            });
        }

        // Get SMTP config from plugins
        const smtpPlugin = await pb.collection('plugins').getFirstListItem('key="smtp"');
        const smtpConfig = typeof smtpPlugin.config === 'string'
            ? JSON.parse(smtpPlugin.config)
            : smtpPlugin.config;

        if (!smtpConfig?.host || !smtpConfig?.user) {
            return res.status(500).json({
                success: false,
                message: 'SMTP not configured',
            });
        }

        // Replace variables in template
        let subject = template.subject || 'Notification';
        let htmlContent = template.htmlContent || '';

        if (variables) {
            Object.entries(variables).forEach(([key, value]) => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                subject = subject.replace(regex, String(value || ''));
                htmlContent = htmlContent.replace(regex, String(value || ''));
            });
        }

        // Create transporter
        const transporter = nodemailer.createTransport({
            host: smtpConfig.host,
            port: smtpConfig.port,
            secure: smtpConfig.secure,
            auth: {
                user: smtpConfig.user,
                pass: smtpConfig.password,
            },
        });

        // Add image if template has one
        let attachments = [];
        if (template.includeImage && template.imageUrl) {
            // You can optionally embed the image inline
            htmlContent = `<img src="${template.imageUrl}" alt="Header" style="max-width: 100%; height: auto;">` + htmlContent;
        }

        // Send email
        const info = await transporter.sendMail({
            from: `"${smtpConfig.fromName || 'Zenthra Shop'}" <${smtpConfig.fromEmail || smtpConfig.user}>`,
            to,
            subject,
            html: htmlContent,
            attachments,
        });

        // Log activity
        try {
            await pb.collection('email_activity').create({
                recipient: to,
                subject,
                template_name: templateName,
                status: 'sent',
                order_id: orderId,
                created: new Date().toISOString(),
            });
        } catch (logError) {
            console.warn('Failed to log email activity:', logError);
        }

        return res.json({
            success: true,
            messageId: info.messageId,
            message: 'Email sent successfully',
        });
    } catch (error: any) {
        console.error('Failed to send template email:', error);

        // Log failed attempt
        try {
            const { to, templateName, orderId } = req.body;
            await pb.collection('email_activity').create({
                recipient: to,
                subject: '',
                template_name: templateName,
                status: 'failed',
                error_message: error.message,
                order_id: orderId,
                created: new Date().toISOString(),
            });
        } catch (logError) {
            console.warn('Failed to log email error:', logError);
        }

        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to send email',
        });
    }
});

export default router;
