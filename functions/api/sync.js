export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  const key = url.searchParams.get("key");
  const targetUrl = key 
    ? `https://jsonbin-zeta.vercel.app/api/bins/${key}`
    : `https://jsonbin-zeta.vercel.app/api/bins`;
    
  const method = request.method;
  
  // For OPTIONS preflight requests
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  
  const init = {
    method: method,
    headers: headers
  };
  
  if (method === "POST" || method === "PUT") {
    const bodyText = await request.text();
    init.body = bodyText;
  }
  
  try {
    const response = await fetch(targetUrl, init);
    const data = await response.text();
    
    return new Response(data, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
