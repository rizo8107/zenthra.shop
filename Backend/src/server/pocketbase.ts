import dotenv from 'dotenv';
import axios from 'axios';

// Load env from the project root (../.env) so the API and CMS share the same credentials
dotenv.config({ path: '../.env' });

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
    
    // Try admin authentication first, then fall back to regular user auth
    let res;
    try {
      console.log('🔐 Trying admin authentication...');
      res = await axios.post(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
        identity: POCKETBASE_ADMIN_EMAIL,
        password: POCKETBASE_ADMIN_PASSWORD,
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });
    } catch (adminError: any) {
      if (adminError?.response?.status === 404) {
        console.log('⚠️ Admin endpoint not found, trying regular user authentication...');
        res = await axios.post(`${POCKETBASE_URL}/api/collections/users/auth-with-password`, {
          identity: POCKETBASE_ADMIN_EMAIL,
          password: POCKETBASE_ADMIN_PASSWORD,
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        });
      } else {
        throw adminError;
      }
    }
    
    console.log('✅ PocketBase auth response status:', res.status);
    const { token, admin, record } = res.data || {};
    if (!token) {
      throw new Error('Failed to obtain PocketBase token');
    }
    console.log('✅ PocketBase token obtained successfully');
    return { token, model: admin || record };
  } catch (error: any) {
    console.error('❌ PocketBase authentication failed:', error?.message);
    console.error('Error details:', {
      status: error?.response?.status,
      data: error?.response?.data,
      code: error?.code,
      url: error?.config?.url
    });
    
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
      throw new Error(`Cannot connect to PocketBase at ${POCKETBASE_URL}. Please ensure PocketBase is running.`);
    }
    if (error?.response?.status === 400 || error?.response?.status === 401) {
      throw new Error('Invalid PocketBase admin credentials. Please check your VITE_POCKETBASE_ADMIN_EMAIL and VITE_POCKETBASE_ADMIN_PASSWORD.');
    }
    if (error?.response?.status === 404) {
      throw new Error(`PocketBase admin endpoint not found at ${POCKETBASE_URL}/api/admins/auth-with-password. Please check your VITE_POCKETBASE_URL.`);
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
