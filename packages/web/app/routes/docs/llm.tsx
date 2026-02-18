import type { LoaderFunctionArgs } from "react-router";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { docSlug } = params;
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // Ensure VITE_BASE_URL is available
  const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:3000';
  const apiUrl = `${baseUrl}/api/docs/${docSlug}/llm.txt?${searchParams.toString()}`;

  try {
    const headers = new Headers();
    const cookie = request.headers.get("Cookie");
    if (cookie) {
      headers.set("Cookie", cookie);
    }

    const response = await fetch(apiUrl, {
      headers,
    });
    
    if (!response.ok) {
      // Pass through the error status from the backend
      return new Response(response.statusText, { status: response.status });
    }
    
    const content = await response.text();

    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        // Optional: prevent caching as requested
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error fetching llm.txt:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
