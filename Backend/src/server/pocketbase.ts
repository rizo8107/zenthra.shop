import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

// Initialize PocketBase with the URL from environment variables
const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'https://backend-karigaibackend.7za6uc.easypanel.host';
const POCKETBASE_ADMIN_EMAIL = process.env.VITE_POCKETBASE_ADMIN_EMAIL || '';
const POCKETBASE_ADMIN_PASSWORD = process.env.VITE_POCKETBASE_ADMIN_PASSWORD || '';

console.log('PocketBase URL:', POCKETBASE_URL);
console.log('PocketBase Admin Email:', POCKETBASE_ADMIN_EMAIL ? 'SET' : 'NOT SET');
console.log('PocketBase Admin Password:', POCKETBASE_ADMIN_PASSWORD ? 'SET' : 'NOT SET');

// Perform admin authentication and return token + admin model
export const adminAuth = async (): Promise<{ token: string; model: any }> => {
  if (!POCKETBASE_ADMIN_EMAIL || !POCKETBASE_ADMIN_PASSWORD) {
    const errorMsg = 'Missing PocketBase admin credentials. Please set VITE_POCKETBASE_ADMIN_EMAIL and VITE_POCKETBASE_ADMIN_PASSWORD in your .env file.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  try {
    console.log('🔐 Attempting PocketBase admin authentication...');
    console.log('📧 Email:', POCKETBASE_ADMIN_EMAIL);
    console.log('🔗 URL:', `${POCKETBASE_URL}/api/admins/auth-with-password`);
    
    const res = await axios.post(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
      identity: POCKETBASE_ADMIN_EMAIL,
      password: POCKETBASE_ADMIN_PASSWORD,
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000, // 10 second timeout
    });
    
    console.log('✅ PocketBase auth response status:', res.status);
    const { token, admin } = res.data || {};
    if (!token) {
      throw new Error('Failed to obtain PocketBase admin token');
    }
    console.log('✅ PocketBase admin token obtained successfully');
    return { token, model: admin };
  } catch (error: any) {
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
      throw new Error(`Cannot connect to PocketBase at ${POCKETBASE_URL}. Please ensure PocketBase is running.`);
    }
    if (error?.response?.status === 400 || error?.response?.status === 401) {
      throw new Error('Invalid PocketBase admin credentials. Please check your VITE_POCKETBASE_ADMIN_EMAIL and VITE_POCKETBASE_ADMIN_PASSWORD.');
    }
    throw error;
  }
};

export const getAuthToken = async () => {
  const { token } = await adminAuth();
  return token;
};

// Create a WhatsApp activity record
export const createWhatsAppActivity = async (data: {
  order_id: string;
  recipient: string;
  template_name?: string;
  message_content: string;
  status: string;
  error_message?: string;
  media_url?: string;
}) => {
  try {
    console.log('Creating WhatsApp activity using direct curl approach');
    console.log('Data received:', JSON.stringify(data));
    
    // Format data exactly like the working curl command
    const formattedData = {
      order_id: data.order_id, // Pass order ID directly as in curl example
      recipient: data.recipient,
      template_name: data.template_name || '',
      message_content: data.message_content,
      status: data.status,
      timestamp: new Date().toISOString(),
      error_message: data.error_message || ''
    };
    
    // Add media_url if provided
    if (data.media_url && data.media_url.trim() !== '') {
      formattedData['media_url'] = data.media_url;
    }
    
    console.log('Sending formatted data to PocketBase:', JSON.stringify(formattedData));
    const { token } = await adminAuth();
    
    // Make the API call exactly like the curl command
    const response = await axios.post(
      `${POCKETBASE_URL}/api/collections/whatsapp_activities/records`,
      formattedData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('WhatsApp activity created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to create WhatsApp activity:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('API Error Response:', error.response.data);
    }
    throw error;
  }
};
