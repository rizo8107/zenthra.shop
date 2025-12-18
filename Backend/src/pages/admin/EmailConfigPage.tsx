import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { pb } from '@/lib/pocketbase';
import {
    Mail,
    RefreshCw,
    Save,
    CheckCircle,
    XCircle,
    Loader2,
    Send,
    Edit,
    Plus,
    Trash2,
    Copy,
    Eye,
    Settings,
    Zap,
    FileText,
    X,
    Check,
    Info,
    Activity,
    Clock,
    AlertCircle,
    Image as ImageIcon,
    Video,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { getContentItems, uploadImage, getContentImageUrl, type ContentItem } from '@/lib/content-service';

// SMTP config interface
interface SMTPConfig {
    host: string;
    port: number;
    secure: boolean; // true for 465, false for other ports
    user: string;
    password: string;
    fromEmail: string;
    fromName: string;
}

// Connection state
interface ConnectionState {
    status: 'connected' | 'disconnected' | 'checking' | 'unknown';
    message?: string;
}

// Email template interface
interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    htmlContent: string;
    textContent?: string;
    description?: string;
    isActive: boolean;
    requiresAdditionalInfo: boolean;
    additionalInfoLabel?: string;
    additionalInfoPlaceholder?: string;
    includeImage: boolean;
    imageUrl?: string;
    created: string;
    updated: string;
}

