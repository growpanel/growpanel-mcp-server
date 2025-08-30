// utils/api.ts
export async function callApi(endpoint: string, params: any = {}) {
    const baseUrl = process.env.GROWPANEL_API_URL || 'https://api.growpanel.io';
    const apiKey = process.env.GROWPANEL_API_TOKEN;
    
    console.log(`🌐 API Call: ${endpoint}`);
    console.log(`🔑 API Key exists: ${!!apiKey}`);
    console.log(`📦 Params:`, JSON.stringify(params, null, 2));
    
    if (!apiKey) {
      throw new Error('GROWPANEL_API_KEY environment variable is required');
    }
  
    const url = new URL(`/reports/${endpoint}`, baseUrl);
    
    // Add query parameters
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });
  
    console.log(`📍 Full URL: ${url.toString()}`);
  
    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
  
      console.log(`📡 Response status: ${response.status} ${response.statusText}`);
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error Response: ${errorText}`);
        throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
  
      const result = await response.json();
      console.log(`✅ API Success:`, JSON.stringify(result, null, 2));
      return result;
      
    } catch (error) {
      console.error(`💥 Fetch error:`, error);
      throw error;
    }
  }