// Order event types for templates
const ORDER_EVENTS = [
    { value: 'ORDER_CONFIRMATION', label: 'Order Confirmation', description: 'When order is placed' },
    { value: 'PAYMENT_SUCCESS', label: 'Payment Success', description: 'When payment is received' },
    { value: 'PAYMENT_FAILED', label: 'Payment Failed', description: 'When payment fails' },
    { value: 'ORDER_SHIPPED', label: 'Order Shipped', description: 'When order is shipped' },
    { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', description: 'When order is out for delivery' },
    { value: 'ORDER_DELIVERED', label: 'Order Delivered', description: 'When order is delivered' },
    { value: 'ORDER_CANCELLED', label: 'Order Cancelled', description: 'When order is cancelled' },
    { value: 'REFUND_CONFIRMATION', label: 'Refund Processed', description: 'When refund is processed' },
    { value: 'ABANDONED_CART', label: 'Abandoned Cart', description: 'Cart reminder email' },
    { value: 'WELCOME_EMAIL', label: 'Welcome Email', description: 'New customer welcome' },
    { value: 'PASSWORD_RESET', label: 'Password Reset', description: 'Password reset link' },
    { value: 'REVIEW_REQUEST', label: 'Review Request', description: 'Request product review' },
];

// Template variables
const TEMPLATE_VARIABLES = [
    { key: '{{customerName}}', description: 'Customer name' },
    { key: '{{customerEmail}}', description: 'Customer email' },
    { key: '{{orderId}}', description: 'Order ID' },
    { key: '{{amount}}', description: 'Order amount' },
    { key: '{{firstProductName}}', description: 'First product name in the order' },
    { key: '{{productList}}', description: 'List of product names' },
    { key: '{{itemsCount}}', description: 'Number of items' },
    { key: '{{firstProductImageUrl}}', description: 'First product image URL' },
    { key: '{{shippingAddress}}', description: 'Shipping address' },
    { key: '{{trackingLink}}', description: 'Tracking URL' },
    { key: '{{carrier}}', description: 'Shipping carrier' },
    { key: '{{estimatedDelivery}}', description: 'Estimated delivery date' },
    { key: '{{feedbackLink}}', description: 'Feedback/Review link' },
    { key: '{{retryUrl}}', description: 'Payment retry URL' },
    { key: '{{refundAmount}}', description: 'Refund amount' },
    { key: '{{cartUrl}}', description: 'Cart URL' },
    { key: '{{storeName}}', description: 'Store name' },
    { key: '{{supportEmail}}', description: 'Support email' },
    { key: '{{currentYear}}', description: 'Current year' },
];

const TEMPLATE_VARIABLE_GROUPS = [
    {
        label: 'Customer',
        keys: ['{{customerName}}', '{{customerEmail}}'],
    },
    {
        label: 'Order & Products',
        keys: ['{{orderId}}', '{{amount}}', '{{firstProductName}}', '{{productList}}', '{{itemsCount}}', '{{firstProductImageUrl}}'],
    },
    {
        label: 'Shipping & Links',
        keys: ['{{shippingAddress}}', '{{trackingLink}}', '{{carrier}}', '{{estimatedDelivery}}', '{{feedbackLink}}', '{{retryUrl}}', '{{refundAmount}}', '{{cartUrl}}'],
    },
    {
        label: 'Store Info',
        keys: ['{{storeName}}', '{{supportEmail}}', '{{currentYear}}'],
    },
].map(group => ({
    label: group.label,
    items: group.keys
        .map(key => TEMPLATE_VARIABLES.find(v => v.key === key))
        .filter((v): v is { key: string; description: string } => Boolean(v)),
}));

export default function EmailConfigPage() {
    const { toast } = useToast();

    // SMTP config state
    const [config, setConfig] = useState<SMTPConfig>({
        host: '',
        port: 587,
        secure: false,
        user: '',
        password: '',
        fromEmail: '',
        fromName: '',
    });
    const [saving, setSaving] = useState(false);
    const [loadingConfig, setLoadingConfig] = useState(true);

    // Connection state
    const [connectionState, setConnectionState] = useState<ConnectionState>({ status: 'unknown' });
    const [checkingConnection, setCheckingConnection] = useState(false);

    // Templates state
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    const [newTemplateForm, setNewTemplateForm] = useState({
        name: '',
        subject: '',
        htmlContent: '',
        textContent: '',
        description: '',
        isActive: true,
        requiresAdditionalInfo: false,
        additionalInfoLabel: '',
        additionalInfoPlaceholder: '',
        includeImage: false,
        imageUrl: '',
    });

    // Test email state
    const [testEmail, setTestEmail] = useState('');
    const [testSubject, setTestSubject] = useState('');
    const [testMessage, setTestMessage] = useState('');
    const [sendingTest, setSendingTest] = useState(false);

    // Activity state
    interface ActivityLog {
        id: string;
        order_id?: string;
        recipient: string;
        template_name?: string;
        subject: string;
        status: 'sent' | 'failed';
        error_message?: string;
        created: string;
    }
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [loadingActivities, setLoadingActivities] = useState(false);
    const [activityFilter, setActivityFilter] = useState<'all' | 'sent' | 'failed'>('all');

    // Content picker state
    const [imagePickerOpen, setImagePickerOpen] = useState(false);
    const [contentItems, setContentItems] = useState<ContentItem[]>([]);
    const [loadingContent, setLoadingContent] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Load SMTP config from plugins
    const loadConfig = useCallback(async () => {
        try {
            setLoadingConfig(true);
            const plugins = await pb.collection('plugins').getFullList();
            const smtpPlugin = plugins.find(p => p.key === 'smtp');

            if (smtpPlugin?.config) {
                const parsed = typeof smtpPlugin.config === 'string'
                    ? JSON.parse(smtpPlugin.config)
                    : smtpPlugin.config;

                setConfig({
                    host: parsed.host || '',
                    port: parsed.port || 587,
                    secure: parsed.secure || false,
                    user: parsed.user || '',
                    password: parsed.password || '',
                    fromEmail: parsed.fromEmail || '',
                    fromName: parsed.fromName || '',
                });
            }
        } catch (error) {
            console.error('Failed to load config:', error);
        } finally {
            setLoadingConfig(false);
        }
    }, []);

    // Save SMTP config
    const saveConfig = async () => {
        try {
            setSaving(true);

            const plugins = await pb.collection('plugins').getFullList();
            const smtpPlugin = plugins.find(p => p.key === 'smtp');

            const configData = {
                host: config.host,
                port: config.port,
                secure: config.secure,
                user: config.user,
                password: config.password,
                fromEmail: config.fromEmail,
                fromName: config.fromName,
            };

            if (smtpPlugin) {
                await pb.collection('plugins').update(smtpPlugin.id, {
                    config: JSON.stringify(configData),
                    enabled: true,
                });
            } else {
                await pb.collection('plugins').create({
                    key: 'smtp',
                    enabled: true,
                    config: JSON.stringify(configData),
                });
            }

            toast({ title: 'Success', description: 'SMTP configuration saved successfully' });
            await checkConnection();
        } catch (error) {
            console.error('Failed to save config:', error);
            toast({ title: 'Error', description: 'Failed to save configuration', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    // Check SMTP connection
    const checkConnection = async () => {
        if (!config.host || !config.port) {
            toast({ title: 'Error', description: 'Please configure SMTP settings first', variant: 'destructive' });
            return;
        }

        try {
            setCheckingConnection(true);
            setConnectionState({ status: 'checking' });

            // Call backend API to test SMTP connection
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            const response = await fetch(`${backendUrl}/api/email/test-connection`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });

            if (!response.ok) {
                throw new Error('Connection test failed');
            }

            const data = await response.json();

            if (data.success) {
                setConnectionState({ status: 'connected', message: 'SMTP connection successful' });
                toast({ title: 'Success', description: 'SMTP connection verified' });
            } else {
                throw new Error(data.message || 'Connection failed');
            }
        } catch (error) {
            console.error('Failed to check connection:', error);
            setConnectionState({
                status: 'disconnected',
                message: error instanceof Error ? error.message : 'Connection failed'
            });
            toast({ title: 'Error', description: 'Failed to verify SMTP connection', variant: 'destructive' });
        } finally {
            setCheckingConnection(false);
        }
    };

    // Load email templates
    const loadTemplates = async () => {
        setLoadingTemplates(true);
        try {
            const records = await pb.collection('email_templates').getFullList({
                sort: '-created',
            });
            setTemplates(records as unknown as EmailTemplate[]);
        } catch (error) {
            console.error('Failed to load templates:', error);
            // Create collection if it doesn't exist
            setTemplates([]);
        } finally {
            setLoadingTemplates(false);
        }
    };

    // Save template
    const handleSaveTemplate = async () => {
        try {
            if (editingTemplate) {
                await pb.collection('email_templates').update(editingTemplate.id, newTemplateForm);
                toast({ title: 'Success', description: 'Template updated successfully' });
            } else {
                await pb.collection('email_templates').create(newTemplateForm);
                toast({ title: 'Success', description: 'Template created successfully' });
            }
            setTemplateDialogOpen(false);
            setEditingTemplate(null);
            resetTemplateForm();
            await loadTemplates();
        } catch (error) {
            console.error('Failed to save template:', error);
            toast({ title: 'Error', description: 'Failed to save template', variant: 'destructive' });
        }
    };

    // Delete template
    const handleDeleteTemplate = async (id: string) => {
        if (!confirm('Are you sure you want to delete this template?')) return;

        try {
            await pb.collection('email_templates').delete(id);
            toast({ title: 'Success', description: 'Template deleted successfully' });
            await loadTemplates();
        } catch (error) {
            console.error('Failed to delete template:', error);
            toast({ title: 'Error', description: 'Failed to delete template', variant: 'destructive' });
        }
    };

    // Open edit dialog
    const openEditDialog = (template: EmailTemplate) => {
        setEditingTemplate(template);
        setNewTemplateForm({
            name: template.name,
            subject: template.subject,
            htmlContent: template.htmlContent,
            textContent: template.textContent || '',
            description: template.description || '',
            isActive: template.isActive,
            requiresAdditionalInfo: template.requiresAdditionalInfo,
            additionalInfoLabel: template.additionalInfoLabel || '',
            additionalInfoPlaceholder: template.additionalInfoPlaceholder || '',
            includeImage: template.includeImage,
            imageUrl: template.imageUrl || '',
        });
        setTemplateDialogOpen(true);
    };

    // Reset template form
    const resetTemplateForm = () => {
        setNewTemplateForm({
            name: '',
            subject: '',
            htmlContent: '',
            textContent: '',
            description: '',
            isActive: true,
            requiresAdditionalInfo: false,
            additionalInfoLabel: '',
            additionalInfoPlaceholder: '',
            includeImage: false,
            imageUrl: '',
        });
    };

    // Send test email
    const sendTestEmail = async () => {
        if (!testEmail || !testSubject || !testMessage) {
            toast({ title: 'Error', description: 'Please fill all test fields', variant: 'destructive' });
            return;
        }

        try {
            setSendingTest(true);

            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            const response = await fetch(`${backendUrl}/api/email/send-test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: testEmail,
                    subject: testSubject,
                    html: testMessage,
                    config,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to send email');
            }

            toast({ title: 'Success', description: 'Test email sent successfully' });
        } catch (error) {
            console.error('Failed to send test email:', error);
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to send email',
                variant: 'destructive'
            });
        } finally {
            setSendingTest(false);
        }
    };

    // Load activity logs
    const loadActivities = async () => {
        setLoadingActivities(true);
        try {
            const records = await pb.collection('email_activity').getList(1, 50, {
                sort: '-created',
            });
            setActivities(records.items as unknown as ActivityLog[]);
        } catch (error) {
            console.log('Activity log not available:', error);
            setActivities([]);
        } finally {
            setLoadingActivities(false);
        }
    };

    // Filter activities
    const filteredActivities = activities.filter(a => {
        if (activityFilter === 'all') return true;
        return a.status === activityFilter;
    });

    // Load content items
    const loadContentItems = async () => {
        try {
            setLoadingContent(true);
            const items = await getContentItems();
            setContentItems(items.filter(item => item.Images)); // Only images for email
        } catch (error) {
            console.error('Failed to load content:', error);
        } finally {
            setLoadingContent(false);
        }
    };

    // Handle image upload
    const handleImageUpload = async (file: File) => {
        try {
            setUploadingImage(true);
            const uploaded = await uploadImage(file);
            if (uploaded) {
                await loadContentItems();
                const url = getContentImageUrl(uploaded);
                setNewTemplateForm(prev => ({ ...prev, imageUrl: url }));
                toast({ title: 'Success', description: 'Image uploaded successfully' });
            }
        } catch (error) {
            console.error('Failed to upload:', error);
            toast({ title: 'Error', description: 'Failed to upload image', variant: 'destructive' });
        } finally {
            setUploadingImage(false);
        }
    };

    // Select image from picker
    const selectImage = (item: ContentItem) => {
        const url = getContentImageUrl(item);
        setNewTemplateForm(prev => ({ ...prev, imageUrl: url }));
        setImagePickerOpen(false);
        toast({ title: 'Selected', description: 'Image selected successfully' });
    };

    // Insert variable
    const insertVariable = (variable: string, field: 'htmlContent' | 'subject') => {
        setNewTemplateForm(prev => ({
            ...prev,
            [field]: prev[field] + variable,
        }));
    };

    // Copy to clipboard
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: 'Copied', description: 'Variable copied to clipboard' });
    };

    useEffect(() => {
        loadConfig();
        loadTemplates();
    }, [loadConfig]);

    // Auto-check connection when config is loaded
    useEffect(() => {
        if (config.host && config.port && !loadingConfig) {
            checkConnection();
        }
    }, [config.host, config.port, loadingConfig]);

    const getConnectionBadge = () => {
        switch (connectionState.status) {
            case 'connected':
                return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Connected</Badge>;
            case 'disconnected':
                return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Disconnected</Badge>;
            case 'checking':
                return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Checking</Badge>;
            default:
                return <Badge variant="outline">Unknown</Badge>;
        }
    };

    return (
        <AdminLayout>
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Mail className="h-6 w-6" />
                            Email Configuration
                        </h1>
                        <p className="text-muted-foreground">
                            Configure SMTP and manage email templates
                        </p>
                    </div>
                    {getConnectionBadge()}
                </div>

                <Tabs defaultValue="connection" className="space-y-4">
                    <TabsList className="flex flex-wrap gap-2">
                        <TabsTrigger value="connection" className="gap-2 flex-1 min-w-[120px] justify-center">
                            <Mail className="h-4 w-4" />
                            Connection
                        </TabsTrigger>
                        <TabsTrigger value="templates" className="gap-2 flex-1 min-w-[120px] justify-center">
                            <Edit className="h-4 w-4" />
                            Templates
                        </TabsTrigger>
                        <TabsTrigger value="test" className="gap-2 flex-1 min-w-[120px] justify-center">
                            <Send className="h-4 w-4" />
                            Test
                        </TabsTrigger>
                        <TabsTrigger
                            value="activity"
                            className="gap-2 flex-1 min-w-[120px] justify-center"
                            onClick={loadActivities}
                        >
                            <Activity className="h-4 w-4" />
                            Activity
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="gap-2 flex-1 min-w-[120px] justify-center">
                            <Settings className="h-4 w-4" />
                            Settings
                        </TabsTrigger>
                    </TabsList>

                    {/* Connection Tab */}
                    <TabsContent value="connection" className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Connection Status Card */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Mail className="h-5 w-5" />
                                        SMTP Connection
                                    </CardTitle>
                                    <CardDescription>
                                        Verify your email server connection
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span>Status:</span>
                                        {getConnectionBadge()}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={checkConnection}
                                            disabled={checkingConnection}
                                        >
                                            <RefreshCw className={`h-4 w-4 mr-1 ${checkingConnection ? 'animate-spin' : ''}`} />
                                            Test Connection
                                        </Button>
                                    </div>

                                    {connectionState.status === 'connected' ? (
                                        <div className="flex flex-col items-center justify-center p-8 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                                            <p className="text-lg font-medium text-green-700 dark:text-green-400">
                                                SMTP is connected!
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Your email server is ready to send messages
                                            </p>
                                        </div>
                                    ) : connectionState.status === 'disconnected' ? (
                                        <div className="flex flex-col items-center justify-center p-8 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                            <XCircle className="h-16 w-16 text-red-500 mb-4" />
                                            <p className="text-lg font-medium text-red-700 dark:text-red-400">
                                                Connection Failed
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {connectionState.message || 'Please check your SMTP settings'}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-8">
                                            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                                            <p className="text-muted-foreground mb-4">Configure SMTP settings to get started</p>
                                            <Button onClick={() => {
                                                const settingsTab = document.querySelector('[value="settings"]') as HTMLElement;
                                                settingsTab?.click();
                                            }}>
                                                <Settings className="h-4 w-4 mr-2" />
                                                Go to Settings
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Quick Setup Guide */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Zap className="h-5 w-5" />
                                        Quick Setup Guide
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">1</div>
                                            <div>
                                                <p className="font-medium">Configure SMTP Settings</p>
                                                <p className="text-sm text-muted-foreground">Enter your email server details in Settings tab</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">2</div>
                                            <div>
                                                <p className="font-medium">Test Connection</p>
                                                <p className="text-sm text-muted-foreground">Verify SMTP connection is working</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">3</div>
                                            <div>
                                                <p className="font-medium">Create Templates</p>
                                                <p className="text-sm text-muted-foreground">Design email templates for order events</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">4</div>
                                            <div>
                                                <p className="font-medium">Send Test Email</p>
                                                <p className="text-sm text-muted-foreground">Verify everything works before going live</p>
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div>
                                        <p className="font-medium mb-2">Current Configuration</p>
                                        <div className="text-sm space-y-1">
                                            <p><span className="text-muted-foreground">Host:</span> {config.host || 'Not configured'}</p>
                                            <p><span className="text-muted-foreground">Port:</span> {config.port || 'Not configured'}</p>
                                            <p><span className="text-muted-foreground">From:</span> {config.fromEmail || 'Not configured'}</p>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="space-y-2">
                                        <p className="font-medium text-sm">Popular SMTP Providers</p>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="p-2 border rounded">
                                                <p className="font-medium">Gmail</p>
                                                <p className="text-muted-foreground">smtp.gmail.com:587</p>
                                            </div>
                                            <div className="p-2 border rounded">
                                                <p className="font-medium">Outlook</p>
                                                <p className="text-muted-foreground">smtp.office365.com:587</p>
                                            </div>
                                            <div className="p-2 border rounded">
                                                <p className="font-medium">SendGrid</p>
                                                <p className="text-muted-foreground">smtp.sendgrid.net:587</p>
                                            </div>
                                            <div className="p-2 border rounded">
                                                <p className="font-medium">Mailgun</p>
                                                <p className="text-muted-foreground">smtp.mailgun.org:587</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Templates Tab */}
                    <TabsContent value="templates" className="space-y-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Email Templates</CardTitle>
                                    <CardDescription>
                                        Configure email templates for order events and notifications
                                    </CardDescription>
                                </div>
                                <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button onClick={() => { setEditingTemplate(null); resetTemplateForm(); }}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Template
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle>
                                                {editingTemplate ? 'Edit Template' : 'Create Template'}
                                            </DialogTitle>
                                            <DialogDescription>
                                                Configure the email template for notifications
                                            </DialogDescription>
                                        </DialogHeader>

                                        {/* Side-by-side layout: Form on left, Preview on right */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
                                            {/* Left side: Form */}
                                            <div className="space-y-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="templateName">Template Name</Label>
                                                    <Select
                                                        value={newTemplateForm.name}
                                                        onValueChange={(v) => setNewTemplateForm(prev => ({ ...prev, name: v }))}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select event type" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {ORDER_EVENTS.map(event => (
                                                                <SelectItem key={event.value} value={event.value}>
                                                                    {event.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="grid gap-2">
                                                    <Label htmlFor="description">Description</Label>
                                                    <Input
                                                        id="description"
                                                        value={newTemplateForm.description}
                                                        onChange={(e) => setNewTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                                                        placeholder="When this template is used..."
                                                    />
                                                </div>

                                                <div className="grid gap-2">
                                                    <div className="flex items-center justify-between">
                                                        <Label htmlFor="subject">Email Subject</Label>
                                                        <div className="flex gap-1">
                                                            {TEMPLATE_VARIABLE_GROUPS.slice(0, 2).map((group) => (
                                                                <Select
                                                                    key={group.label}
                                                                    onValueChange={(variableKey) => insertVariable(variableKey, 'subject')}
                                                                >
                                                                    <SelectTrigger className="h-7 w-[100px] text-xs">
                                                                        <SelectValue placeholder={group.label} />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {group.items.map((v) => (
                                                                            <SelectItem key={v.key} value={v.key}>
                                                                                {v.key}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <Input
                                                        id="subject"
                                                        value={newTemplateForm.subject}
                                                        onChange={(e) => setNewTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
                                                        placeholder="e.g., Your Order {{orderId}} is Confirmed!"
                                                    />
                                                </div>

                                                <div className="grid gap-2">
                                                    <div className="flex items-center justify-between">
                                                        <Label htmlFor="htmlContent">Email Content (HTML)</Label>
                                                        <div className="flex gap-1">
                                                            {TEMPLATE_VARIABLE_GROUPS.map((group) => (
                                                                <Select
                                                                    key={group.label}
                                                                    onValueChange={(variableKey) => insertVariable(variableKey, 'htmlContent')}
                                                                >
                                                                    <SelectTrigger className="h-7 w-[80px] text-xs">
                                                                        <SelectValue placeholder={group.label.split(' ')[0]} />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {group.items.map((v) => (
                                                                            <SelectItem key={v.key} value={v.key}>
                                                                                {v.key}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <Textarea
                                                        id="htmlContent"
                                                        value={newTemplateForm.htmlContent}
                                                        onChange={(e) => setNewTemplateForm(prev => ({ ...prev, htmlContent: e.target.value }))}
                                                        placeholder="<h1>Hi {{customerName}},</h1><p>Your order has been confirmed...</p>"
                                                        rows={10}
                                                        className="font-mono text-sm"
                                                    />
                                                    <p className="text-xs text-muted-foreground">
                                                        Use variables like {'{{customerName}}'} to personalize emails. HTML is supported.
                                                    </p>
                                                </div>

                                                <Separator />

                                                {/* Image attachment option */}
                                                <div className="flex items-center justify-between">
                                                    <div className="space-y-0.5">
                                                        <Label>Include Image</Label>
                                                        <p className="text-sm text-muted-foreground">Add an image to your email</p>
                                                    </div>
                                                    <Switch
                                                        checked={newTemplateForm.includeImage}
                                                        onCheckedChange={(checked) => setNewTemplateForm(prev => ({ ...prev, includeImage: checked }))}
                                                    />
                                                </div>

                                                {newTemplateForm.includeImage && (
                                                    <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                                                        <div className="flex items-center justify-between">
                                                            <Label className="text-sm font-medium">Select Image</Label>
                                                            <Dialog open={imagePickerOpen} onOpenChange={setImagePickerOpen}>
                                                                <DialogTrigger asChild>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={loadContentItems}
                                                                    >
                                                                        <ImageIcon className="h-4 w-4 mr-2" />
                                                                        Browse Images
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent className="max-w-3xl max-h-[80vh]">
                                                                    <DialogHeader>
                                                                        <DialogTitle>Select Image from Library</DialogTitle>
                                                                        <DialogDescription>
                                                                            Choose an image from your content collection
                                                                        </DialogDescription>
                                                                    </DialogHeader>

                                                                    <ScrollArea className="h-[500px]">
                                                                        {loadingContent || uploadingImage ? (
                                                                            <div className="flex items-center justify-center py-12">
                                                                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                                                            </div>
                                                                        ) : contentItems.length === 0 ? (
                                                                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                                                                <ImageIcon className="h-12 w-12 mb-4" />
                                                                                <p>No images found</p>
                                                                                <label className="mt-4 cursor-pointer">
                                                                                    <input
                                                                                        type="file"
                                                                                        accept="image/*"
                                                                                        className="hidden"
                                                                                        onChange={(e) => {
                                                                                            const file = e.target.files?.[0];
                                                                                            if (file) handleImageUpload(file);
                                                                                        }}
                                                                                    />
                                                                                    <Button type="button" variant="outline" size="sm" asChild>
                                                                                        <span>
                                                                                            <ImageIcon className="h-4 w-4 mr-2" />
                                                                                            Upload Image
                                                                                        </span>
                                                                                    </Button>
                                                                                </label>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="grid grid-cols-3 md:grid-cols-4 gap-3 p-1">
                                                                                {contentItems.map((item) => (
                                                                                    <button
                                                                                        key={item.id}
                                                                                        type="button"
                                                                                        onClick={() => selectImage(item)}
                                                                                        className="relative group w-full aspect-square rounded-lg overflow-hidden border hover:border-primary transition-colors"
                                                                                    >
                                                                                        <img
                                                                                            src={getContentImageUrl(item)}
                                                                                            alt=""
                                                                                            className="w-full h-full object-cover"
                                                                                        />
                                                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                                            <Check className="h-6 w-6 text-white" />
                                                                                        </div>
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </ScrollArea>
                                                                </DialogContent>
                                                            </Dialog>
                                                        </div>

                                                        {newTemplateForm.imageUrl && (
                                                            <div className="relative">
                                                                <img
                                                                    src={newTemplateForm.imageUrl}
                                                                    alt="Selected"
                                                                    className="w-full h-40 object-cover rounded"
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    className="absolute top-2 right-2"
                                                                    onClick={() => setNewTemplateForm(prev => ({ ...prev, imageUrl: '' }))}
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <Separator />

                                                <div className="flex items-center justify-between">
                                                    <div className="space-y-0.5">
                                                        <Label>Active</Label>
                                                        <p className="text-sm text-muted-foreground">Enable this template</p>
                                                    </div>
                                                    <Switch
                                                        checked={newTemplateForm.isActive}
                                                        onCheckedChange={(checked) => setNewTemplateForm(prev => ({ ...prev, isActive: checked }))}
                                                    />
                                                </div>
                                            </div>

                                            {/* Right side: Preview */}
                                            <div className="space-y-4">
                                                <div>
                                                    <Label className="mb-2 block">Email Preview</Label>
                                                    <div className="border rounded-lg p-4 bg-white dark:bg-gray-900 min-h-[500px]">
                                                        <div className="border-b pb-3 mb-4">
                                                            <p className="text-sm text-muted-foreground">Subject:</p>
                                                            <p className="font-medium">{newTemplateForm.subject || 'Subject line will appear here'}</p>
                                                        </div>

                                                        {newTemplateForm.includeImage && newTemplateForm.imageUrl && (
                                                            <img
                                                                src={newTemplateForm.imageUrl}
                                                                alt="Email header"
                                                                className="w-full mb-4 rounded"
                                                            />
                                                        )}

                                                        <div
                                                            className="prose prose-sm max-w-none dark:prose-invert"
                                                            dangerouslySetInnerHTML={{ __html: newTemplateForm.htmlContent || '<p class="text-muted-foreground">HTML content will be rendered here...</p>' }}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="p-4 bg-muted rounded-lg">
                                                    <p className="text-sm font-medium mb-2">Available Variables:</p>
                                                    <ScrollArea className="h-[200px]">
                                                        <div className="space-y-2">
                                                            {TEMPLATE_VARIABLES.map((v) => (
                                                                <div key={v.key} className="flex items-center justify-between text-xs">
                                                                    <div>
                                                                        <code className="bg-background px-2 py-1 rounded">{v.key}</code>
                                                                        <p className="text-muted-foreground mt-1">{v.description}</p>
                                                                    </div>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => copyToClipboard(v.key)}
                                                                    >
                                                                        <Copy className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </ScrollArea>
                                                </div>
                                            </div>
                                        </div>

                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button onClick={handleSaveTemplate}>
                                                <Save className="h-4 w-4 mr-2" />
                                                Save Template
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent>
                                {loadingTemplates ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    </div>
                                ) : templates.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <FileText className="h-12 w-12 mb-4" />
                                        <p>No templates yet</p>
                                        <p className="text-sm">Create your first email template to get started</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {templates.map((template) => (
                                            <div key={template.id} className="border rounded-lg p-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-medium">
                                                                {ORDER_EVENTS.find(e => e.value === template.name)?.label || template.name}
                                                            </h3>
                                                            {template.isActive ? (
                                                                <Badge className="bg-green-500">Active</Badge>
                                                            ) : (
                                                                <Badge variant="secondary">Inactive</Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                                                        <p className="text-sm mt-2">
                                                            <span className="text-muted-foreground">Subject:</span> {template.subject}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openEditDialog(template)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDeleteTemplate(template.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Test Tab */}
                    <TabsContent value="test" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Send Test Email</CardTitle>
                                <CardDescription>
                                    Test your SMTP configuration by sending a test email
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="testEmail">Recipient Email</Label>
                                        <Input
                                            id="testEmail"
                                            type="email"
                                            placeholder="test@example.com"
                                            value={testEmail}
                                            onChange={(e) => setTestEmail(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="testSubject">Subject</Label>
                                        <Input
                                            id="testSubject"
                                            placeholder="Test Email from Zenthra.shop"
                                            value={testSubject}
                                            onChange={(e) => setTestSubject(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="testMessage">Message (HTML supported)</Label>
                                        <Textarea
                                            id="testMessage"
                                            placeholder="<h1>Hello!</h1><p>This is a test email...</p>"
                                            rows={6}
                                            value={testMessage}
                                            onChange={(e) => setTestMessage(e.target.value)}
                                            className="font-mono text-sm"
                                        />
                                    </div>

                                    <Button
                                        onClick={sendTestEmail}
                                        disabled={sendingTest || !testEmail || !testSubject || !testMessage}
                                        className="w-full"
                                    >
                                        {sendingTest ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="h-4 w-4 mr-2" />
                                                Send Test Email
                                            </>
                                        )}
                                    </Button>
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Quick Test Templates:</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setTestSubject('Order Confirmation Test');
                                                setTestMessage('<h1>Order Confirmed!</h1><p>Thank you for your order.</p>');
                                            }}
                                        >
                                            Order Confirmation
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setTestSubject('Welcome to Our Store!');
                                                setTestMessage('<h1>Welcome!</h1><p>We\'re excited to have you as a customer.</p>');
                                            }}
                                        >
                                            Welcome Email
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Activity Tab */}
                    <TabsContent value="activity" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Email Activity Log</CardTitle>
                                        <CardDescription>
                                            View sent emails and delivery status
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Select value={activityFilter} onValueChange={(v) => setActivityFilter(v as any)}>
                                            <SelectTrigger className="w-[140px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Status</SelectItem>
                                                <SelectItem value="sent">Sent Only</SelectItem>
                                                <SelectItem value="failed">Failed Only</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button variant="outline" size="icon" onClick={loadActivities}>
                                            <RefreshCw className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {loadingActivities ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    </div>
                                ) : filteredActivities.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <Activity className="h-12 w-12 mb-4" />
                                        <p>No activity logs yet</p>
                                        <p className="text-sm">Email activity will appear here once you start sending</p>
                                    </div>
                                ) : (
                                    <ScrollArea className="h-[500px]">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Time</TableHead>
                                                    <TableHead>Recipient</TableHead>
                                                    <TableHead>Subject</TableHead>
                                                    <TableHead>Template</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Error</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredActivities.map((activity) => (
                                                    <TableRow key={activity.id}>
                                                        <TableCell className="text-sm">
                                                            {new Date(activity.created).toLocaleString()}
                                                        </TableCell>
                                                        <TableCell className="text-sm">{activity.recipient}</TableCell>
                                                        <TableCell className="text-sm max-w-[200px] truncate">
                                                            {activity.subject}
                                                        </TableCell>
                                                        <TableCell className="text-sm">
                                                            {activity.template_name ? (
                                                                <Badge variant="outline">
                                                                    {ORDER_EVENTS.find(e => e.value === activity.template_name)?.label || activity.template_name}
                                                                </Badge>
                                                            ) : (
                                                                '-'
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {activity.status === 'sent' ? (
                                                                <Badge className="bg-green-500">
                                                                    <CheckCircle className="h-3 w-3 mr-1" /> Sent
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="destructive">
                                                                    <XCircle className="h-3 w-3 mr-1" /> Failed
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-red-500 max-w-[150px] truncate">
                                                            {activity.error_message || '-'}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Settings Tab */}
                    <TabsContent value="settings" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>SMTP Configuration</CardTitle>
                                <CardDescription>
                                    Configure your email server settings
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="host">SMTP Host</Label>
                                        <Input
                                            id="host"
                                            placeholder="smtp.gmail.com"
                                            value={config.host}
                                            onChange={(e) => setConfig(prev => ({ ...prev, host: e.target.value }))}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="port">Port</Label>
                                        <Input
                                            id="port"
                                            type="number"
                                            placeholder="587"
                                            value={config.port}
                                            onChange={(e) => setConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 587 }))}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="user">Username / Email</Label>
                                        <Input
                                            id="user"
                                            placeholder="your-email@gmail.com"
                                            value={config.user}
                                            onChange={(e) => setConfig(prev => ({ ...prev, user: e.target.value }))}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="password">Password / App Password</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="••••••••••••"
                                            value={config.password}
                                            onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="fromEmail">From Email</Label>
                                        <Input
                                            id="fromEmail"
                                            type="email"
                                            placeholder="noreply@zenthra.shop"
                                            value={config.fromEmail}
                                            onChange={(e) => setConfig(prev => ({ ...prev, fromEmail: e.target.value }))}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="fromName">From Name</Label>
                                        <Input
                                            id="fromName"
                                            placeholder="Zenthra Shop"
                                            value={config.fromName}
                                            onChange={(e) => setConfig(prev => ({ ...prev, fromName: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="space-y-0.5">
                                        <Label>Use SSL/TLS</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Enable for port 465, disable for port 587
                                        </p>
                                    </div>
                                    <Switch
                                        checked={config.secure}
                                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, secure: checked }))}
                                    />
                                </div>

                                <Separator />

                                <div className="bg-muted p-4 rounded-lg space-y-2">
                                    <div className="flex items-start gap-2">
                                        <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div className="space-y-1 text-sm">
                                            <p className="font-medium">Gmail Users:</p>
                                            <p className="text-muted-foreground">
                                                You need to use an App Password instead of your regular password.
                                                Generate one at: Google Account → Security → 2-Step Verification → App passwords
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        onClick={saveConfig}
                                        disabled={saving}
                                        className="flex-1"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4 mr-2" />
                                                Save Configuration
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={checkConnection}
                                        disabled={checkingConnection}
                                    >
                                        {checkingConnection ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Testing...
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="h-4 w-4 mr-2" />
                                                Test Connection
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AdminLayout>
    );
}
